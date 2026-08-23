import React, { useContext, useState } from "react";
import { VERSION } from "../version.js";
import { AppContext } from "../context/AppContext";

export const Sidebar = ({ currentPage, setCurrentPage, ganttControls }) => {
  const [chantierSearch, setChantierSearch] = useState("");
  const { loadData, loading, lastDeletedAffectation, undoLastDelete, undoingDelete } = useContext(AppContext);
  const handleReload = async () => { await loadData(true); };
  const handleUndo = async () => {
    const result=await undoLastDelete();
    if(!result?.success && result?.error) alert("Annulation impossible : "+result.error);
  };
  const baseButtonStyle = {
    width:92,height:28,padding:"0 8px",display:"inline-flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box",
    border:"1px solid rgba(255,255,255,0.42)",borderRadius:5,color:"white",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"
  };
  const navStyle = active => ({...baseButtonStyle,background:active?"rgba(255,255,255,0.18)":"transparent",borderBottom:active?"2px solid #f59e0b":"1px solid rgba(255,255,255,0.42)"});
  const separator=<div style={{width:1,height:24,background:"rgba(255,255,255,0.25)",flexShrink:0}}/>;
  const undoEnabled=currentPage==="gantt"&&Boolean(lastDeletedAffectation)&&!undoingDelete;
  const runChantierSearch = value => {
    const query=String(value ?? chantierSearch).trim();
    if(!query || !ganttControls?.onFindChantier) return;
    const result=ganttControls.onFindChantier(query);
    if(!result?.success) alert(result?.message || "Aucune affectation trouvée à partir d'aujourd'hui.");
  };
  return <div style={{background:"#1e3a8a",color:"white",display:"flex",alignItems:"center",justifyContent:"flex-start",padding:"7px 12px",borderBottom:"1px solid rgba(255,255,255,0.12)",gap:8,whiteSpace:"nowrap",position:"sticky",top:0,zIndex:100,overflowX:"auto"}}>
    <div style={{fontSize:13,fontWeight:800,flexShrink:0,marginRight:4}}>TERACITY GANTT</div>{separator}
    <button onClick={()=>setCurrentPage("gantt")} style={navStyle(currentPage==="gantt")}>📅 Gantt</button>
    {currentPage==="gantt"&&ganttControls&&<div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
      <button onClick={ganttControls.onPast} style={{...baseButtonStyle,background:"rgba(255,255,255,0.12)"}}>← Passé</button>
    </div>}
    {separator}
    <button onClick={handleReload} disabled={loading} title="Recharger immédiatement les données du planning" style={{...baseButtonStyle,background:loading?"rgba(255,255,255,0.10)":"rgba(255,255,255,0.16)",cursor:loading?"default":"pointer"}}>{loading?"↻ ...":"↻ Recharger"}</button>
    {currentPage==="gantt"&&<button onClick={handleUndo} disabled={!undoEnabled} title={undoEnabled?"Restaurer la dernière affectation supprimée":"Aucune suppression à annuler"} style={{...baseButtonStyle,background:undoEnabled?"#f59e0b":"rgba(255,255,255,0.08)",opacity:undoEnabled?1:0.45,cursor:undoEnabled?"pointer":"default"}}>{undoingDelete?"↶ ...":"↶ Annuler"}</button>}
    {currentPage==="gantt"&&ganttControls&&<div style={{display:"flex",alignItems:"center",flexShrink:0}}>
      <input
        type="search"
        list="gantt-chantier-search"
        value={chantierSearch}
        onChange={e=>setChantierSearch(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();runChantierSearch();}}}
        onBlur={e=>{if(e.target.value) runChantierSearch(e.target.value);}}
        placeholder="🔎 Chercher chantier"
        title="Trouver la première affectation de ce chantier à partir d'aujourd'hui"
        style={{width:150,height:28,padding:"0 8px",border:"1px solid rgba(255,255,255,0.55)",borderRadius:5,background:"white",color:"#172554",fontSize:10,fontWeight:700,boxSizing:"border-box",outline:"none"}}
      />
      <datalist id="gantt-chantier-search">{(ganttControls.searchChantiers||[]).map(chantier=><option key={chantier.id} value={chantier.nom}/>)}</datalist>
    </div>}
    <button onClick={()=>setCurrentPage("chantiers")} style={navStyle(currentPage==="chantiers")}>🏗️ Chantiers</button>
    <button onClick={()=>setCurrentPage("ouvriers")} style={navStyle(currentPage==="ouvriers")}>👷 Ouvriers</button>
    <div style={{fontSize:9,opacity:0.65,fontWeight:700,flexShrink:0,padding:"0 3px"}}>v{VERSION}</div>
  </div>;
};
