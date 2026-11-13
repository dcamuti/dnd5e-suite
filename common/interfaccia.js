/* ================= SEZIONI COMPRIMIBILI (uguale in tutti i tool) =================
   Un contenitore con data-collapse="chiave" si apre e chiude cliccando il suo titolo (h2); lo stato resta in dnd5e_ui. */
function collapseInit(){const st=uiPrefGet("collapsed",{})||{},page=(location.pathname.split("/").filter(Boolean).slice(-2,-1)[0])||"home";
  document.querySelectorAll("[data-collapse]").forEach(sec=>{const h=sec.querySelector(":scope>h2");if(!h||h.dataset.cl)return;h.dataset.cl="1";
    const key=page+":"+sec.dataset.collapse;h.classList.add("cl-head");h.setAttribute("role","button");h.tabIndex=0;
    const ind=document.createElement("span");ind.className="cl-ind";ind.setAttribute("aria-hidden","true");ind.textContent="▾";h.appendChild(ind);
    const set=c=>{sec.classList.toggle("collapsed",c);h.setAttribute("aria-expanded",String(!c));h.title=c?"Mostra la sezione":"Nascondi la sezione"};set(!!st[key]);
    const tog=()=>{const c=!sec.classList.contains("collapsed");set(c);const s2=uiPrefGet("collapsed",{})||{};if(c)s2[key]=1;else delete s2[key];uiPrefSet("collapsed",s2)};
    h.addEventListener("click",e=>{if(e.target.closest("a,button,input,select,label"))return;tog()});
    h.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();tog()}})})}
collapseInit();
/* ================= CONTROLLI CLICCABILI ACCESSIBILI (uguale in tutti i tool) =================
   Gli elementi con onclick che non sono già pulsanti o link diventano raggiungibili con Tab e attivabili con Invio o Spazio;
   quelli fatti di sola icona ricevono un nome leggibile dagli screen reader. Vale anche per i contenuti creati dopo. */
const A11Y_ICON={"✕":"Rimuovi","×":"Rimuovi","🗑":"Elimina","👁":"Nascondi ai giocatori","🙈":"Mostra ai giocatori","↗":"Apri l'originale","⧉":"Duplica",
  "−":"Diminuisci","-":"Diminuisci","+":"Aumenta","＋":"Aumenta","🎲":"Rigenera","ⓘ":"Informazioni","ℹ":"Informazioni","✎":"Modifica","✏️":"Modifica"};
const A11Y_SKIP=/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|OPTION|BODY|HTML|SUMMARY)$/;
function a11yFix(root){if(!root||!root.querySelectorAll)return;
  const list=root.matches&&root.matches("[onclick]")?[root,...root.querySelectorAll("[onclick]")]:[...root.querySelectorAll("[onclick]")];
  list.forEach(el=>{if(A11Y_SKIP.test(el.tagName)||el.dataset.a11y)return;el.dataset.a11y="1";
    if(el.querySelector("button,input,select,textarea,a[href],[onclick]"))return;
    if(!/^(TR|TD|TH|LI)$/.test(el.tagName)&&!el.hasAttribute("role"))el.setAttribute("role","button");
    if(!el.hasAttribute("tabindex"))el.tabIndex=0;
    const t=(el.textContent||"").trim();if(!el.getAttribute("aria-label")&&[...t].length<=2){const l=el.title||A11Y_ICON[t];if(l)el.setAttribute("aria-label",l)}})}
document.addEventListener("keydown",e=>{const el=e.target;if(e.key!=="Enter"&&e.key!==" ")return;
  if(!el||!el.dataset||el.dataset.a11y!=="1"||A11Y_SKIP.test(el.tagName))return;e.preventDefault();el.click()});
a11yFix(document.body);
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)a11yFix(n)}).observe(document.body,{childList:true,subtree:true});
/* su schermi stretti la barra dei tool scorre: il tool attivo viene portato in vista */
(function(){const w=document.querySelector(".sn-tools"),on=w&&w.querySelector("a.on");if(w&&on&&w.scrollWidth>w.clientWidth)w.scrollLeft=Math.max(0,on.offsetLeft-w.offsetLeft-60)})();
