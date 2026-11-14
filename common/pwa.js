/* ================= USO SENZA CONNESSIONE (uguale in tutti i tool) =================
   Il service worker (sw.js nella radice) conserva una copia di tutte le pagine: dopo la prima visita la suite si apre anche offline.
   Funziona solo su https (o in locale con un server): aprendo i file direttamente dal disco non viene registrato.
   Si chiede anche al browser di non cancellare da solo i dati della suite quando lo spazio scarseggia. */
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register(SUITE_ROOT+"sw.js").catch(()=>{});
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persisted().then(p=>{if(!p)navigator.storage.persist().catch(()=>{})}).catch(()=>{})}catch(e){}}
const pwaReady=()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller);
