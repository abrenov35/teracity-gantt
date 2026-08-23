import React, { useEffect, useState } from "react";

const formatRdvTask = value => {
  if (!value) return "RDV";
  const [h, m] = String(value).split(":");
  return `RDV • ${String(h || "").padStart(2, "0")}h${String(m || "00").padStart(2, "0")}`;
};

export const FormAffectation = ({ ouvrier, chantiers, onSubmit, onCancel, selectedDate = null }) => {
  const chantiersActifs = chantiers
    .filter(c => c.statut === "Actif")
    .sort((a, b) => String(a.nom || "").localeCompare(String(b.nom || ""), "fr", { sensitivity: "base" }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [mode, setMode] = useState("chantier");
  const [days, setDays] = useState({ lundi:false, mardi:false, mercredi:false, jeudi:false, vendredi:false });
  const [formData, setFormData] = useState({ chantierId:"", nomLibre:"", tache:"", rdvHeure:"" });
  const [tacheHistory, setTacheHistory] = useState([]);
  const compactLandscape = typeof window !== "undefined" && window.matchMedia("(max-width: 1100px) and (orientation: landscape)").matches;

  useEffect(() => {
    const saved = localStorage.getItem("tacheHistory");
    if (saved) {
      try { setTacheHistory(JSON.parse(saved)); }
      catch (e) { console.error(e); }
    }
  }, []);

  const getDateRange = () => {
    const order = ["lundi","mardi","mercredi","jeudi","vendredi"];
    const checked = order.filter(d => days[d]);
    if (!checked.length) {
      setNotice({ title:"Jour manquant", message:"Sélectionnez au moins un jour dans la semaine." });
      return null;
    }
    const clicked = selectedDate ? new Date(selectedDate) : new Date();
    clicked.setHours(0,0,0,0);
    const dow = clicked.getDay();
    const monday = new Date(clicked);
    monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
    const indexes = checked.map(d => order.indexOf(d));
    const debut = new Date(monday);
    const fin = new Date(monday);
    debut.setDate(debut.getDate() + Math.min(...indexes));
    fin.setDate(fin.getDate() + Math.max(...indexes));
    const fmt = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    return { dateDebut:fmt(debut), dateFin:fmt(fin) };
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (isSubmitting) return;

    if (mode === "chantier" && !formData.chantierId) {
      setNotice({ title:"Chantier manquant", message:"Choisissez le chantier à planifier." });
      return;
    }
    if ((mode === "libre" || mode === "rdv") && !formData.nomLibre.trim()) {
      setNotice({ title:"Nom manquant", message:"Donnez un nom à l’affectation." });
      return;
    }
    if (mode === "rdv" && !formData.rdvHeure) {
      setNotice({ title:"Heure manquante", message:"Indiquez l’heure du rendez-vous." });
      return;
    }

    const range = getDateRange();
    if (!range) return;

    setIsSubmitting(true);
    const tache = mode === "rdv" ? formatRdvTask(formData.rdvHeure) : formData.tache.trim();

    if (mode !== "rdv" && tache) {
      const h = [tache, ...tacheHistory.filter(t => t !== tache)].slice(0,10);
      setTacheHistory(h);
      localStorage.setItem("tacheHistory", JSON.stringify(h));
    }

    await onSubmit({
      chantierId: mode === "chantier" ? formData.chantierId : `__LIBRE__:${formData.nomLibre.trim()}`,
      dateDebut: range.dateDebut,
      dateFin: range.dateFin,
      tache
    });
    setIsSubmitting(false);
  };

  const label = {
    fontSize: compactLandscape ? 10 : 11,
    fontWeight: 700,
    color:"#374151",
    display:"block",
    marginBottom: compactLandscape ? 3 : 5
  };
  const input = {
    width:"100%",
    padding:compactLandscape ? "6px 8px" : "9px 10px",
    borderRadius:6,
    border:"1px solid #d1d5db",
    fontSize:12,
    fontFamily:"inherit",
    boxSizing:"border-box"
  };
  const dayList = [
    {key:"lundi",label:"Lun"},
    {key:"mardi",label:"Mar"},
    {key:"mercredi",label:"Mer"},
    {key:"jeudi",label:"Jeu"},
    {key:"vendredi",label:"Ven"}
  ];

  const modeButton = (key, color, background) => ({
    padding:compactLandscape ? 7 : 10,
    borderRadius:7,
    border:mode === key ? `2px solid ${color}` : "1px solid #d1d5db",
    background:mode === key ? background : "white",
    color,
    fontWeight:700,
    cursor:"pointer",
    fontSize:compactLandscape ? 11 : 13
  });

  return (
    <>
      <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:compactLandscape ? 8 : 14}}>
        <div>
          <label style={label}>Ouvrier</label>
          <div style={{padding:compactLandscape ? "6px 8px" : "9px 10px",background:"#f3f4f6",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,fontWeight:700}}>
            {ouvrier.nom}
          </div>
        </div>

        <div>
          <label style={label}>Type d’affectation</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <button type="button" onClick={()=>setMode("chantier")} style={modeButton("chantier","#1e3a8a","#eff6ff")}>🏗️ Chantier</button>
            <button type="button" onClick={()=>setMode("libre")} style={modeButton("libre","#4b5563","#f3f4f6")}>Autre</button>
            <button type="button" onClick={()=>setMode("rdv")} style={modeButton("rdv","#6d28d9","#f5f3ff")}>📅 RDV</button>
          </div>
        </div>

        {mode === "chantier" ? (
          <div>
            <label style={label}>Chantier *</label>
            <select value={formData.chantierId} onChange={e=>setFormData({...formData,chantierId:e.target.value})} style={input}>
              <option value="">-- Sélectionner --</option>
              {chantiersActifs.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label style={label}>{mode === "rdv" ? "Nom du rendez-vous *" : "Nom de l’affectation *"}</label>
            <input
              autoFocus
              value={formData.nomLibre}
              onChange={e=>setFormData({...formData,nomLibre:e.target.value})}
              placeholder={mode === "rdv" ? "Ex : HERVOUET" : "Ex : SAV Dupont, Congé, Formation, Dépôt…"}
              style={{...input,border:mode === "rdv" ? "2px solid #7c3aed" : "2px solid #9ca3af"}}
            />
          </div>
        )}

        <div>
          <label style={label}>Jours de la semaine *</label>
          <div style={{display:"flex",gap:6}}>
            {dayList.map(day=>(
              <button
                key={day.key}
                type="button"
                onClick={()=>setDays(p=>({...p,[day.key]:!p[day.key]}))
                style={{
                  flex:1,
                  padding:compactLandscape ? "6px 3px" : "9px 4px",
                  borderRadius:6,
                  border:days[day.key] ? "2px solid #1e3a8a" : "1px solid #d1d5db",
                  background:days[day.key] ? "#1e3a8a" : "white",
                  color:days[day.key] ? "white" : "#374151",
                  fontSize:11,
                  fontWeight:700,
                  cursor:"pointer"
                }}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "rdv" ? (
          <div>
            <label style={{...label,color:"#6d28d9"}}>Heure du RDV *</label>
            <input
              type="time"
              value={formData.rdvHeure}
              onChange={e=>setFormData({...formData,rdvHeure:e.target.value})}
              style={{...input,border:"2px solid #7c3aed",background:"#faf5ff"}}
            />
            <div style={{fontSize:10,color:"#6d28d9",marginTop:4}}>
              Affichage planning : {formatRdvTask(formData.rdvHeure)}
            </div>
          </div>
        ) : (
          <div>
            <label style={label}>Tâche / description</label>
            <textarea
              rows={compactLandscape ? 1 : 2}
              value={formData.tache}
              onChange={e=>setFormData({...formData,tache:e.target.value})}
              placeholder="Ex : peinture chambre, reprise plafond, formation habilitation…"
              style={{...input,resize:"vertical"}}
            />
          </div>
        )}

        {mode !== "rdv" && tacheHistory.length > 0 && (
          <div style={{background:"#f9fafb",padding:compactLandscape ? 5 : 8,borderRadius:6,border:"1px solid #e5e7eb"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:compactLandscape ? 4 : 6}}>Tâches récentes :</div>
            <div style={{display:"flex",gap:5,flexWrap:compactLandscape ? "nowrap" : "wrap",overflowX:compactLandscape ? "auto" : "visible"}}>
              {tacheHistory.map((t,i)=>(
                <button key={i} type="button" onClick={()=>setFormData({...formData,tache:t})} style={{background:"white",border:"1px solid #d1d5db",borderRadius:4,padding:compactLandscape ? "3px 6px" : "4px 7px",fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:compactLandscape ? 0 : 4}}>
          <button type="submit" disabled={isSubmitting} style={{flex:1,padding:compactLandscape ? 8 : 10,background:isSubmitting ? "#9ca3af" : "#1e3a8a",color:"white",border:0,borderRadius:7,fontWeight:700,cursor:"pointer"}}>
            {isSubmitting ? "Enregistrement..." : "Ajouter"}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting} style={{flex:1,padding:compactLandscape ? 8 : 10,background:"#e5e7eb",color:"#374151",border:0,borderRadius:7,fontWeight:700,cursor:"pointer"}}>
            Annuler
          </button>
        </div>
      </form>

      {notice && (
        <div onClick={()=>setNotice(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(15,23,42,.45)",backdropFilter:"blur(2px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"min(420px,92vw)",background:"white",borderRadius:14,boxShadow:"0 24px 70px rgba(15,23,42,.28)",padding:20}}>
            <div style={{fontSize:15,fontWeight:800}}>{notice.title}</div>
            <div style={{marginTop:6,fontSize:12,color:"#6b7280"}}>{notice.message}</div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
              <button type="button" onClick={()=>setNotice(null)} style={{padding:"9px 16px",borderRadius:8,border:0,background:"#1e3a8a",color:"white",fontWeight:700,cursor:"pointer"}}>
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
