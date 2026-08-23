import React,{createContext,useCallback,useEffect,useState} from "react";
import * as api from "../utils/api";
export const AppContext=createContext();
export const AppProvider=({children})=>{
 const[ouvriers,setOuvriers]=useState([]),[chantiers,setChantiers]=useState([]),[affectations,setAffectations]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null);
 const loadData=useCallback(async(showLoader=false)=>{if(showLoader)setLoading(true);try{const d=await api.getAll();if(d?.error)throw new Error(d.error);setOuvriers(Array.isArray(d?.ouvriers)?d.ouvriers:[]);setChantiers(Array.isArray(d?.chantiers)?d.chantiers:[]);setAffectations(Array.isArray(d?.affectations)?d.affectations:[]);setError(null);}catch(e){setError(e.message);}finally{if(showLoader)setLoading(false);}},[]);
 useEffect(()=>{loadData(true);},[loadData]);
 const refresh=()=>setTimeout(()=>loadData(false),250);
 const addOuvrier=async(nom,type,metier)=>{const r=await api.createOuvrier(nom,type,metier);if(r.success)refresh();return r;};
 const updateOuvrier=async(id,nom,type,metier,statut,ordre="",separateurApres=false)=>{const r=await api.updateOuvrier(id,nom,type,metier,statut,ordre,separateurApres);if(r.success)refresh();return r;};
 const addChantier=async(nom,dateDebut,dateFin,description,couleur="")=>{const r=await api.createChantier(nom,dateDebut,dateFin,description,couleur);if(r.success)refresh();return r;};
 const updateChantier=async(id,nom,dateDebut,dateFin,description,statut,couleur="")=>{const r=await api.updateChantier(id,nom,dateDebut,dateFin,description,statut,couleur);if(r.success)refresh();return r;};
 const deleteChantier=async id=>{const r=await api.deleteChantier(id);if(r.success)refresh();return r;};
 const addAffectation=async(...args)=>{const r=await api.createAffectation(...args);if(r.success)refresh();return r;};
 const updateAffectation=async(...args)=>{const r=await api.updateAffectation(...args);if(r.success)refresh();return r;};
 const deleteAffectation=async id=>{const r=await api.deleteAffectation(id);if(r.success)refresh();return r;};
 return <AppContext.Provider value={{ouvriers,chantiers,affectations,loading,error,loadData,addOuvrier,updateOuvrier,addChantier,updateChantier,deleteChantier,addAffectation,updateAffectation,deleteAffectation}}>{children}</AppContext.Provider>;
};
