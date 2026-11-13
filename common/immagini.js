/* ================= LIBRERIA IMMAGINI (IndexedDB "dnd5e_assets") =================
   Texture, ritratti dei token e sfondi caricati dall'utente: restano nel browser e nei backup, non nel repository.
   Record: {id:"tex_…", name, kind:"texture"|"token"|"bg", mime, w, h, hash, size, blob, created} */
const ASSET_DB="dnd5e_assets",ASSET_OS="assets",ASSET_MIME=["image/png","image/jpeg","image/webp","image/gif"];
let ASSET_DBP=null;
function assetDb(){if(!ASSET_DBP)ASSET_DBP=new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error("IndexedDB non disponibile"));
  const r=indexedDB.open(ASSET_DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(ASSET_OS))db.createObjectStore(ASSET_OS,{keyPath:"id"})};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return ASSET_DBP}
function assetTx(mode,fn){return assetDb().then(db=>new Promise((res,rej)=>{const tx=db.transaction(ASSET_OS,mode),st=tx.objectStore(ASSET_OS);let out;
  const q=fn(st);if(q)q.onsuccess=()=>{out=q.result};tx.oncomplete=()=>res(out);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)}))}
const assetAll=()=>assetTx("readonly",st=>st.getAll()).then(a=>a||[]);
const assetGet=id=>assetTx("readonly",st=>st.get(id));
const assetPut=a=>assetTx("readwrite",st=>st.put(a));
const assetDel=id=>assetTx("readwrite",st=>st.delete(id));
function blobToDataUrl(b){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(b)})}
function dataUrlToBlob(u){const m=/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(u||"");if(!m)return null;
  const bin=atob(m[2]),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:m[1]})}
async function assetsForExport(ids){const all=await assetAll().catch(()=>[]);const sel=ids?all.filter(a=>ids.includes(a.id)):all;
  return Promise.all(sel.map(async a=>({id:a.id,name:a.name,kind:a.kind,mime:a.mime,w:a.w,h:a.h,hash:a.hash||"",data:await blobToDataUrl(a.blob)})))}
/* aggiunge immagini (da backup o da una mappa importata) senza cancellare nulla: quelle già presenti, per ID o per impronta,
   vengono riconosciute. Restituisce la mappa ID del file → ID nella libreria, per aggiornare i riferimenti. */
async function mergeAssets(list){const map={};if(!Array.isArray(list)||!list.length)return map;
  const all=await assetAll().catch(()=>[]);const byId=new Map(all.map(a=>[a.id,a])),byHash=new Map(all.filter(a=>a.hash).map(a=>[a.hash,a]));
  for(const x of list){try{if(!x||!/^[\w-]+$/.test(x.id||""))continue;const blob=dataUrlToBlob(x.data);if(!blob||!ASSET_MIME.includes(blob.type))continue;
    const hash=typeof x.hash==="string"&&/^[0-9a-f]{64}$/.test(x.hash)?x.hash:"";
    if(hash&&byHash.has(hash)){map[x.id]=byHash.get(hash).id;continue}
    if(byId.has(x.id)&&(!hash||byId.get(x.id).hash===hash)){map[x.id]=x.id;continue}
    const id=byId.has(x.id)?newId(/^(tex|tok|bg)_/.test(x.id)?x.id.split("_")[0]:"tex"):x.id;
    const rec={id,name:String(x.name||"immagine").replace(/[<>]/g,"").slice(0,80),kind:["texture","token","bg"].includes(x.kind)?x.kind:"texture",
      mime:blob.type,w:parseInt(x.w,10)||0,h:parseInt(x.h,10)||0,hash,size:blob.size,blob,created:new Date().toISOString()};
    await assetPut(rec);byId.set(id,rec);if(hash)byHash.set(hash,rec);map[x.id]=id}catch(e){}}
  return map}
/* sostituisce gli ID delle immagini in un testo JSON (gli ID sono token univoci, es. tex_mvto…_k3f9q2ab) */
function remapAssetIds(txt,map){let out=txt;Object.keys(map).forEach(o=>{if(map[o]!==o)out=out.split('"'+o+'"').join('"'+map[o]+'"')});return out}
