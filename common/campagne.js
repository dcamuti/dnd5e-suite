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
/* Un'altra finestra sta cambiando campagna: questa smette di scrivere e, a cambio avvenuto, si ricarica.
   Conta solo il parcheggio della campagna con cui QUESTA pagina è stata caricata: dopo una ricarica il browser può
   consegnare alla pagina nuova gli eventi delle scritture fatte da quella vecchia, e quelli vanno ignorati
   (altrimenti la pagina appena caricata smetterebbe di salvare per qualche istante). */
window.addEventListener("storage",e=>{if(!e.key)return;
  if(e.key===STORE.camps){if(campReg().cur!==CAMP_AT_LOAD){DB_LOCK=true;location.reload()}else dataBadge();return}
  if(e.key!==CAMP_PARK+CAMP_AT_LOAD)return;
  if(e.newValue==null){if(campReg().cur===CAMP_AT_LOAD)DB_LOCK=false;return}
  if(campReg().cur===CAMP_AT_LOAD&&localStorage.getItem(CAMP_PARK+CAMP_AT_LOAD)==null)return;   // evento in ritardo: il parcheggio non c'è più
  DB_LOCK=true;
  setTimeout(()=>{if(!DB_LOCK)return;if(campReg().cur!==CAMP_AT_LOAD)location.reload();else if(localStorage.getItem(CAMP_PARK+CAMP_AT_LOAD)==null)DB_LOCK=false},1500)});
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
/* mappe delle campagne non attive (per sapere se un'immagine della libreria, comune a tutte, è usata altrove) */
function campParkedMaps(){const out=[];campReg().list.forEach(c=>{try{const o=JSON.parse(localStorage.getItem(CAMP_PARK+c.id)||"null");
  if(o&&typeof o[STORE.maps]==="string")(JSON.parse(o[STORE.maps])||[]).forEach(m=>{if(m)out.push({camp:c.name,map:m})})}catch(e){}});return out}
/* ---- una campagna in un file: per passarla a un altro master o a un altro browser ----
   Il file contiene solo i dati della campagna (non homebrew, preferenze o altre campagne) e le immagini usate dalle sue mappe. */
function campAssetIds(mapsRaw){const s=new Set();try{(JSON.parse(mapsRaw)||[]).forEach(m=>{if(!m)return;(m.palette||[]).forEach(p=>p&&p.tex&&s.add(p.tex));(m.objects||[]).forEach(o=>o&&o.img&&s.add(o.img));if(m.bg&&m.bg.img)s.add(m.bg.img)})}catch(e){}return[...s]}
async function campExport(){hmCloseAll();try{window.dispatchEvent(new Event("beforeunload"))}catch(e){}
  const c=campCur(),data={type:"dnd5e_campaign",ver:1,schema:DB_SCHEMA,name:c.name,date:new Date().toISOString(),store:{}};
  CAMP_DATA.forEach(n=>{const v=localStorage.getItem(STORE[n]);if(v!=null)data.store[STORE[n]]=v});
  if(!Object.keys(data.store).length){uiAlert("In questa campagna non c'è ancora nulla da esportare.");return}
  const ids=campAssetIds(data.store[STORE.maps]||"[]");if(ids.length){try{const a=await assetsForExport(ids);if(a.length)data.assets=a}catch(e){}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}));
  a.download="dnd5e_campagna_"+(c.name.replace(/[^\w\-àèéìòù]+/gi,"_").replace(/^_+|_+$/g,"")||"campagna")+"_"+data.date.slice(0,10)+".json";a.click();
  uiNote("⬇ Campagna «"+c.name+"» esportata"+(data.assets?" con "+data.assets.length+(data.assets.length===1?" immagine":" immagini"):""))}
function campImport(){hmCloseAll();const i=document.createElement("input");i.type="file";i.accept=".json,application/json";
  i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{let d=null;try{d=JSON.parse(rd.result)}catch(e){}campImportData(d)};rd.readAsText(f)};i.click()}
