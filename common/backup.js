/* chiavi reali di tutti i dati della suite (dalla tabella STORE) */
const SUITE_KEYS=Object.values(STORE);
async function backupSuite(){
  const data={type:"dnd5e_suite_backup",ver:3,schema:DB_SCHEMA,date:new Date().toISOString(),store:{}};
  let n=0;SUITE_KEYS.forEach(k=>{try{const v=localStorage.getItem(k);if(v!=null){data.store[k]=v;n++}}catch(e){}});
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
    if(!await uiConfirm("Tutti i dati della suite in questo browser verranno sostituiti da quelli del file. L'operazione non si può annullare."+(nImg?`\n\nLe ${nImg} immagini del backup verranno aggiunte alla libreria (quelle già presenti restano).`:""),{title:"⬆ Ripristinare il backup?",yes:"Sostituisci tutti i dati",danger:true}))return;
    /* immagini: aggiunte, mai cancellate; i riferimenti delle mappe seguono gli ID nella libreria */
    let imgMap={},imgFail=false;if(nImg){try{imgMap=await mergeAssets(d.assets)}catch(e){imgFail=true}}
    if(st[STORE.maps])st[STORE.maps]=remapAssetIds(st[STORE.maps],imgMap);
    /* sostituzione completa: le chiavi della suite assenti nel backup vengono rimosse, così non restano dati misti */
    let fail=0;
    SUITE_KEYS.forEach(k=>{try{if(keys.includes(k))localStorage.setItem(k,safeStoreVal(k,st[k]));else localStorage.removeItem(k)}catch(e){fail++}});
    Object.keys(STORE_LEGACY).forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
    try{localStorage.setItem(DB_SCHEMA_KEY,String(Math.max(bs,1)));}catch(e){}
    dbMigrate();
    if(fail){uiAlert("⚠ Ripristino incompleto: "+fail+" dati non sono stati scritti, probabilmente per spazio del browser insufficiente.\nLibera spazio e riprova.");return}
    await uiAlert("I dati della suite sono stati sostituiti da quelli del file."+(imgFail?"\n\n⚠ Le immagini non sono state ripristinate (libreria immagini non disponibile in questo browser).":"")+"\n\nLa pagina verrà ricaricata.",{title:"✅ Backup ripristinato",ok:"Ricarica la pagina"});location.reload();
  }catch(err){uiAlert("File di backup non valido.")}};
  rd.readAsText(file);
}
