#!/usr/bin/env python3
"""Conteo de CSS del sitio (Fase 3): <style> local por página, style="" inline, y duplicados.
Uso: python3 conteo-css.py [ruta_del_repo]      (por defecto, la carpeta actual)
Solo lee; no modifica nada. Creado el 20-sep-2026 para que las cifras del plan sean reproducibles."""
import re,glob,os,json,collections,sys
os.chdir(sys.argv[1] if len(sys.argv)>1 else '.')
def quitar_comentarios(c): return re.sub(r'/\*.*?\*/','',c,flags=re.S)
def reglas(css):
    """Devuelve lista de (contexto, selector, cuerpo_normalizado). contexto = '' o '@media ...'"""
    css=quitar_comentarios(css); out=[]
    def parse(txt,ctx):
        i=0
        while i<len(txt):
            j=txt.find('{',i)
            if j<0: break
            sel=txt[i:j].strip()
            # buscar cierre balanceado
            d=1;k=j+1
            while k<len(txt) and d:
                if txt[k]=='{': d+=1
                elif txt[k]=='}': d-=1
                k+=1
            cuerpo=txt[j+1:k-1]
            if sel.startswith('@media') or sel.startswith('@supports'):
                parse(cuerpo,sel)
            elif sel.startswith('@'):
                out.append((ctx,sel,re.sub(r'\s+',' ',cuerpo).strip()))
            else:
                norm=re.sub(r'\s+',' ',cuerpo).strip().rstrip(';').strip()
                # normalizar orden/espacios de declaraciones
                decl=sorted(x.strip().replace(' :',':').replace(': ',':') for x in norm.split(';') if x.strip())
                selN=re.sub(r'\s+',' ',sel)
                out.append((ctx,selN,';'.join(decl)))
            i=k
    parse(css,''); return out
def bloques_style(h):
    return re.findall(r'<style[^>]*>(.*?)</style>',h,re.S)

htmls=sorted(glob.glob('*.html'))
css_global=open('assets/styles.css',encoding='utf-8').read()
R_glob=reglas(css_global)
print('styles.css:',len(css_global.split('\n')),'líneas,',len(css_global.encode())//1024,'KB,',len(R_glob),'reglas')
print()
print(f'{"archivo":14}{"líneas <style>":>15}{"KB <style>":>11}{"reglas":>8}{"style=\"\" HTML":>16}{"style= en JS/tpl":>18}')
datos={}
tot_inl=0; tot_lines=0
for f in htmls:
    h=open(f,encoding='utf-8').read()
    bs=bloques_style(h); css='\n'.join(bs)
    rs=reglas(css)
    # HTML sin <script>/<style>/comentarios para el conteo de inline estático
    hh=re.sub(r'<!--.*?-->','',h,flags=re.S); scripts=re.findall(r'<script[^>]*>(.*?)</script>',hh,re.S)
    hh2=re.sub(r'<script[^>]*>.*?</script>','',hh,flags=re.S); hh2=re.sub(r'<style[^>]*>.*?</style>','',hh2,flags=re.S)
    est=len(re.findall(r'\sstyle="',hh2))
    js=sum(len(re.findall(r'style="',sc)) for sc in scripts)
    datos[f]=dict(reglas=rs,css=css,est=est,js=js)
    tot_inl+=est; tot_lines+=len(css.split('\n')) if css.strip() else 0
    print(f'{f:14}{len(css.split(chr(10))) if css.strip() else 0:>15}{len(css.encode())/1024:>11.1f}{len(rs):>8}{est:>16}{js:>18}')
# JS externos
jsx=0
for jf in glob.glob('assets/**/*.js',recursive=True): jsx+=len(re.findall(r'style="',open(jf,encoding='utf-8').read()))
print(f'\nstyle="" dentro de assets/**/*.js: {jsx}')
print(f'Total <style> local: {tot_lines} líneas | inline estático total: {tot_inl}')
# ----- duplicados literales
clave=lambda r:(r[0],r[1],r[2])
por=collections.defaultdict(set)
for f,d in datos.items():
    for r in d['reglas']:
        if r[1].startswith('@'): continue
        por[clave(r)].add(f)
glob_set={clave(r) for r in R_glob}
print('\n== A) reglas IDÉNTICAS (contexto+selector+declaraciones) en ≥2 páginas y NO en styles.css')
dup=[(k,fs) for k,fs in por.items() if len(fs)>=2 and k not in glob_set]
print(len(dup),'candidatas')
for k,fs in sorted(dup,key=lambda x:-len(x[1]))[:25]:
    print(f'  [{len(fs)}] {sorted(fs)} | {k[0]+" " if k[0] else ""}{k[1][:60]} {{ {k[2][:70]} }}')
print('\n== B) reglas locales IDÉNTICAS a una que ya está en styles.css (redundantes)')
red=[(f,r) for f,d in datos.items() for r in d['reglas'] if not r[1].startswith('@') and clave(r) in glob_set]
print(len(red),'redundantes')
for f,r in red[:15]: print(f'  {f}: {r[0]+" " if r[0] else ""}{r[1][:60]} {{ {r[2][:60]} }}')
# ----- selectores locales que también existen en styles.css con cuerpo distinto (overrides)
sel_glob=collections.defaultdict(list)
for r in R_glob:
    if not r[1].startswith('@'): sel_glob[(r[0],r[1])].append(r[2])
print('\n== C) mismo selector local y global con cuerpo distinto (override; no se pueden mover a ciegas)')
c=0
for f,d in datos.items():
    for r in d['reglas']:
        if r[1].startswith('@'): continue
        k=(r[0],r[1])
        if k in sel_glob and r[2] not in sel_glob[k]:
            c+=1
            if c<=12: print(f'  {f}: {r[1][:55]}')
print('total overrides:',c)
# ----- inline repetidos
print('\n== D) valores de style="" estáticos repetidos ≥4 veces (candidatos a clase utilitaria)')
cnt=collections.Counter(); donde=collections.defaultdict(collections.Counter)
for f in htmls:
    h=open(f,encoding='utf-8').read()
    h=re.sub(r'<!--.*?-->','',h,flags=re.S); h=re.sub(r'<script[^>]*>.*?</script>','',h,flags=re.S); h=re.sub(r'<style[^>]*>.*?</style>','',h,flags=re.S)
    for m in re.findall(r'\sstyle="([^"]*)"',h):
        v=re.sub(r'\s+',' ',m.strip()).rstrip(';').strip()
        cnt[v]+=1; donde[v][f]+=1
for v,n in cnt.most_common(18):
    if n>=4: print(f'  x{n:<3} {v[:78]}   ({", ".join(f"{k.replace(".html","")}:{c}" for k,c in donde[v].most_common(4))})')
