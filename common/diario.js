const DIARY_KEEP=["att","note"];
const SRC_SELF=["npc","fz"];/* origini in cui la voce rappresenta l'elemento stesso: si riconosce anche se il nome è cambiato */
let DIARY_Q=null;
function diaryFind(D,kind,item,src){const key=kind==="hooks"?"text":"name",nm=x=>(x&&x[key]||"").trim().toLowerCase(),v=nm(item);
  if(src&&src.t&&src.id){const same=D[kind].filter(x=>x&&x.src&&x.src.t===src.t&&x.src.id===src.id);
    const byKey=same.find(x=>nm(x)===v);if(byKey)return byKey;
    if(SRC_SELF.includes(src.t)&&same.length===1)return same[0];
    return D[kind].find(x=>x&&!x.src&&nm(x)===v)||null}
  return D[kind].find(x=>nm(x)===v)||null}
function diaryApply(D,kind,item,src,upd){
  if(kind==="session"){if(D.sessions.length)D.sessions[0].text=(D.sessions[0].text?D.sessions[0].text+"\n\n":"")+item;
    else D.sessions.unshift({id:newId("ses"),date:new Date().toISOString().slice(0,10),title:"Sessione 1",text:item});return"added"}
  if(src&&src.t&&src.id)item=Object.assign({},item,{src:{t:src.t,id:src.id}});
  const ex=diaryFind(D,kind,item,src);
  if(ex){if(!upd)return"skipped";const keep={id:ex.id};
    DIARY_KEEP.forEach(f=>{if(ex[f]!=null&&String(ex[f]).trim()!=="")keep[f]=ex[f]});if("done" in ex)keep.done=ex.done;
    Object.assign(ex,item,keep);return"updated"}
  D[kind].unshift(Object.assign({id:newId({npcs:"dnpc",places:"plc",hooks:"hok"}[kind])},kind==="hooks"?{done:false}:{},item));return"added"}
/* invii raggruppati (es. un insediamento con luogo, agganci e PNG): una sola domanda per tutte le voci già presenti */
function diaryBegin(){DIARY_Q=[]}
async function diaryEnd(){const q=DIARY_Q||[];DIARY_Q=null;let D=diaryLoad();const res={added:0,updated:0,skipped:0};
  const dup=q.filter(([k,it,s])=>k!=="session"&&diaryFind(D,k,it,s)).length;
  const upd=dup?await uiConfirm(`${dup===1?"Una voce è già":dup+" voci sono già"} nel Diario. Atteggiamento e note scritte nel Diario restano come sono.`,{title:"📖 Già nel Diario",yes:dup===1?"Aggiorna la voce":"Aggiorna le voci",no:"Lascia com'è"}):false;
  if(dup)D=diaryLoad();
  q.forEach(([k,it,s])=>{res[diaryApply(D,k,it,s,upd)]++});
  if(res.added||res.updated)diarySave(D);return res}
function toDiary(kind,item,src){if(DIARY_Q){DIARY_Q.push([kind,item,src]);return"queued"}
  diaryBegin();toDiary(kind,item,src);return diaryEnd().then(r=>r.added?"added":r.updated?"updated":"skipped")}
