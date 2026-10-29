/* Rigenera l'indice ridotto dei mostri usato dall'editor di mappe a partire dal bestiario degli Incontri.
   Uso (dalla radice del repository):  node tools/build-monster-index.js
   Sostituisce il contenuto tra i marcatori MONSTER_INDEX in maps/index.html. */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.join(__dirname,"..");
const enc=fs.readFileSync(path.join(root,"encounters/index.html"),"utf8");
const a=enc.indexOf("const MONSTERS=[");if(a<0)throw new Error("MONSTERS non trovato negli Incontri");
let i=enc.indexOf("[",a),depth=0,inStr=null,esc=false,end=-1;
for(;i<enc.length;i++){const ch=enc[i];
  if(inStr){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch===inStr)inStr=null;continue}
  if(ch==='"'||ch==="'"||ch==="`"){inStr=ch;continue}
  if(ch==="/"&&enc[i+1]==="*"){i=enc.indexOf("*/",i+2)+1;continue}
  if(ch==="[")depth++;else if(ch==="]"){depth--;if(!depth){end=i;break}}}
const list=vm.runInNewContext("("+enc.slice(enc.indexOf("[",a),end+1)+")");
const hpAvg=h=>{const m=/^\s*(\d+)/.exec(String(h||""));return m?+m[1]:0};
/* [nome inglese, nome italiano, GS, taglia, tipo, CA, PF medi] */
const idx=list.filter(m=>m&&m.n).map(m=>[m.n,m.it||m.n,String(m.cr),m.sz||"",(m.tp||"").replace(/\s+/g," ").trim(),parseInt(m.ac,10)||0,hpAvg(m.hp)]);
const maps=path.join(root,"maps/index.html");let html=fs.readFileSync(maps,"utf8");
const S="/* MONSTER_INDEX_START (generato da tools/build-monster-index.js: non modificare a mano) */",E="/* MONSTER_INDEX_END */";
const out=S+"\nconst MON_INDEX="+JSON.stringify(idx)+";\n"+E;
if(html.includes(S))html=html.slice(0,html.indexOf(S))+out+html.slice(html.indexOf(E)+E.length);
else throw new Error("Marcatori MONSTER_INDEX non trovati in maps/index.html");
fs.writeFileSync(maps,html);console.log("Indice aggiornato: "+idx.length+" mostri, "+Math.round(out.length/1024)+" KB");
