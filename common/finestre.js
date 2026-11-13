/* ================= FINESTRE DELLA SUITE (al posto di confirm/prompt del browser) =================
   uiDialog({title,text|html,fields:[{k,label,type,value,min,max,placeholder}],buttons:[{label,value,kind,primary,cancel}]}) → Promise
   Invio = pulsante principale, Esc o clic fuori = annulla; il focus resta nella finestra finché è aperta. */
const uiEsc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function uiDialog(o){return new Promise(res=>{
  const prev=document.activeElement,ov=document.createElement("div");ov.className="ui-ov";
  const flds=(o.fields||[]).map(f=>`<label class="ui-f"><span>${uiEsc(f.label||"")}</span><input data-k="${uiEsc(f.k)}" type="${f.type==="number"?"number":"text"}"${f.min!=null?` min="${f.min}"`:""}${f.max!=null?` max="${f.max}"`:""}${f.readonly?" readonly":""} value="${uiEsc(f.value??"")}"${f.placeholder?` placeholder="${uiEsc(f.placeholder)}"`:""}></label>`).join("");
  const body=o.html!=null?o.html:o.text!=null?uiEsc(o.text).replace(/\n/g,"<br>"):"";
  ov.innerHTML=`<div class="ui-box" role="dialog" aria-modal="true"${o.title?' aria-labelledby="uiT"':""}>${o.title?`<h3 id="uiT">${uiEsc(o.title)}</h3>`:""}${body?`<div class="ui-msg">${body}</div>`:""}${flds}
    <div class="ui-btns">${o.buttons.map((b,i)=>`<button type="button" class="btn ${b.kind||""}" data-i="${i}">${uiEsc(b.label)}</button>`).join("")}</div></div>`;
  document.body.appendChild(ov);
  const btns=[...ov.querySelectorAll(".ui-btns .btn")],ins=[...ov.querySelectorAll("input")];
  const vals=()=>{const v={};ins.forEach(x=>{if(x.dataset.k!=null)v[x.dataset.k]=x.type==="checkbox"?x.checked:x.value});return v};
  const pi=o.buttons.findIndex(b=>b.primary),ci=o.buttons.findIndex(b=>b.cancel);
  const close=i=>{ov.remove();document.removeEventListener("keydown",key,true);try{if(prev&&prev.focus&&document.contains(prev))prev.focus()}catch(e){}
    res({i,value:i>=0?o.buttons[i].value:null,fields:vals()})};
  btns.forEach((b,i)=>b.onclick=()=>close(i));
  const key=e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close(ci)}
    else if(e.key==="Enter"&&pi>=0&&e.target.tagName!=="BUTTON"){e.preventDefault();e.stopPropagation();close(pi)}
    else if(e.key==="Tab"){const f=[...ins,...btns],i=f.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}
    else if(!ov.contains(e.target)){e.stopPropagation()}};
  document.addEventListener("keydown",key,true);
  ov.addEventListener("mousedown",e=>{if(e.target===ov)close(ci)});
  setTimeout(()=>{const f=ins[0]&&o.focusField!==false?ins[0]:btns[pi>=0?pi:btns.length-1];if(f){f.focus();if(f.select&&f.tagName==="INPUT")f.select()}},20)})}
async function uiConfirm(text,o={}){const r=await uiDialog({title:o.title,text:o.html!=null?undefined:text,html:o.html,
  buttons:[{label:o.no||"Annulla",value:false,cancel:true},{label:o.yes||"Conferma",value:true,primary:true,kind:o.danger?"danger":"gold"}]});return r.value===true}
async function uiPrompt(text,def,o={}){const r=await uiDialog({title:o.title,text,fields:[{k:"v",label:o.label||"",type:o.type,value:def??"",min:o.min,max:o.max,placeholder:o.placeholder}],
  buttons:[{label:"Annulla",value:null,cancel:true},{label:o.yes||"OK",value:"ok",primary:true,kind:"gold"}]});return r.value==="ok"?r.fields.v:null}
async function uiForm(title,fields,o={}){const r=await uiDialog({title,text:o.text,fields,buttons:[{label:"Annulla",value:null,cancel:true},{label:o.yes||"OK",value:"ok",primary:true,kind:"gold"}]});
  return r.value==="ok"?r.fields:null}
function uiAlert(text,o={}){return uiDialog({title:o.title,text,buttons:[{label:o.ok||"Ho capito",value:true,primary:true,cancel:true,kind:"gold"}]})}
/* link da copiare quando gli appunti del browser non sono disponibili */
async function uiCopy(url,title){const r=await uiDialog({title:title||"🔗 Link da copiare",text:"Copia il link e incollalo dove ti serve.",fields:[{k:"u",label:"",value:url,readonly:true}],
  buttons:[{label:"Chiudi",value:null,cancel:true},{label:"📋 Copia",value:"copy",primary:true,kind:"gold"}]});
  if(r.value!=="copy")return;let ok=false;
  try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(url);ok=true}}catch(e){}
  if(!ok){const t=document.createElement("textarea");t.value=url;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();try{ok=document.execCommand("copy")}catch(e){}t.remove()}
  uiNote(ok?"🔗 Link copiato negli appunti":"Copia non riuscita: seleziona il link e copialo a mano")}
/* avviso breve in basso (usato da «Annulla» e dalle copie) */
/* gli esiti non toccano un eventuale «Annulla» ancora attivo: compaiono sopra di esso; restano visibili in proporzione alla lunghezza */
let UI_NOTE_T=null;
function uiNote(msg,ms){const old=document.getElementById("uiNote");if(old)old.remove();clearTimeout(UI_NOTE_T);msg=String(msg);
  const d=document.createElement("div");d.id="uiNote";d.className="ui-undo";d.setAttribute("role","status");uiPlace(d);
  const u=document.getElementById("uiUndo");if(u)d.style.bottom=(parseInt(u.style.bottom,10)||22)+u.offsetHeight+10+"px";
  d.innerHTML=`<span>${uiEsc(msg)}</span>`;document.body.appendChild(d);UI_NOTE_T=setTimeout(()=>d.remove(),Math.max(ms||0,2600,msg.length*45))}
/* l'avviso sta sopra eventuali barre fisse in basso (es. i dadi degli Incontri) e sostituisce il toast del tool */
function uiPlace(d){const t=document.getElementById("toast");if(t)t.style.display="none";const tb=document.getElementById("toastBox");if(tb)tb.className="";
  const bar=document.getElementById("dbar"),cs=bar&&getComputedStyle(bar);d.style.bottom=(cs&&cs.display!=="none"&&cs.position==="fixed"?bar.offsetHeight+14:22)+"px"}
/* eliminazione immediata con «Annulla» per 8 secondi: alla successiva eliminazione la precedente diventa definitiva */
let UI_UNDO_T=null;
function uiUndo(msg,restore){const old=document.getElementById("uiUndo");if(old)old.remove();clearTimeout(UI_UNDO_T);
  const d=document.createElement("div");d.id="uiUndo";d.className="ui-undo";d.setAttribute("role","status");uiPlace(d);
  d.innerHTML=`<span>${uiEsc(msg)}</span><button type="button" class="btn small">↶ Annulla</button>`;document.body.appendChild(d);
  d.querySelector("button").onclick=()=>{clearTimeout(UI_UNDO_T);d.remove();try{restore()}catch(e){console.error(e)}};
  UI_UNDO_T=setTimeout(()=>d.remove(),8000)}
