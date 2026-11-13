/* ================= STORAGE DELLA SUITE =================
   Unico punto di accesso a localStorage: ogni dato ha un nome logico e una sola chiave reale.
   La versione dello schema è in dnd5e_schema; dbMigrate() applica le migrazioni mancanti all'apertura di qualunque tool. */
const STORE={chars:"dnd5e_chars",draft:"dnd5e_draft",lang:"dnd5e_lang",homebrew:"dnd5e_homebrew",npcs:"dnd5e_npcs",
  encSrc:"dnd5e_enc_src",encSaved:"dnd5e_enc_saved",encTrk:"dnd5e_enc_trk",encHb:"dnd5e_enc_hb",
  diary:"dnd5e_diary",puzzles:"dnd5e_puzzles",profile:"dnd5e_profile",world:"dnd5e_world",maps:"dnd5e_maps",lastBackup:"dnd5e_last_backup",ui:"dnd5e_ui"};
const STORE_RAW=["lang","lastBackup"];/* testo semplice, non JSON */
const DB_SCHEMA=2,DB_SCHEMA_KEY="dnd5e_schema";
/* chiavi delle versioni precedenti → chiave attuale (migrazione 1→2 e ripristino di backup vecchi) */
const STORE_LEGACY={enc_src:"dnd5e_enc_src",enc_saved:"dnd5e_enc_saved",enc_trk:"dnd5e_enc_trk",enc_hb:"dnd5e_enc_hb"};
function dbKey(n){const k=STORE[n];if(!k)throw new Error("Dato di storage sconosciuto: "+n);return k}
function dbGet(n,d){try{const v=localStorage.getItem(dbKey(n));if(v==null)return d;return STORE_RAW.includes(n)?v:JSON.parse(v)}catch(e){return d}}
let DB_WARNED=false;
function dbSet(n,v){try{localStorage.setItem(dbKey(n),STORE_RAW.includes(n)?String(v):JSON.stringify(v));return true}
  catch(e){if(!DB_WARNED){DB_WARNED=true;uiAlert("⚠ Spazio di salvataggio del browser pieno: le ultime modifiche non sono state salvate.\n\nFai un 🗄 Backup suite e libera spazio, per esempio eliminando elementi salvati che non usi più.")}return false}}
function dbDel(n){try{localStorage.removeItem(dbKey(n))}catch(e){}}
function dbSchema(){const v=parseInt(localStorage.getItem(DB_SCHEMA_KEY),10);return v>0?v:1}
const DB_MIGRATIONS={
  /* 1→2: chiavi degli Incontri sotto il prefisso dnd5e_, con copia dei valori originali in dnd5e_migr_v2 */
  2(){const snap={};for(const o in STORE_LEGACY){const v=localStorage.getItem(o);if(v!=null)snap[o]=v}
    if(Object.keys(snap).length&&localStorage.getItem("dnd5e_migr_v2")==null)localStorage.setItem("dnd5e_migr_v2",JSON.stringify({date:new Date().toISOString(),store:snap}));
    for(const o in snap){const n=STORE_LEGACY[o];if(localStorage.getItem(n)==null)localStorage.setItem(n,snap[o]);if(localStorage.getItem(n)!=null)localStorage.removeItem(o)}}
};
function dbMigrate(){try{
  let v=dbSchema();
  if(v>DB_SCHEMA){console.warn("Suite D&D 5E: dati creati da una versione più recente della suite (schema "+v+")");return}
  for(let x=v+1;x<=DB_SCHEMA;x++){DB_MIGRATIONS[x]();localStorage.setItem(DB_SCHEMA_KEY,String(x));v=x}
  /* chiavi vecchie ricomparse (es. una scheda rimasta aperta con il codice precedente): recuperate solo se la chiave nuova manca */
  for(const o in STORE_LEGACY){const val=localStorage.getItem(o);if(val==null)continue;
    if(localStorage.getItem(STORE_LEGACY[o])==null){localStorage.setItem(STORE_LEGACY[o],val);localStorage.removeItem(o)}
    else console.warn("Suite D&D 5E: trovata la vecchia chiave "+o+" accanto a "+STORE_LEGACY[o]+": lasciata intatta.")}
}catch(e){console.error("Suite D&D 5E: migrazione dello storage non riuscita",e)}}
dbMigrate();