async function campImportData(d){
  if(d&&d.type==="dnd5e_suite_backup"){uiAlert("Questo file è un backup dell'intera suite, non una singola campagna.\nPer usarlo scegli «Ripristina backup» dal menu Dati.");return}
  if(!d||d.type!=="dnd5e_campaign"||!d.store||typeof d.store!=="object"){uiAlert("File non valido: non è una campagna esportata dalla suite.");return}
  if((parseInt(d.schema,10)||1)>DB_SCHEMA){uiAlert("Questa campagna è stata esportata da una versione più recente della suite.\n\nAggiorna la pagina (o la suite) e riprova.");return}
  const keys=CAMP_DATA.map(n=>STORE[n]).filter(k=>typeof d.store[k]==="string");if(!keys.length){uiAlert("Il file non contiene dati di una campagna.");return}
  const r=campReg(),base=campName(d.name)||"Campagna importata";let name=base,k=1;while(r.list.some(c=>c.name===name))name=base+" ("+(++k)+")";
  const nImg=Array.isArray(d.assets)?d.assets.length:0;
  const ans=await uiDialog({title:"⬆ Importare la campagna?",text:`«${name}» verrà aggiunta come nuova campagna: quelle che hai già non vengono toccate.`+(nImg?`\n\nLe ${nImg} immagini del file verranno aggiunte alla libreria.`:""),
    buttons:[{label:"Annulla",value:null,cancel:true},{label:"Aggiungi",value:"add"},{label:"Aggiungi e apri",value:"open",primary:true,kind:"gold"}]});
  if(!ans.value)return;
  let imgMap={},imgFail=false;if(nImg){try{imgMap=await mergeAssets(d.assets)}catch(e){imgFail=true}}
  const out={};try{keys.forEach(key=>{out[key]=safeStoreVal(key,key===STORE.maps?remapAssetIds(d.store[key],imgMap):d.store[key])})}catch(e){uiAlert("File non valido: i dati della campagna non si leggono.");return}
  const c={id:newId("cmp"),name,created:new Date().toISOString()};
  try{localStorage.setItem(CAMP_PARK+c.id,JSON.stringify(out));r.list.push(c);campSave(r)}
  catch(e){try{localStorage.removeItem(CAMP_PARK+c.id)}catch(e2){}uiAlert("⚠ Spazio del browser insufficiente: la campagna non è stata importata.");return}
  if(imgFail)await uiAlert("⚠ Le immagini del file non sono state importate (libreria immagini non disponibile in questo browser). Il resto della campagna c'è.");
  if(ans.value==="open"&&campSwitch(c.id)){location.reload();return}
  dataBadge();uiNote("⬆ Campagna «"+name+"» importata: la trovi in «Cambia campagna»")}
/* voci della campagna in cima al menu Dati (aggiunte qui, così il menu è uguale in tutti i tool) */
function renderCampMenu(){const m=document.querySelector("#snData .hmenu-list");if(!m)return;let box=document.getElementById("snCamp");
  if(!box){box=document.createElement("div");box.id="snCamp";m.insertBefore(box,m.firstChild)}
  const r=campReg(),c=campCur(),many=r.list.length>1,it=(fn,ico,l)=>`<button class="mi-it" role="menuitem" onclick="${fn}()">${ico} ${l}</button>`;
  box.innerHTML=`<div class="mi-note">Campagna: <b>${uiEsc(c.name)}</b>${many?` · ${r.list.length} in tutto`:""}</div>`+
    (many?it("campPick",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4" /> <path d="M3 11v-1a4 4 0 0 1 4-4h14" /> <path d="m7 22-4-4 4-4" /> <path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>',"Cambia campagna"):"")+
    it("campNew",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /> <path d="M12 5v14" /></svg>',"Nuova campagna")+
    it("campRename",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /> <path d="m15 5 4 4" /></svg>',"Rinomina la campagna")+
    (many?it("campDelete",'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18" /> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /> <line x1="10" x2="10" y1="11" y2="17" /> <line x1="14" x2="14" y1="11" y2="17" /></svg>',"Elimina una campagna"):"")+
    it("campExport",ICO_OPEN+ICO_SVG.download+"</svg>","Esporta questa campagna")+it("campImport",ICO_OPEN+ICO_SVG.upload+"</svg>","Importa una campagna")+`<div class="mi-sep"></div>`}
const ICO_OPEN='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
