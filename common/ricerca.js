/* ================= RICERCA NELLA CAMPAGNA (uguale in tutti i tool) =================
   Cerca tra gli elementi salvati della campagna attiva e li apre nel loro tool. Il pulsante viene aggiunto alla barra dei tool;
   da tastiera: «/» oppure Ctrl+K. L'indirizzo di qualunque tool seguito da #cerca apre subito la ricerca. */
const GS_SKIP=new Set(["id","src","ref","img","icon","terrain","fog","palette","color","vis","own","created","updated","seed","type","trk","charId","mn"]);
const gsNorm=s=>String(s??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
/* tutto il testo di un elemento (senza markup), per cercarci dentro */
function gsText(o,out,depth){if(o==null||depth>6||out.n>6000)return;
  if(typeof o==="string"){const t=o.indexOf("<")>=0?o.replace(/<[^>]*>/g," "):o;if(t.trim()){out.a.push(t.trim());out.n+=t.length}return}
  if(typeof o==="number"||typeof o==="boolean")return;
  if(Array.isArray(o)){o.forEach(x=>gsText(x,out,depth+1));return}
  if(typeof o==="object")Object.keys(o).forEach(k=>{if(!GS_SKIP.has(k))gsText(o[k],out,depth+1)})}
function gsIndex(){const arr=n=>{const a=dbGet(n,[]);return Array.isArray(a)?a:[]},out=[];
  const add=(grp,dir,hash,title,sub,obj)=>{title=String(title||"").trim();if(!title)return;const t={a:[],n:0};gsText(obj,t,0);
    out.push({grp,url:SUITE_ROOT+dir+"/index.html#"+hash,title,sub:sub||"",text:t.a.join(" · ")})};
  arr("chars").forEach(c=>{if(!c||!c.id)return;const s=c.st||{};add("Schede PG","characters","open="+c.id,s.name||c.name,[s.race,s.cls].filter(Boolean).join(" · "),[s.race,s.cls,c.data&&c.data.notes,c.data&&c.data.backstory])});
  arr("npcs").forEach(n=>{if(n&&n.id)add("NPC","npcs","open="+n.id,n.name,[n.race,n.occ].filter(Boolean).join(" · "),n)});
  arr("encSaved").forEach(e=>{if(e&&e.id)add("Incontri","encounters","open="+e.id,e.name,"incontro salvato",(e.enc||[]).map(r=>r.n))});
  arr("encHb").forEach(m=>{if(m&&m.id)add("Incontri","encounters","sb="+encodeURIComponent(m.id),m.it||m.n,"mostro homebrew · GS "+(m.cr??"?"),m)});
  const D=dbGet("diary",{})||{},q=t=>"q="+encodeURIComponent(String(t||"").slice(0,60));
  (Array.isArray(D.sessions)?D.sessions:[]).forEach(s=>{if(s)add("Diario","journal",q(s.title),s.title||"Sessione",["sessione",s.date].filter(Boolean).join(" · "),s)});
  (Array.isArray(D.npcs)?D.npcs:[]).forEach(n=>{if(n)add("Diario","journal",q(n.name),n.name,"NPC del diario",n)});
  (Array.isArray(D.places)?D.places:[]).forEach(p=>{if(p)add("Diario","journal",q(p.name),p.name,"luogo",p)});
  (Array.isArray(D.hooks)?D.hooks:[]).forEach(h=>{if(h&&h.text)add("Diario","journal",q(h.text),String(h.text).slice(0,70),"aggancio",h)});
  const W=dbGet("world",{})||{};
  (Array.isArray(W.saved)?W.saved:[]).forEach(x=>{if(x&&x.id)add("Mondo","world","open="+x.id,x.title||x.name,x.date||"",x)});
  (Array.isArray(W.factions)?W.factions:[]).forEach(f=>{if(f&&f.id)add("Mondo","world","open="+f.id,f.name,"fazione",f)});
  arr("puzzles").forEach(p=>{if(p&&p.id)add("Enigmi","puzzles","open="+p.id,p.name,p.tipo,p)});
  arr("maps").forEach(m=>{if(m&&m.id)add("Mappe","maps","open="+m.id,m.name,m.grid?m.grid.w+"×"+m.grid.h+" caselle":"",[m.notes,(m.objects||[]).map(o=>[o.label,o.alias,o.note]),(m.areas||[]).map(a=>a.label)])});
  out.forEach(r=>{r.nt=gsNorm(r.title);r.nx=gsNorm(r.sub+" · "+r.text)});return out}
/* tutte le parole cercate devono comparire; prima gli elementi che le hanno nel titolo */
function gsFind(idx,query){const words=gsNorm(query).split(/\s+/).filter(Boolean);if(!words.length)return[];
  return idx.filter(r=>words.every(w=>r.nt.includes(w)||r.nx.includes(w))).map(r=>({r,score:words.every(w=>r.nt.includes(w))?(r.nt.startsWith(words[0])?0:1):2,w:words.find(w=>!r.nt.includes(w))}))
    .sort((a,b)=>a.score-b.score||a.r.title.localeCompare(b.r.title))}
/* frammento di testo attorno alla prima parola trovata fuori dal titolo */
function gsSnippet(r,w){if(!w||gsNorm(r.sub).includes(w))return"";const src=r.text,i=gsNorm(src).indexOf(w);if(i<0)return"";
  const a=Math.max(0,i-45),b=Math.min(src.length,i+w.length+70);return(a>0?"…":"")+uiEsc(src.slice(a,i))+"<mark>"+uiEsc(src.slice(i,i+w.length))+"</mark>"+uiEsc(src.slice(i+w.length,b))+(b<src.length?"…":"")}
let GS_IDX=null,GS_SEL=0;
function gsOpen(){if(document.getElementById("gsOv"))return;hmCloseAll();GS_IDX=gsIndex();const prev=document.activeElement,ov=document.createElement("div");ov.id="gsOv";ov.className="gs-ov";
  ov.innerHTML=`<div class="gs-box" role="dialog" aria-modal="true" aria-label="Cerca nella campagna"><input type="search" id="gsQ" autocomplete="off" placeholder="Cerca nella campagna «${uiEsc(campCur().name)}»…" aria-controls="gsList">
    <div class="gs-list" id="gsList" role="listbox"></div><div class="gs-foot"><span>↑↓ scorri · Invio apri · Esc chiudi</span><span id="gsCount"></span></div></div>`;
  document.body.appendChild(ov);const q=ov.querySelector("#gsQ");
  const close=()=>{ov.remove();document.removeEventListener("keydown",key,true);try{if(prev&&prev.focus&&document.contains(prev))prev.focus()}catch(e){}};
  const key=e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();return}
    const it=[...ov.querySelectorAll(".gs-it")];
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();e.stopPropagation();if(!it.length)return;GS_SEL=(GS_SEL+(e.key==="ArrowDown"?1:-1)+it.length)%it.length;
      it.forEach((x,i)=>{x.classList.toggle("on",i===GS_SEL);x.setAttribute("aria-selected",String(i===GS_SEL))});it[GS_SEL].scrollIntoView({block:"nearest"});return}
    if(e.key==="Enter"){e.preventDefault();e.stopPropagation();if(it[GS_SEL])gsGo(it[GS_SEL].dataset.url);return}
    if(e.key==="Tab"){e.preventDefault();q.focus();return}
    if(!ov.contains(e.target))e.stopPropagation()};
  document.addEventListener("keydown",key,true);
  ov.addEventListener("mousedown",e=>{if(e.target===ov)close()});
  ov.addEventListener("click",e=>{const it=e.target.closest(".gs-it");if(it)gsGo(it.dataset.url)});
  q.addEventListener("input",gsRender);gsRender();setTimeout(()=>q.focus(),20)}
