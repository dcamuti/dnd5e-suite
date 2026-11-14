/* ================= CAMPAGNE (uguale in tutti i tool) =================
   Registro e chiavi sono descritti in «STORAGE DELLA SUITE». Qui: cambio di campagna e voci del menu Dati. */
const CAMP_AT_LOAD=campReg().cur;
function campCur(){const r=campReg();return r.list.find(c=>c.id===r.cur)}
function campSave(r){localStorage.setItem(STORE.camps,JSON.stringify(r))}
/* Scambia la campagna attiva con quella indicata. Restituisce true se riuscito: chi chiama ricarica la pagina.
   Ordine: 1) le pagine salvano ciò che hanno in sospeso; 2) da qui nessuno scrive più; 3) la campagna attiva viene parcheggiata;
   4) l'altra prende il suo posto; 5) il registro cambia. Se manca spazio si torna alla situazione di partenza. */
function campSwitch(id){const r=campReg(),from=r.cur;if(id===from||!r.list.some(c=>c.id===id))return false;
  try{window.dispatchEvent(new Event("beforeunload"))}catch(e){}
  const keys=CAMP_DATA.map(n=>STORE[n]),cur={};keys.forEach(k=>{const v=localStorage.getItem(k);if(v!=null)cur[k]=v});
  let tgt={};try{tgt=JSON.parse(localStorage.getItem(CAMP_PARK+id)||"{}")||{}}catch(e){tgt={}}
  DB_LOCK=true;
  try{localStorage.setItem(CAMP_PARK+from,JSON.stringify(cur))}
  catch(e){DB_LOCK=false;uiAlert("⚠ Spazio del browser insufficiente per cambiare campagna: non è stato modificato nulla.\n\nLibera spazio (per esempio eliminando mappe o immagini che non usi) e riprova.");return false}
  try{keys.forEach(k=>localStorage.removeItem(k));
    keys.forEach(k=>{if(typeof tgt[k]==="string")localStorage.setItem(k,tgt[k])});
    r.cur=id;campSave(r)}
  catch(e){try{keys.forEach(k=>localStorage.removeItem(k));Object.keys(cur).forEach(k=>localStorage.setItem(k,cur[k]));localStorage.removeItem(CAMP_PARK+from)}catch(e2){}
    DB_LOCK=false;uiAlert("⚠ Cambio di campagna non riuscito per spazio del browser insufficiente: è rimasta attiva la campagna di prima.");return false}
  try{localStorage.removeItem(CAMP_PARK+id)}catch(e){}
  return true}
/* un'altra finestra sta cambiando campagna (o ripristinando un backup): questa smette di scrivere e si ricarica */
window.addEventListener("storage",e=>{if(!e.key)return;
  if(e.key===STORE.camps){if(campReg().cur!==CAMP_AT_LOAD){DB_LOCK=true;location.reload()}else dataBadge();return}
  if(e.key.indexOf(CAMP_PARK)!==0)return;
  if(e.newValue==null){if(campReg().cur===CAMP_AT_LOAD)DB_LOCK=false;return}
  DB_LOCK=true;setTimeout(()=>{if(DB_LOCK)location.reload()},1500)});
async function campNew(){hmCloseAll();
  const v=await uiPrompt("La nuova campagna parte vuota: PG, NPC, incontri salvati, tracker, Diario, Mondo, Enigmi e Mappe sono separati per campagna.\nContenuti homebrew, immagini e preferenze restano in comune.","",{title:"➕ Nuova campagna",label:"Nome della campagna",placeholder:"es. La Maledizione di Strahd",yes:"Crea e apri"});
  const name=campName(v);if(!name)return;const r=campReg(),c={id:newId("cmp"),name,created:new Date().toISOString()};r.list.push(c);
  try{campSave(r)}catch(e){uiAlert("⚠ Spazio del browser insufficiente: la campagna non è stata creata.");return}
  if(campSwitch(c.id))location.reload();else{const x=campReg();x.list=x.list.filter(k=>k.id!==c.id);try{campSave(x)}catch(e){}}}
async function campPick(){hmCloseAll();const r=campReg(),cur=campCur();
  const d=await uiDialog({title:"🔁 Cambia campagna",text:`Campagna attiva: «${cur.name}».\nScegli quella da aprire: la pagina verrà ricaricata.`,
    buttons:[{label:"Annulla",value:null,cancel:true}].concat(r.list.filter(c=>c.id!==r.cur).map(c=>({label:c.name,value:c.id})))});
  if(d.value&&campSwitch(d.value))location.reload()}
async function campRename(){hmCloseAll();const cur=campCur(),v=await uiPrompt("",cur.name,{title:"✏ Rinomina la campagna",label:"Nome della campagna",yes:"Rinomina"});
  const name=campName(v);if(!name||name===cur.name)return;const r=campReg();r.list.find(c=>c.id===r.cur).name=name;
  try{campSave(r)}catch(e){return}dataBadge();uiNote("✏ Campagna rinominata: «"+name+"»")}
async function campDelete(){hmCloseAll();const r=campReg(),cur=campCur();
  const d=await uiDialog({title:"🗑 Elimina una campagna",text:`Si può eliminare una campagna diversa da quella attiva («${cur.name}»).\nQuale vuoi eliminare?`,
    buttons:[{label:"Annulla",value:null,cancel:true}].concat(r.list.filter(c=>c.id!==r.cur).map(c=>({label:c.name,value:c.id})))});
  const c=r.list.find(x=>x.id===d.value);if(!c)return;
  if(!await uiConfirm(`La campagna «${c.name}» verrà eliminata con tutti i suoi dati: PG, NPC, incontri, Diario, Mondo, Enigmi e Mappe.\nL'operazione non si può annullare: se ti serve, fai prima un backup.`,{title:"🗑 Eliminare la campagna?",yes:"Elimina «"+c.name+"»",danger:true}))return;
  const x=campReg();x.list=x.list.filter(k=>k.id!==c.id);try{campSave(x);localStorage.removeItem(CAMP_PARK+c.id)}catch(e){}
  dataBadge();uiNote("🗑 Campagna «"+c.name+"» eliminata")}
/* voci della campagna in cima al menu Dati (aggiunte qui, così il menu è uguale in tutti i tool) */
function renderCampMenu(){const m=document.querySelector("#snData .hmenu-list");if(!m)return;let box=document.getElementById("snCamp");
  if(!box){box=document.createElement("div");box.id="snCamp";m.insertBefore(box,m.firstChild)}
  const r=campReg(),c=campCur(),many=r.list.length>1,it=(fn,ico,l)=>`<button class="mi-it" role="menuitem" onclick="${fn}()">${ico} ${l}</button>`;
  box.innerHTML=`<div class="mi-note">Campagna: <b>${uiEsc(c.name)}</b>${many?` · ${r.list.length} in tutto`:""}</div>`+
    (many?it("campPick",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4" /> <path d="M3 11v-1a4 4 0 0 1 4-4h14" /> <path d="m7 22-4-4 4-4" /> <path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>',"Cambia campagna"):"")+
    it("campNew",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /> <path d="M12 5v14" /></svg>',"Nuova campagna")+
    it("campRename",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /> <path d="m15 5 4 4" /></svg>',"Rinomina la campagna")+
    (many?it("campDelete",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18" /> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /> <line x1="10" x2="10" y1="11" y2="17" /> <line x1="14" x2="14" y1="11" y2="17" /></svg>',"Elimina una campagna"):"")+`<div class="mi-sep"></div>`}
