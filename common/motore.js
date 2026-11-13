/* ==== MOTORE SUITE v1 ==== */
/* Base comune dei generatori: casualità con seme, modelli con etichette, profilo campagna, invio al diario.
   Questo blocco è identico in tutti i tool della suite: modificarlo ovunque insieme. */
/* --- casualità con seme (mulberry32): stesso seme → stesso risultato --- */
function mkRng(seed){let a=0;const s=String(seed);for(let i=0;i<s.length;i++)a=(Math.imul(a^s.charCodeAt(i),2654435761)+i)>>>0;
  return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
let RNG=Math.random;
const rnd=()=>RNG();
const rInt=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const rDie=n=>1+Math.floor(rnd()*n);
const rPick=a=>a[Math.floor(rnd()*a.length)];
const rShuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const rSample=(a,n)=>rShuffle(a).slice(0,n);
function newSeed(){return Math.random().toString(36).slice(2,8)}
/* esegue fn con il generatore fissato sul seme indicato */
function withSeed(seed,fn){const prev=RNG;RNG=mkRng(seed);try{return fn()}finally{RNG=prev}}

/* --- profilo campagna (impostato nel Diario, letto da tutti i generatori) --- */
const PROF_OPTS={
  tono:[["eroico","Eroico"],["cupo","Cupo"],["leggero","Leggero"]],
  amb:[["misto","Misto"],["citta","Città"],["costa","Costa e mare"],["foresta","Foreste"],["montagna","Montagne"],["pianura","Pianure e colline"],["palude","Paludi"],["deserto","Deserto"],["artico","Terre gelide"],["sottosuolo","Sottosuolo"]],
  magia:[["bassa","Magia rara"],["media","Magia presente"],["alta","Magia ovunque"]]};
const PROF_DEF={tono:"eroico",amb:"misto",magia:"media"};
let PROF_OVR=null;/* modifica temporanea, solo per questa pagina */
function profGet(){let p={};try{p=dbGet("profile",{})||{}}catch(e){}
  const o=Object.assign({},PROF_DEF,p,PROF_OVR||{});
  for(const k in PROF_OPTS)if(!PROF_OPTS[k].some(x=>x[0]===o[k]))o[k]=PROF_DEF[k];return o}
function profSave(p){try{dbSet("profile",p)}catch(e){}}
function profLabel(k,v){const x=(PROF_OPTS[k]||[]).find(y=>y[0]===v);return x?x[1]:v}
/* etichette attive: tono, ambiente, magia (es. ["cupo","costa","magia-bassa"]) */
function profTags(extra){const p=profGet();return[p.tono,p.amb,"magia-"+p.magia].concat(extra||[]).filter(Boolean)}
/* badge del profilo: clic per cambiarlo solo in questa pagina */
function profBadge(elId,onChange){const el=document.getElementById(elId);if(!el)return;
  const p=profGet();
  el.innerHTML=`<span class="pf-badge" title="Profilo campagna: orienta i generatori. Si imposta nel Diario; qui puoi cambiarlo solo per questa pagina.">🧭 ${profLabel("tono",p.tono)} · ${profLabel("amb",p.amb)} · ${profLabel("magia",p.magia)}${PROF_OVR?' <i style="opacity:.7">(temporaneo)</i>':""} ▾</span>
   <span class="pf-pop" style="display:none">${Object.keys(PROF_OPTS).map(k=>`<select data-k="${k}">${PROF_OPTS[k].map(([v,l])=>`<option value="${v}"${p[k]===v?" selected":""}>${l}</option>`).join("")}</select>`).join("")}
   ${PROF_OVR?'<a class="pf-reset">↺ usa il profilo del Diario</a>':""}</span>`;
  const pop=el.querySelector(".pf-pop");
  el.querySelector(".pf-badge").onclick=()=>{pop.style.display=pop.style.display==="none"?"inline-flex":"none"};
  pop.querySelectorAll("select").forEach(sel=>sel.onchange=()=>{PROF_OVR=PROF_OVR||{};PROF_OVR[sel.dataset.k]=sel.value;profBadge(elId,onChange);if(onChange)onChange()});
  const rs=pop.querySelector(".pf-reset");if(rs)rs.onclick=()=>{PROF_OVR=null;profBadge(elId,onChange);if(onChange)onChange()};
}
(function(){try{const st=document.createElement("style");st.textContent=
  ".pf-badge{display:inline-block;cursor:pointer;background:linear-gradient(180deg,#2c2216,#241b10);border:1px solid #4a3826;border-radius:20px;padding:4px 12px;font-size:.78rem;color:#ece2d0}"+
  ".pf-badge:hover{border-color:#c9a227;color:#eccb62}.pf-pop{gap:6px;margin-left:8px;flex-wrap:wrap;align-items:center}.pf-pop select{font-size:.78rem;padding:3px 6px}"+
  ".pf-reset{color:#eccb62;cursor:pointer;font-size:.75rem;text-decoration:underline}@media print{.pf-badge,.pf-pop{display:none!important}}";
  document.head.appendChild(st)}catch(e){}})();

/* --- modelli con etichette ---
   G = { chiave: [ "testo", {t:"testo", tags:["costa","cupo"], w:2}, ... ] }
   Nel testo: {chiave} espande · {chiave>v} espande e ricorda in v · {$v} riusa · {a|b|c} scelta in linea · {^chiave} con iniziale maiuscola.
   Le voci con etichette in comune con il contesto pesano di più; un'etichetta "!x" rende la voce valida SOLO se il contesto ha x. */
function gPick(list,tags){
  const ok=[],w=[];let tot=0;
  (list||[]).forEach(e=>{const o=typeof e==="string"?{t:e}:e;const tg=o.tags||[];
    if(tg.some(t=>t[0]==="!"&&!tags.includes(t.slice(1))))return;
    const m=tg.filter(t=>tags.includes(t[0]==="!"?t.slice(1):t)).length;
    const ww=(o.w||1)*(1+2*m);ok.push(o);w.push(ww);tot+=ww});
  if(!ok.length)return"";
  let r=rnd()*tot;for(let i=0;i<ok.length;i++){r-=w[i];if(r<=0)return ok[i].t}return ok[ok.length-1].t}
function gExpand(G,tpl,ctx,depth){ctx=ctx||{};ctx.tags=ctx.tags||[];ctx.vars=ctx.vars||{};depth=depth||0;
  if(depth>12)return tpl;
  return String(tpl).replace(/\{([^{}]+)\}/g,(m,body)=>{
    if(body[0]==="$")return ctx.vars[body.slice(1)]??"";
    if(body.includes("|"))return gExpand(G,rPick(body.split("|")),ctx,depth+1);
    let cap=false;if(body[0]==="^"){cap=true;body=body.slice(1)}
    const [key,save]=body.split(">");
    if(!G[key])return m;
    let out=gExpand(G,gPick(G[key],ctx.tags),ctx,depth+1);
    if(cap)out=out.charAt(0).toUpperCase()+out.slice(1);
    if(save)ctx.vars[save]=out;
    return out})}

/* --- invio al Diario di Campagna --- */
function diaryLoad(){let D={};try{D=dbGet("diary",{})||{}}catch(e){}
  ["sessions","npcs","places","hooks"].forEach(k=>{if(!Array.isArray(D[k]))D[k]=[]});return D}
function diarySave(D){try{dbSet("diary",D)}catch(e){}}
/* kind: "npcs" {name,where,att,note} · "places" {name,note} · "hooks" {text} · "session" testo da aggiungere all'ultima sessione
   src (facoltativo): {t,id} dell'elemento di origine nel tool che invia (es. {t:"npc",id:"npc_…"}), registrato sulla voce.
   Una voce già presente si riconosce prima per origine, poi per nome (voci vecchie senza origine); se c'è, si chiede una
   volta sola se aggiornarla e si conservano atteggiamento e note scritte nel Diario. */