function gsRender(){const q=document.getElementById("gsQ"),box=document.getElementById("gsList");if(!q||!box)return;const res=gsFind(GS_IDX||[],q.value);GS_SEL=0;
  document.getElementById("gsCount").textContent=q.value.trim()?(res.length===1?"1 risultato":res.length+" risultati"):(GS_IDX.length+" elementi salvati");
  if(!q.value.trim()){box.innerHTML=`<p class="gs-empty">${GS_IDX.length?"Scrivi un nome o una parola: cerco tra PG, NPC, incontri, Diario, Mondo, Enigmi e Mappe di questa campagna.":"In questa campagna non c'è ancora nulla di salvato."}</p>`;return}
  if(!res.length){box.innerHTML='<p class="gs-empty">Nessun elemento trovato. I mostri del bestiario si cercano negli Incontri.</p>';return}
  /* raggruppati per tool, nell'ordine di rilevanza del primo risultato di ciascun gruppo */
  const groups=[];res.slice(0,60).forEach(x=>{let g=groups.find(y=>y.n===x.r.grp);if(!g){g={n:x.r.grp,l:[]};groups.push(g)}g.l.push(x)});let i=0;
  box.innerHTML=groups.map(g=>`<div class="gs-grp">${uiEsc(g.n)}</div>`+g.l.map(x=>{const sn=gsSnippet(x.r,x.w),k=i++;
    return`<div class="gs-it ${k===0?"on":""}" role="option" aria-selected="${k===0}" data-url="${uiEsc(x.r.url)}"><b>${uiEsc(x.r.title)}</b>${x.r.sub?`<small>${uiEsc(x.r.sub)}</small>`:""}${sn?`<span class="gs-sn">${sn}</span>`:""}</div>`}).join("")).join("")
    +(res.length>60?`<p class="gs-empty">Altri ${res.length-60} risultati: aggiungi una parola per restringere.</p>`:"")}
/* apre l'elemento nel suo tool; se è questo stesso tool la pagina va ricaricata perché legga il collegamento */
function gsGo(url){const a=document.createElement("a");a.href=url;const same=a.pathname===location.pathname;location.href=a.href;if(same)location.reload()}
(function(){const nav=document.querySelector(".suite-nav"),data=document.getElementById("snData");
  if(nav&&!document.getElementById("snSearch")){const b=document.createElement("button");b.type="button";b.id="snSearch";b.className="btn sn-search";b.title="Cerca nella campagna (tasto / oppure Ctrl+K)";b.setAttribute("aria-label","Cerca nella campagna");
    b.innerHTML='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /> <path d="m21 21-4.3-4.3" /></svg> <span class="lbl">Cerca</span>';b.onclick=gsOpen;nav.insertBefore(b,data||null)}
  document.addEventListener("keydown",e=>{const k=e.key.toLowerCase(),t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
    if(((e.ctrlKey||e.metaKey)&&k==="k")||(k==="/"&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!document.querySelector(".ui-ov"))){e.preventDefault();gsOpen()}});
  if(location.hash==="#cerca"){history.replaceState(null,"",location.pathname+location.search);setTimeout(gsOpen,60)}})();
