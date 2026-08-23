import React,{useMemo} from "react";
import {sortWorkersPlanning} from "../utils/planningOrder";

const parseDate=v=>{if(!v)return null;if(v instanceof Date)return new Date(v);const s=String(v);if(s.includes("/")){const[d,m,y]=s.split("/");return new Date(+y,+m-1,+d)}if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const[y,m,d]=s.split("-");return new Date(+y,+m-1,+d)}return new Date(s)};
const contrast=hex=>{const m=String(hex||"").match(/^#([0-9a-f]{6})$/i);if(!m)return"#fff";const n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;const lum=.2126*r+.7152*g+.0722*b;return lum>150?"#111827":"#fff"};
export const GanttChart=({ouvriers,chantiers,affectations,onAffectationClick,onAddAffectation,onControlsReady})=>{
 const workers=sortWorkersPlanning(ouvriers.filter(o=>o.statut==="Actif"));
 const days=useMemo(()=>{const t=new Date();t.setHours(0,0,0,0);const d=t.getDay(),m=new Date(t);m.setDate(t.getDate()-(d===0?6:d-1));const a=[];for(let i=0;i<15;i++){const x=new Date(m);x.setDate(m.getDate()+Math.floor(i/5)*7+(i%5));a.push(x)}return a},[]);
 React.useEffect(()=>{onControlsReady?.({onToday:()=>{},onPast:()=>{},weekText:"3 semaines visibles"})},[onControlsReady]);
 const colorMap=["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#f97316","#6366f1","#14b8a6"];
 const colorFor=c=>c?.couleur||colorMap[Math.abs(Number(c?.id)||0)%colorMap.length];
 const visible=(a,d)=>{const s=parseDate(a.dateDebut),e=parseDate(a.dateFin);if(!s||!e)return false;const x=new Date(d);x.setHours(12,0,0,0);s.setHours(0,0,0,0);e.setHours(23,59,59,999);return x>=s&&x<=e};
 return <div style={{padding:4,overflow:"auto",flex:1}}><div style={{display:"grid",gridTemplateColumns:"110px repeat(15,minmax(58px,1fr))",minWidth:980,border:"1px solid #cbd5e1"}}>
  <div style={{padding:8,fontWeight:800,background:"#e5e7eb",borderRight:"1px solid #cbd5e1"}}>Ouvriers</div>{days.map((d,i)=><div key={i} style={{padding:"7px 2px",textAlign:"center",fontSize:10,fontWeight:800,background:"#e5e7eb",borderRight:i%5===4?"3px solid #1e3a8a":"1px solid #d1d5db"}}>{["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][d.getDay()]} {String(d.getDate()).padStart(2,"0")}</div>)}
  {workers.flatMap((o,ri)=>{const rowbg=ri%2?"#f8fafc":"#fff";const cells=[<div key={`${o.id}-name`} style={{padding:8,fontWeight:800,background:rowbg,borderTop:ri===0?"2px solid #1e3a8a":"1px solid #e5e7eb",borderRight:"1px solid #cbd5e1"}}>{o.nom}</div>];days.forEach((d,i)=>{const list=affectations.filter(a=>Number(a.ouvrierID)===Number(o.id)&&visible(a,d));cells.push(<div key={`${o.id}-${i}`} onDoubleClick={()=>onAddAffectation?.(o.id,d)} style={{minHeight:32,padding:2,background:rowbg,borderTop:ri===0?"2px solid #1e3a8a":"1px solid #e5e7eb",borderRight:i%5===4?"3px solid #1e3a8a":"1px solid #d1d5db"}}>{list.map(a=>{const c=chantiers.find(x=>Number(x.id)===Number(a.chantierId));const bg=colorFor(c);const label=(c?.nom||a.nomExterne||a.affectationNom||"Affectation").toUpperCase();return <div key={a.id} onDoubleClick={e=>{e.stopPropagation();onAffectationClick?.(a)}} style={{background:bg,color:contrast(bg),fontSize:9,fontWeight:800,borderRadius:3,padding:"3px 2px",marginBottom:2,textAlign:"center",overflow:"hidden",whiteSpace:"nowrap"}}>{label}</div>})}</div>)});return cells})}
 </div></div>
};
