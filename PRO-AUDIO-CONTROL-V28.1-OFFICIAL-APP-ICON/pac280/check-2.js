
const vizStyleKey='pac_viz_style_v1';
let vizStyle='bars';try{vizStyle=localStorage.getItem(vizStyleKey)||'bars'}catch(e){} window.pacVizStyle=vizStyle
function setVizStyle(v){
 const ok=['bars','mirror','wave','pulse','matrix']; if(!ok.includes(v))v='bars';
 vizStyle=v; window.pacVizStyle=v; document.querySelectorAll('.vizOption').forEach(b=>b.classList.toggle('active',b.dataset.vizStyle===v));
 try{localStorage.setItem(vizStyleKey,v)}catch(e){}
}
document.querySelectorAll('.vizOption').forEach(b=>b.onclick=()=>setVizStyle(b.dataset.vizStyle));setVizStyle(vizStyle);
const fontKey='pac_font_v1';let savedFont='inter';try{savedFont=localStorage.getItem(fontKey)||'inter'}catch(e){}
function setFont(f){
 const ok=['inter','orbitron','rajdhani','mono','serif'];if(!ok.includes(f))f='inter';
 document.body.classList.remove(...ok.map(x=>'font-'+x));document.body.classList.add('font-'+f);
 document.querySelectorAll('.fontOption').forEach(b=>b.classList.toggle('active',b.dataset.font===f));
 try{localStorage.setItem(fontKey,f)}catch(e){}
}
document.querySelectorAll('.fontOption').forEach(b=>b.onclick=()=>setFont(b.dataset.font));setFont(savedFont);
