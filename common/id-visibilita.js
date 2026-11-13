function jsa(s){return JSON.stringify(String(s??"")).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}
/* ID univoci e stabili: tipo_tempo_casuale, es. npc_mvtd9yx6_k3f9q2ab. Tipi: pc npc enc trk fx ses dnpc plc hok xp pz wld fz hb dun */
function newId(t){const a=new Uint8Array(8),c="0123456789abcdefghijklmnopqrstuvwxyz";
  if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(let i=0;i<8;i++)a[i]=Math.floor(Math.random()*256);
  return(t?t+"_":"")+Date.now().toString(36)+"_"+Array.from(a,b=>c[b%36]).join("")}
/* ================= VISIBILITÀ E PROPRIETÀ =================
   vis: "dm" (solo il master) o "all" (anche i giocatori) · own: "dm" o "pc:<id della scheda>".
   Campi facoltativi: se mancano vale il predefinito del tipo, quindi i dati esistenti sono già validi. */
const VIS_DEF={pc:"all",trk:"all",npc:"dm",hb:"dm",enc:"dm",dnpc:"dm",plc:"dm",hok:"dm",ses:"dm",wld:"dm",fz:"dm",pz:"dm"};
/* campi che restano riservati al master anche quando l'entità è visibile ("lista[].campo" per gli elenchi) */
const DM_FIELDS={npc:["segreto","fazione.ruolo"],wld:["segreto","voci[].v","tesoro","colpi"],pz:["dm"],
  hb:["ac","hp","ab","sv","sk","vul","res","imm","cim","tr","act","rea","leg"],trk:["sub","ac","hp","hpMax","thp","dsS","dsF"]};
function visOf(t,o){return o&&(o.vis==="dm"||o.vis==="all")?o.vis:(VIS_DEF[t]||"dm")}
function ownerOf(t,o){if(o&&typeof o.own==="string"&&(o.own==="dm"||/^pc:[\w-]+$/.test(o.own)))return o.own;
  if(t==="pc"&&o&&o.id)return"pc:"+o.id;if(t==="trk"&&o&&o.pc&&o.charId)return"pc:"+o.charId;return"dm"}
/* versione "per i giocatori" di un'entità: null se nascosta, altrimenti una copia senza i campi riservati */
function forPlayers(t,o){if(!o||visOf(t,o)!=="all")return null;const c=JSON.parse(JSON.stringify(o));
  (DM_FIELDS[t]||[]).forEach(path=>{const del=(obj,parts)=>{if(!obj||typeof obj!=="object")return;const [h,...r]=parts;
      if(h.endsWith("[]")){const a=obj[h.slice(0,-2)];if(Array.isArray(a))a.forEach(x=>del(x,r));return}
      if(!r.length)delete obj[h];else del(obj[h],r)};del(c,path.split("."))});
  return c}
