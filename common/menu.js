/* ================= MENU ⋯ / ⚙ DATI E PROMEMORIA DEL BACKUP (uguale in tutti i tool) ================= */
function hmCloseAll(){document.querySelectorAll(".hmenu.open").forEach(m=>{m.classList.remove("open");const b=m.querySelector(":scope>.btn");if(b)b.setAttribute("aria-expanded","false")})}
function hmToggle(btn,ev){if(ev)ev.stopPropagation();const m=btn.closest(".hmenu"),open=!m.classList.contains("open");hmCloseAll();if(!open)return;
  m.classList.add("open");btn.setAttribute("aria-expanded","true");if(m.id==="snData")renderDataMenu();
  if(ev&&ev.detail===0){const f=m.querySelector(".mi-it");if(f)f.focus()}}
document.addEventListener("click",e=>{if(!e.target.closest(".hmenu>.btn")&&!e.target.closest(".mi-note"))hmCloseAll()});
document.addEventListener("keydown",e=>{const m=document.querySelector(".hmenu.open");if(!m)return;
  if(e.key==="Escape"){hmCloseAll();const b=m.querySelector(":scope>.btn");if(b)b.focus();e.preventDefault();e.stopPropagation();return}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){const it=[...m.querySelectorAll(".mi-it")];if(!it.length)return;const i=it.indexOf(document.activeElement);
    it[e.key==="ArrowDown"?(i+1)%it.length:(i-1+it.length)%it.length].focus();e.preventDefault();e.stopPropagation()}},true);
/* un'etichetta con un campo file si attiva anche da tastiera */
function hmFileKey(e,el){if(e.key==="Enter"||e.key===" "){e.preventDefault();const i=el.querySelector("input[type=file]");if(i)i.click()}}
const BACKUP_WARN_DAYS=30;
function lastBackupDays(){const v=dbGet("lastBackup",null);const t=v?Date.parse(v):NaN;return isNaN(t)?null:Math.floor((Date.now()-t)/86400000)}
function suiteHasData(){return SUITE_KEYS.some(k=>k!==STORE.lang&&k!==STORE.lastBackup&&k!==STORE.camps&&localStorage.getItem(k)!=null)||campReg().list.length>1}
function dataBadge(){const el=document.getElementById("snData");if(!el)return;const d=lastBackupDays(),warn=suiteHasData()&&(d===null||d>=BACKUP_WARN_DAYS);
  el.classList.toggle("warn",warn);const b=el.querySelector(":scope>.btn");
  /* con più campagne il pulsante mostra quella attiva */
  const r=campReg(),l=el.querySelector(":scope>.btn .lbl");if(l)l.textContent=r.list.length>1?campCur().name:"Dati";
  if(b)b.title=(r.list.length>1?"Campagna «"+campCur().name+"» · ":"")+(warn?(d===null?"Non hai ancora fatto un backup dei dati della suite":`L'ultimo backup risale a ${d} giorni fa`):"Backup, ripristino e campagne")}
function renderDataMenu(){renderCampMenu();const i=document.getElementById("snDataInfo");if(!i)return;const d=lastBackupDays();
  const quando=d===null?"<b>mai</b>":d===0?"<b>oggi</b>":d===1?"<b>ieri</b>":`<b>${d} giorni fa</b>`;
  i.innerHTML=`Ultimo backup: ${quando}`+(suiteHasData()&&(d===null||d>=BACKUP_WARN_DAYS)?" · è consigliato farne uno":"")+(pwaReady()?"<br>✔ Disponibile anche senza connessione":"")}
dataBadge();
/* preferenze di interfaccia (sezioni aperte, schede scelte…): una sola chiave, dnd5e_ui */
function uiPrefGet(k,d){const o=dbGet("ui",{})||{};return Object.prototype.hasOwnProperty.call(o,k)?o[k]:d}
function uiPrefSet(k,v){const o=dbGet("ui",{})||{};o[k]=v;dbSet("ui",o)}
