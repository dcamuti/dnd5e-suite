/* ================= STORAGE DELLA SUITE =================
   Unico punto di accesso a localStorage: ogni dato ha un nome logico e una sola chiave reale.
   La versione dello schema è in dnd5e_schema; dbMigrate() applica le migrazioni mancanti all'apertura di qualunque tool. */
const STORE={chars:"dnd5e_chars",draft:"dnd5e_draft",lang:"dnd5e_lang",homebrew:"dnd5e_homebrew",npcs:"dnd5e_npcs",
  encSrc:"dnd5e_enc_src",encSaved:"dnd5e_enc_saved",encTrk:"dnd5e_enc_trk",encHb:"dnd5e_enc_hb",
  diary:"dnd5e_diary",puzzles:"dnd5e_puzzles",profile:"dnd5e_profile",world:"dnd5e_world",maps:"dnd5e_maps",lastBackup:"dnd5e_last_backup",ui:"dnd5e_ui",camps:"dnd5e_camps"};
const STORE_RAW=["lang","lastBackup"];/* testo semplice, non JSON */
const DB_SCHEMA=3,DB_SCHEMA_KEY="dnd5e_schema";
/* chiavi delle versioni precedenti → chiave attuale (migrazione 1→2 e ripristino di backup vecchi) */
const STORE_LEGACY={enc_src:"dnd5e_enc_src",enc_saved:"dnd5e_enc_saved",enc_trk:"dnd5e_enc_trk",enc_hb:"dnd5e_enc_hb"};
function dbKey(n){const k=STORE[n];if(!k)throw new Error("Dato di storage sconosciuto: "+n);return k}
function dbGet(n,d){try{const v=localStorage.getItem(dbKey(n));if(v==null)return d;return STORE_RAW.includes(n)?v:JSON.parse(v)}catch(e){return d}}
let DB_WARNED=false,DB_LOCK=false;/* DB_LOCK: durante un cambio di campagna nessuna pagina scrive più (vedi campSwitch) */
function dbSet(n,v){if(DB_LOCK)return true;try{localStorage.setItem(dbKey(n),STORE_RAW.includes(n)?String(v):JSON.stringify(v));return true}
  catch(e){if(!DB_WARNED){DB_WARNED=true;uiAlert("⚠ Spazio di salvataggio del browser pieno: le ultime modifiche non sono state salvate.\n\nFai un 🗄 Backup suite e libera spazio, per esempio eliminando elementi salvati che non usi più.")}return false}}
function dbDel(n){if(DB_LOCK)return;try{localStorage.removeItem(dbKey(n))}catch(e){}}
function dbSchema(){const v=parseInt(localStorage.getItem(DB_SCHEMA_KEY),10);return v>0?v:1}
/* ---- campagne ----
   La campagna attiva sta nelle chiavi normali, così i tool la leggono come sempre. Le altre sono «parcheggiate»: ciascuna in una
   chiave dnd5e_camp_<id> che contiene i valori grezzi delle sue chiavi. Cambiare campagna scambia i due gruppi (campSwitch).
   Sono comuni a tutte le campagne: lingua, contenuti homebrew, fonti scelte, preferenze dell'interfaccia, data dell'ultimo
   backup e libreria immagini. Il registro dnd5e_camps è {cur:<id>, list:[{id,name,created}]}. */
const CAMP_DATA=["chars","draft","npcs","encSaved","encTrk","diary","puzzles","profile","world","maps"];
const CAMP_PARK="dnd5e_camp_",CAMP_NAME_DEF="La mia campagna";
const campName=v=>String(v??"").replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,40);
function campReg(){let r=null;try{r=JSON.parse(localStorage.getItem(STORE.camps))}catch(e){}
  const ok=r&&typeof r==="object"&&Array.isArray(r.list);
  const list=ok?r.list.filter(c=>c&&/^[\w-]+$/.test(c.id||"")).map(c=>({id:c.id,name:campName(c.name)||CAMP_NAME_DEF,created:typeof c.created==="string"?c.created:""})):[];
  if(list.length&&list.some(c=>c.id===r.cur))return{cur:r.cur,list};
  /* registro assente o rovinato: i dati presenti diventano la campagna attiva */
  const c=list[0]||{id:newId("cmp"),name:CAMP_NAME_DEF,created:new Date().toISOString()},out={cur:c.id,list:list.length?list:[c]};
  try{localStorage.setItem(STORE.camps,JSON.stringify(out))}catch(e){}return out}
const DB_MIGRATIONS={
  /* 1→2: chiavi degli Incontri sotto il prefisso dnd5e_, con copia dei valori originali in dnd5e_migr_v2 */
  2(){const snap={};for(const o in STORE_LEGACY){const v=localStorage.getItem(o);if(v!=null)snap[o]=v}
    if(Object.keys(snap).length&&localStorage.getItem("dnd5e_migr_v2")==null)localStorage.setItem("dnd5e_migr_v2",JSON.stringify({date:new Date().toISOString(),store:snap}));
    for(const o in snap){const n=STORE_LEGACY[o];if(localStorage.getItem(n)==null)localStorage.setItem(n,snap[o]);if(localStorage.getItem(n)!=null)localStorage.removeItem(o)}},
  /* 2→3: registro delle campagne; i dati esistenti diventano la prima campagna, senza spostare nulla */
  3(){campReg()}
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
