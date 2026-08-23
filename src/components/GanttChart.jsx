import React, { useRef, useState } from "react";
import { getWorkerSeparators, normalizeWorkerName, sortWorkersPlanning } from "../utils/planningOrder";

export const GanttChart = ({ ouvriers, chantiers, affectations, onAffectationClick, onAddAffectation, onControlsReady }) => {
  const mobileMediaQuery = "(max-width: 1100px) and (pointer: coarse)";
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(mobileMediaQuery).matches);
  const [pastWeeks, setPastWeeks] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const [highlightedAffectationId, setHighlightedAffectationId] = useState(null);
  const scrollRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastTapRef = useRef({ key:"", time:0 });
  const mouseDragRef = useRef({ active:false, moved:false, startX:0, scrollLeft:0 });
  const suppressClickRef = useRef(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(mobileMediaQuery);
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) media.addEventListener("change", update); else media.addListener(update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", update); else media.removeListener(update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      setViewport({ width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const colorMap = {
    1:"#3b82f6", 2:"#10b981", 3:"#f59e0b", 4:"#ef4444", 5:"#8b5cf6",
    6:"#06b6d4", 7:"#ec4899", 8:"#f97316", 9:"#6366f1", 10:"#14b8a6"
  };
  const rdvColor = "#7c3aed";
  const planningColor = "#0f766e";
  const normalize = value => String(value ?? "").trim().toUpperCase();
  const isPlanning = aff => normalize(aff?.nomExterne || aff?.affectationNom || aff?.tache) === "PLANNING";
  const isRdvTask = aff => /^\s*RDV\b/i.test(String(aff?.tache ?? ""));
  const isValidChantier = chantier => chantier && String(chantier.nom ?? "").trim() !== "" && String(chantier.nom ?? "").trim() !== "??";
  const isHorsGantt = (aff, chantier) => !isValidChantier(chantier) || normalize(aff?.typeAffectation) === "HORS_GANTT" || (normalize(aff?.source) === "GOOGLE" && normalize(aff?.typeAffectation) === "HORS_GANTT");
  const getChantierColor = chantierId => {
    const chantier = chantiers.find(c => Number(c.id) === Number(chantierId));
    const couleurManuelle = String(chantier?.couleur || "").trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(couleurManuelle)) return couleurManuelle;
    if (colorMap[chantierId]) return colorMap[chantierId];
    const colors = Object.values(colorMap);
    const numericId = Number(chantierId);
    return !numericId || Number.isNaN(numericId) ? colors[0] : colors[numericId % colors.length];
  };
  const contrastColor = hex => {
    const match=String(hex||"").match(/^#([0-9a-f]{6})$/i);
    if(!match) return "#fff";
    const value=parseInt(match[1],16),r=(value>>16)&255,g=(value>>8)&255,b=value&255;
    const lum=.2126*r+.7152*g+.0722*b;
    return lum>150?"#111827":"#fff";
  };
  const getLetters = (aff, chantier) => isHorsGantt(aff, chantier) ? "" : String(chantier?.nom ?? "").trim().substring(0,4).toUpperCase();
  const getLabel = aff => {
    const tache = String(aff?.tache ?? "").trim();
    return !tache || normalize(tache) === "ND" ? "" : tache;
  };
  const getRdvTimeLabel = aff => {
    const match = String(aff?.tache ?? "").match(/(\d{1,2})\s*[h:]\s*(\d{2})/i);
    return match ? `${String(match[1]).padStart(2,"0")}h${match[2]}` : "";
  };
  const parseDate = dateStr => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) { const d = new Date(dateStr); return Number.isNaN(d.getTime()) ? null : d; }
    const str = String(dateStr);
    if (str.includes("T")) { const d = new Date(str); return Number.isNaN(d.getTime()) ? null : d; }
    if (str.includes("-")) { const [y,m,d] = str.split("-"); const date = new Date(Number(y), Number(m)-1, Number(d)); return Number.isNaN(date.getTime()) ? null : date; }
    if (str.includes("/")) { const [d,m,y] = str.split("/"); const date = new Date(Number(y), Number(m)-1, Number(d)); return Number.isNaN(date.getTime()) ? null : date; }
    const date = new Date(str); return Number.isNaN(date.getTime()) ? null : date;
  };

  const ouvriersActifs = sortWorkersPlanning(ouvriers.filter(o => o.statut === "Actif"));
  const chantiersActifs = chantiers.filter(c => c.statut === "Actif");
  const futureWeeks = 52;
  const visibleDays = 15;
  const workerColumnWidth = isMobile ? 92 : 150;
  const availableTimelineWidth = Math.max(280, (viewport.width || (typeof window !== "undefined" ? window.innerWidth : 1200)) - workerColumnWidth - 2);
  const dayWidth = Math.max(14, availableTimelineWidth / visibleDays);
  const fitTextSize = text => { const length=String(text||"").length; if(dayWidth<27)return length>8?4.5:length>5?5:6; return length>16?5:length>11?6:length>7?7:8; };

  const today = new Date(); today.setHours(0,0,0,0);
  const todayDow = today.getDay();
  const currentMonday = new Date(today); currentMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
  const rangeMonday = new Date(currentMonday); rangeMonday.setDate(currentMonday.getDate() - pastWeeks * 7);
  const allDates = [];
  for (let week=0; week<pastWeeks+futureWeeks; week++) for (let day=0; day<5; day++) { const date=new Date(rangeMonday); date.setDate(rangeMonday.getDate()+week*7+day); allDates.push(date); }
  const rangeStart = allDates[0];
  const rangeEnd = new Date(allDates[allDates.length-1]); rangeEnd.setHours(23,59,59,999);
  const todayScrollLeft = pastWeeks * 5 * dayWidth;
  const isVisibleOnDay=(aff,date)=>{const start=parseDate(aff.dateDebut),end=parseDate(aff.dateFin);if(!start||!end)return false;start.setHours(0,0,0,0);end.setHours(23,59,59,999);const d=new Date(date);d.setHours(12,0,0,0);return d>=start&&d<=end;};
  const scrollToToday = behavior => { const el=scrollRef.current;if(el)el.scrollTo({left:todayScrollLeft,behavior:behavior||"smooth"}); };
  const showPast = () => { setPastWeeks(p=>p+1); window.setTimeout(()=>scrollRef.current?.scrollTo({left:0,behavior:"smooth"}),0); };
  const goToday = () => { setPastWeeks(0); window.setTimeout(()=>scrollRef.current?.scrollTo({left:0,behavior:"smooth"}),0); };

  const findFirstChantierAffectation = query => {
    const searched=normalize(query);
    const chantier=chantiers.find(c=>String(c.id)===String(query)||normalize(c.nom)===searched)||chantiers.find(c=>normalize(c.nom).includes(searched));
    if(!chantier)return {success:false,message:"Chantier introuvable."};
    const candidates=affectations.filter(aff=>{if(Number(aff.chantierId)!==Number(chantier.id))return false;const end=parseDate(aff.dateFin);return end&&end.setHours(23,59,59,999)>=today.getTime();}).sort((a,b)=>{const as=parseDate(a.dateDebut)?.getTime()||Number.MAX_SAFE_INTEGER;const bs=parseDate(b.dateDebut)?.getTime()||Number.MAX_SAFE_INTEGER;return Math.max(as,today.getTime())-Math.max(bs,today.getTime());});
    const found=candidates[0]; if(!found)return {success:false,message:`Aucune affectation de ${chantier.nom} à partir d'aujourd'hui.`};
    const dayIndex=allDates.findIndex(date=>date>=today&&isVisibleOnDay(found,date)); if(dayIndex<0)return {success:false,message:"L'affectation est au-delà de la période affichable."};
    const el=scrollRef.current; const workerIndex=ouvriersActifs.findIndex(o=>Number(o.id)===Number(found.ouvrierID)); if(!el||workerIndex<0)return {success:false,message:"L'ouvrier de cette affectation n'est pas affiché."};
    const row=el.querySelector(`[data-worker-id="${found.ouvrierID}"]`); const left=Math.max(0,dayIndex*dayWidth-dayWidth*2); const top=row?Math.max(0,row.offsetTop-42):el.scrollTop; el.scrollTo({left,top,behavior:"smooth"});
    setHighlightedAffectationId(found.id); window.setTimeout(()=>setHighlightedAffectationId(current=>current===found.id?null:current),2600); return {success:true,affectation:found};
  };

  const handleMouseDown=e=>{if(isMobile||e.button!==0||e.target?.closest?.("button,input,textarea,select,a"))return;const el=scrollRef.current;if(!el)return;mouseDragRef.current={active:true,moved:false,startX:e.clientX,scrollLeft:el.scrollLeft};suppressClickRef.current=false;};
  const handleMouseMove=e=>{if(isMobile)return;const drag=mouseDragRef.current,el=scrollRef.current;if(!drag.active||!el)return;const dx=e.clientX-drag.startX;if(!drag.moved&&Math.abs(dx)<4)return;if(!drag.moved){drag.moved=true;suppressClickRef.current=true;setIsMouseDragging(true);}el.scrollLeft=drag.scrollLeft-dx;e.preventDefault();};
  const endMouseDrag=()=>{const moved=mouseDragRef.current.moved;mouseDragRef.current.active=false;mouseDragRef.current.moved=false;setIsMouseDragging(false);if(moved)window.setTimeout(()=>{suppressClickRef.current=false;},0);};
  const handleEmptyCellDoubleClick=(e,ouvrierId,date)=>{e.stopPropagation();if(!isMobile&&!suppressClickRef.current)onAddAffectation(ouvrierId,date);};
  const handleEmptyCellTouchStart=(e,key)=>{if(!isMobile||e.target!==e.currentTarget||e.touches.length!==1){touchStartRef.current=null;return;}const t=e.touches[0];touchStartRef.current={x:t.clientX,y:t.clientY,key};};
  const handleEmptyCellTouchEnd=(e,ouvrierId,date,key)=>{if(!isMobile||e.target!==e.currentTarget)return;const start=touchStartRef.current;touchStartRef.current=null;const t=e.changedTouches?.[0];if(!start||!t||start.key!==key||Math.hypot(t.clientX-start.x,t.clientY-start.y)>10)return;const now=Date.now(),last=lastTapRef.current;if(last.key===key&&now-last.time<=350){lastTapRef.current={key:"",time:0};e.preventDefault();onAddAffectation(ouvrierId,date);}else lastTapRef.current={key,time:now};};
  const handleAffectationDoubleClick=(e,aff)=>{e.stopPropagation();if(!isMobile&&!suppressClickRef.current)onAffectationClick(aff);};
  const handleAffectationTouchStart=(e,key)=>{if(!isMobile||e.touches.length!==1){touchStartRef.current=null;return;}const t=e.touches[0];touchStartRef.current={x:t.clientX,y:t.clientY,key};};
  const handleAffectationTouchEnd=(e,aff,key)=>{if(!isMobile)return;const start=touchStartRef.current;touchStartRef.current=null;const t=e.changedTouches?.[0];if(!start||!t||start.key!==key||Math.hypot(t.clientX-start.x,t.clientY-start.y)>10)return;const now=Date.now(),last=lastTapRef.current;if(last.key===key&&now-last.time<=350){lastTapRef.current={key:"",time:0};e.preventDefault();e.stopPropagation();onAffectationClick(aff);}else lastTapRef.current={key,time:now};};

  React.useEffect(()=>{const timer=window.setTimeout(()=>scrollToToday("auto"),0);return()=>window.clearTimeout(timer);},[isMobile,dayWidth]);
  React.useEffect(()=>{if(onControlsReady)onControlsReady({onToday:goToday,onPast:showPast,onFindChantier:findFirstChantierAffectation,searchChantiers:chantiersActifs.map(c=>({id:c.id,nom:c.nom})),weekText:"3 semaines visibles"});},[onControlsReady,isMobile,pastWeeks,dayWidth,affectations,chantiers]);
  React.useEffect(()=>{if(isMobile||typeof window==="undefined")return;const onKeyDown=e=>{const tag=e.target?.tagName?.toLowerCase();if(tag==="input"||tag==="textarea"||tag==="select"||e.target?.isContentEditable||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;const el=scrollRef.current;if(!el)return;e.preventDefault();const hs=5*dayWidth,vs=100;if(e.key==="ArrowRight")el.scrollBy({left:hs,behavior:"smooth"});if(e.key==="ArrowLeft")el.scrollBy({left:-hs,behavior:"smooth"});if(e.key==="ArrowDown")el.scrollBy({top:vs,behavior:"smooth"});if(e.key==="ArrowUp")el.scrollBy({top:-vs,behavior:"smooth"});};window.addEventListener("keydown",onKeyDown);return()=>window.removeEventListener("keydown",onKeyDown);},[isMobile,dayWidth]);

  const dayLabel=date=>`${["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][date.getDay()]} ${String(date.getDate()).padStart(2,"0")}`;
  const months=["JANVIER","FÉVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOÛT","SEPTEMBRE","OCTOBRE","NOVEMBRE","DÉCEMBRE"];
  const monthGroups=allDates.reduce((arr,date,index)=>{const key=`${date.getFullYear()}-${date.getMonth()}`,last=arr[arr.length-1];if(last&&last.key===key)last.count++;else arr.push({key,start:index,count:1,label:months[date.getMonth()]});return arr;},[]);
  const workerSeparators=new Set(getWorkerSeparators(ouvriers));
  const headerHeight=isMobile?42:52,monthHeight=isMobile?15:19,dayHeaderHeight=headerHeight-monthHeight,rowHeight=isMobile?25:27;
  const timelineWidth=allDates.length*dayWidth,totalWidth=workerColumnWidth+timelineWidth,columns=`repeat(${allDates.length}, ${dayWidth}px)`;
  const borderRight=i=>(i+1)%5===0&&i<allDates.length-1?"3px solid #1e3a8a":i<allDates.length-1?"1px solid #d1d5db":"none";
  const activeLegend=chantiersActifs.filter(c=>!["RDV","PLANNING"].includes(normalize(c.nom)));

  return <div style={{padding:isMobile?"0.12rem":"0.45rem",flex:1,display:"flex",flexDirection:"column",minWidth:0,minHeight:0}}>
    <style>{`.gantt-scroll::-webkit-scrollbar{width:0;height:${isMobile?0:10}px}.gantt-scroll::-webkit-scrollbar-thumb{background:#9ca3af;border-radius:999px}.gantt-scroll::-webkit-scrollbar-track{background:#f3f4f6}.gantt-scroll{scrollbar-width:${isMobile?"none":"auto"}}`}</style>
    <div style={{display:"flex",gap:isMobile?"0.45rem":"0.8rem",alignItems:"center",flexWrap:"nowrap",overflowX:"auto",padding:isMobile?"0.18rem 0.3rem":"0.35rem 0.4rem",marginBottom:isMobile?"0.12rem":"0.3rem",background:"rgba(255,255,255,0.5)",borderRadius:4,fontSize:isMobile?9:10,lineHeight:1.1,flexShrink:0}}>
      {activeLegend.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}><div style={{width:8,height:8,backgroundColor:getChantierColor(c.id),borderRadius:2}}/><span style={{color:"#4b5563",fontWeight:500}}>{c.nom}</span></div>)}
    </div>
    <div ref={scrollRef} className="gantt-scroll" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={endMouseDrag} onMouseLeave={endMouseDrag} style={{background:"white",borderRadius:6,border:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flex:1,overflowY:"auto",overflowX:"auto",WebkitOverflowScrolling:"touch",touchAction:"pan-x pan-y pinch-zoom",overscrollBehaviorX:"none",minWidth:0,minHeight:0,cursor:isMouseDragging?"grabbing":"default"}}>
      <div style={{display:"flex",height:headerHeight,flexShrink:0,minWidth:totalWidth}}>
        <div style={{width:workerColumnWidth,background:"#e5e7eb",borderRight:"1px solid #9ca3af",flexShrink:0,position:"sticky",left:0,zIndex:20,boxShadow:"3px 0 5px rgba(15,23,42,0.10)"}}/>
        <div style={{width:timelineWidth,flex:`0 0 ${timelineWidth}px`,height:headerHeight,background:"#e5e7eb"}}>
          <div style={{display:"grid",gridTemplateColumns:columns,height:monthHeight,borderBottom:"1px solid #cbd5e1",background:"#eef2f7"}}>{monthGroups.map((m,i)=><div key={m.key} style={{gridColumn:`${m.start+1} / span ${m.count}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:dayWidth<27?7:isMobile?8:9,fontWeight:800,color:"#334155",background:i%2?"#eef0f2":"#dbe7f3",overflow:"hidden"}}>{m.label}</div>)}</div>
          <div style={{display:"grid",gridTemplateColumns:columns,height:dayHeaderHeight,background:"#e5e7eb"}}>{allDates.map((d,i)=><div key={i} style={{borderRight:borderRight(i),textAlign:"center",fontSize:dayWidth<27?7:8,fontWeight:700,color:"#1f2937",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",whiteSpace:"nowrap"}}>{dayLabel(d)}</div>)}</div>
        </div>
      </div>
      <div style={{height:3,background:"#1e3a8a",width:totalWidth,flexShrink:0}}/>
      {ouvriersActifs.map((ouvrier,ri)=>{const rowBg=ri%2===0?"white":"#f3f4f6";const list=affectations.filter(a=>Number(a.ouvrierID)===Number(ouvrier.id));const sep=workerSeparators.has(normalizeWorkerName(ouvrier.nom));return <React.Fragment key={ouvrier.id}>
        <div data-worker-id={ouvrier.id} style={{display:"flex",height:Math.max(28,rowHeight),background:rowBg,minWidth:totalWidth}}>
          <div style={{width:workerColumnWidth,padding:isMobile?"0.12rem 0.3rem":"0.25rem 0.55rem",background:rowBg,borderRight:"1px solid #9ca3af",fontSize:isMobile?8:9,fontWeight:700,color:"#1f2937",display:"flex",alignItems:"center",flexShrink:0,position:"sticky",left:0,zIndex:8,boxShadow:"3px 0 5px rgba(15,23,42,0.08)",boxSizing:"border-box",overflow:"hidden"}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ouvrier.nom}</div></div>
          <div style={{display:"grid",gridTemplateColumns:columns,width:timelineWidth,flex:`0 0 ${timelineWidth}px`,background:rowBg,position:"relative"}}>{allDates.map((date,i)=>{const key=`${ouvrier.id}:${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;const dayAff=list.filter(a=>isVisibleOnDay(a,date));return <div key={key} onDoubleClick={e=>handleEmptyCellDoubleClick(e,ouvrier.id,date)} onTouchStart={e=>handleEmptyCellTouchStart(e,key)} onTouchEnd={e=>handleEmptyCellTouchEnd(e,ouvrier.id,date,key)} style={{borderRight:borderRight(i),position:"relative",cursor:"pointer",padding:1,overflow:"hidden"}}>{dayAff.map((aff,idx)=>{const chantier=chantiers.find(c=>Number(c.id)===Number(aff.chantierId));const hors=isHorsGantt(aff,chantier),rdv=isRdvTask(aff),planning=isPlanning(aff);const bg=rdv?rdvColor:planning?planningColor:hors?"#D1D5DB":getChantierColor(chantier?.id);const label=rdv?((aff.nomExterne||aff.affectationNom||"RDV")):hors?(aff.nomExterne||aff.affectationNom||""):getLetters(aff,chantier);const task=rdv?getRdvTimeLabel(aff):getLabel(aff);return <div key={aff.id} onDoubleClick={e=>handleAffectationDoubleClick(e,aff)} onTouchStart={e=>handleAffectationTouchStart(e,`affectation:${aff.id}`)} onTouchEnd={e=>handleAffectationTouchEnd(e,aff,`affectation:${aff.id}`)} style={{position:"relative",zIndex:2,marginBottom:1,outline:String(highlightedAffectationId)===String(aff.id)?"2px solid #f59e0b":"none",borderRadius:3}}><div style={{width:"100%",height:Math.max(13,rowHeight-10),backgroundColor:bg,border:"1px solid rgba(0,0,0,0.16)",borderRadius:3,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px",color:contrastColor(bg),fontWeight:800,fontSize:fitTextSize(label),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>{task&&<div style={{height:7,fontSize:dayWidth<27?5:6,fontWeight:600,color:"#374151",textAlign:"center",overflow:"hidden",whiteSpace:"nowrap",lineHeight:"7px"}}>{task}</div>}</div>})}</div>})}</div>
        </div>
        <div style={sep?{height:3,background:"#94a3b8",width:totalWidth}:{height:1,background:"#d1d5db",width:totalWidth}}/>
      </React.Fragment>;})}
    </div>
  </div>;
};
