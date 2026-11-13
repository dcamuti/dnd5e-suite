/* ================= DATI ESTERNI (file importati, link condivisi, backup) =================
   Tutto ciò che arriva da fuori viene ripulito prima di entrare nella suite:
   niente markup, virgolette o entità che possano "uscire" dagli attributi HTML;
   gli id vengono ridotti a caratteri sicuri. Solo i campi player/dm degli enigmi
   possono contenere HTML, che passa da un filtro a lista bianca. */
/*#if puzzles*/
const PZ_ALLOW=true;
/*#else*/
const PZ_ALLOW=false;
/*#endif*/
const PZ_HTML_KEYS=["player","dm"];
function cleanHtml(html){
  try{const doc=new DOMParser().parseFromString("<body>"+(html||"")+"</body>","text/html");
    doc.body.querySelectorAll("script,iframe,object,embed,link,meta,base,form,frame,frameset,noscript,template,style").forEach(n=>n.remove());
    doc.body.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(a=>{
      const n=a.name.toLowerCase(),v=(a.value||"").replace(/[\s\u0000-\u001f]/g,"").toLowerCase();
      const urlAttr=["href","src","xlink:href","action","formaction","background","poster"].includes(n);
      if(n.startsWith("on")||n==="srcdoc"||(urlAttr&&(v.startsWith("javascript:")||v.startsWith("vbscript:")||(v.startsWith("data:")&&!v.startsWith("data:image/")))))el.removeAttribute(a.name)}));
    return doc.body.innerHTML}catch(e){return String(html||"").replace(/[<>]/g,"")}}
/* testo importato (file, backup, link): si tolgono solo < e > (niente tag); virgolette e & restano come scritti */
function cleanStr(v){return v.replace(/[<>]/g,"")}
function safeParse(txt,allowPzHtml){
  return JSON.parse(txt,(k,v)=>{
    if(typeof v!=="string")return v;
    if(allowPzHtml&&PZ_HTML_KEYS.includes(k))return cleanHtml(v);
    if(k==="id")return v.replace(/[^\w-]/g,"");
    return cleanStr(v)})}
/* valore di una chiave del backup: è JSON (tranne la lingua, che è testo semplice) */
function safeStoreVal(k,v){try{return JSON.stringify(safeParse(v,k==="dnd5e_puzzles"))}catch(e){return String(v).replace(/[^\w-]/g,"")}}
/* stringa come argomento JS dentro un attributo HTML tra virgolette, es. onclick="f(${jsa(nome)})": regge apostrofi, virgolette, & e < */
