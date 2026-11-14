/* chiavi reali di tutti i dati della suite (dalla tabella STORE) */
const SUITE_KEYS=Object.values(STORE);
async function backupSuite(){
  const data={type:"dnd5e_suite_backup",ver:4,schema:DB_SCHEMA,date:new Date().toISOString(),store:{}};
  let n=0;SUITE_KEYS.forEach(k=>{try{const v=localStorage.getItem(k);if(v!=null){data.store[k]=v;if(k!==STORE.camps)n++}}catch(e){}});
  /* le campagne non attive: una voce per campagna, con i valori grezzi delle sue chiavi */
  const parks={};campReg().list.forEach(c=>{try{const v=localStorage.getItem(CAMP_PARK+c.id);if(v!=null){parks[c.id]=v;n++}}catch(e){}});
  if(Object.keys(parks).length)data.camps=parks;
  /* immagini della libreria: facoltative, perché possono pesare molto */
  let imgs=[];try{imgs=await assetAll()}catch(e){}
  if(!n&&!imgs.length){uiAlert("Nulla da salvare.");return}
  if(imgs.length){const mb=imgs.reduce((s,a)=>s+(a.size||(a.blob&&a.blob.size)||0),0)/1048576;
    const r=await uiDialog({title:"🗄 Backup suite",text:`Nella libreria ci sono ${imgs.length} ${imgs.length===1?"immagine":"immagini"} (${mb.toFixed(1).replace(".",",")} MB). Vuoi includerle nel backup?`,
      buttons:[{label:"Annulla",value:null,cancel:true},{label:"Solo i dati",value:"data"},{label:`Backup completo (${mb.toFixed(1).replace(".",",")} MB)`,value:"all",primary:true,kind:"gold"}]});
    if(!r.value)return;if(r.value==="all")data.assets=await assetsForExport()}
  const now=new Date().toISOString();data.store[STORE.lastBackup]=now;
  const blob=new Blob([JSON.stringify(data)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="dnd5e_suite_backup_"+now.slice(0,10)+(data.assets?"_con_immagini":"")+".json";a.click();
  dbSet("lastBackup",now);dataBadge();
}
function restoreSuite(file){
  const rd=new FileReader();
  rd.onload=async()=>{try{
    const d=JSON.parse(rd.result);
    if(d.type!=="dnd5e_suite_backup"||!d.store||typeof d.store!=="object")throw 0;
    const bs=parseInt(d.schema,10)>0?parseInt(d.schema,10):1;
    if(bs>DB_SCHEMA){uiAlert("Questo backup è stato creato da una versione più recente della suite e non può essere ripristinato qui.\n\nAggiorna la pagina (o la suite) e riprova.");return}
    /* backup vecchi: le chiavi precedenti (es. enc_trk) vengono tradotte nei nomi attuali; se ci sono entrambe vale quella attuale */
    const st={};Object.keys(d.store).forEach(k=>{const nk=STORE_LEGACY[k]||k;if(SUITE_KEYS.includes(nk)&&typeof d.store[k]==="string"&&(!(nk in st)||nk===k))st[nk]=d.store[k]});
    const keys=Object.keys(st);if(!keys.length)throw 0;
    const nImg=Array.isArray(d.assets)?d.assets.length:0;
    /* backup con il registro delle campagne: sostituisce tutte le campagne. Backup precedenti (una sola campagna): entrano in quella attiva */
    let reg=null;try{const x=JSON.parse(st[STORE.camps]);if(x&&Array.isArray(x.list)&&x.list.some(c=>c&&c.id===x.cur))reg=x}catch(e){}
    if(!reg){delete st[STORE.camps];const i=keys.indexOf(STORE.camps);if(i>=0)keys.splice(i,1);if(!keys.length)throw 0}
    const here=campReg(),nBk=reg?reg.list.length:1;
    const what=reg?"Tutti i dati della suite in questo browser"+(here.list.length>1||nBk>1?` (tutte le campagne: qui ${here.list.length}, nel file ${nBk})`:"")+" verranno sostituiti da quelli del file."
      :here.list.length>1?`Il file contiene una sola campagna: sostituirà i dati della campagna attiva «${campCur().name}» e i contenuti comuni. Le altre campagne non vengono toccate.`
      :"Tutti i dati della suite in questo browser verranno sostituiti da quelli del file.";
    if(!await uiConfirm(what+" L'operazione non si può annullare."+(nImg?`\n\nLe ${nImg} immagini del backup verranno aggiunte alla libreria (quelle già presenti restano).`:""),{title:"⬆ Ripristinare il backup?",yes:"Sostituisci tutti i dati",danger:true}))return;
    /* immagini: aggiunte, mai cancellate; i riferimenti delle mappe seguono gli ID nella libreria */
    let imgMap={},imgFail=false;if(nImg){try{imgMap=await mergeAssets(d.assets)}catch(e){imgFail=true}}
    if(st[STORE.maps])st[STORE.maps]=remapAssetIds(st[STORE.maps],imgMap);
    /* sostituzione completa: le chiavi della suite assenti nel backup vengono rimosse, così non restano dati misti */
    let fail=0;
    SUITE_KEYS.forEach(k=>{if(k===STORE.camps&&!reg)return;try{if(keys.includes(k))localStorage.setItem(k,safeStoreVal(k,st[k]));else localStorage.removeItem(k)}catch(e){fail++}});
    if(reg){const parks=d.camps&&typeof d.camps==="object"?d.camps:{},ck=CAMP_DATA.map(n=>STORE[n]);
      Object.keys(localStorage).filter(k=>k.indexOf(CAMP_PARK)===0).forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
      reg.list.forEach(c=>{if(!c||c.id===reg.cur||!/^[\w-]+$/.test(c.id||"")||typeof parks[c.id]!=="string")return;
        try{const o=JSON.parse(parks[c.id]),out={};Object.keys(o||{}).forEach(k=>{if(ck.includes(k)&&typeof o[k]==="string")out[k]=safeStoreVal(k,k===STORE.maps?remapAssetIds(o[k],imgMap):o[k])});
          localStorage.setItem(CAMP_PARK+c.id,JSON.stringify(out))}catch(e){fail++}})}
    campReg();
    Object.keys(STORE_LEGACY).forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
    try{localStorage.setItem(DB_SCHEMA_KEY,String(Math.max(bs,1)));}catch(e){}
    dbMigrate();
    if(fail){uiAlert("⚠ Ripristino incompleto: "+fail+" dati non sono stati scritti, probabilmente per spazio del browser insufficiente.\nLibera spazio e riprova.");return}
    await uiAlert("I dati della suite sono stati sostituiti da quelli del file."+(imgFail?"\n\n⚠ Le immagini non sono state ripristinate (libreria immagini non disponibile in questo browser).":"")+"\n\nLa pagina verrà ricaricata.",{title:"✅ Backup ripristinato",ok:"Ricarica la pagina"});location.reload();
  }catch(err){uiAlert("File di backup non valido.")}};
  rd.readAsText(file);
}
