// TERACITY GANTT — backend volontairement isolé d'AB PLANNING.
// Google Sheet cible : 1iCqgYA-rrn6RE64ktgRSS5Prl_7etucakeP0ILesHts
const TERACITY_API_URL = "https://script.google.com/macros/s/AKfycbzM-uwPH8Dgc3bajBXXkMz2mi7LwUL7KjLA5PeIhqFYJaPc-jEMFa2UxEFLErrdtpgv/exec";

const unavailable = () => Promise.resolve({ error: "Backend TERACITY non configuré" });

const jsonp = (params = {}) => new Promise((resolve,reject)=>{
  if (!TERACITY_API_URL) {
    reject(new Error("Backend TERACITY non configuré"));
    return;
  }
  const callbackName=`teracityGanttJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const query=new URLSearchParams({...params,callback:callbackName,_ts:String(Date.now())});
  const script=document.createElement("script"); let termine=false;
  const nettoyer=()=>{if(script.parentNode)script.parentNode.removeChild(script);try{delete window[callbackName];}catch(_){window[callbackName]=undefined;}};
  const timeout=window.setTimeout(()=>{if(termine)return;termine=true;nettoyer();reject(new Error("Délai API dépassé"));},20000);
  window[callbackName]=data=>{if(termine)return;termine=true;window.clearTimeout(timeout);nettoyer();resolve(data);};
  script.onerror=()=>{if(termine)return;termine=true;window.clearTimeout(timeout);nettoyer();reject(new Error("Impossible de joindre Apps Script TERACITY"));};
  script.src=`${TERACITY_API_URL}?${query.toString()}`;script.async=true;document.head.appendChild(script);
});

const appeler=async(params,fallback={error:"Erreur API"})=>{try{return await jsonp(params);}catch(err){console.error("TERACITY Gantt API:",err);return{...fallback,error:err?.message||"Erreur API"};}};
export const getAll=async()=>TERACITY_API_URL ? appeler({action:"getAll"}) : {ouvriers:[],chantiers:[],affectations:[]};
export const getOuvriers=async()=>{if(!TERACITY_API_URL)return[];const r=await appeler({action:"getOuvriers"},{error:"Erreur ouvriers"});return Array.isArray(r)?r:[];};
export const getChantiers=async()=>{if(!TERACITY_API_URL)return[];const r=await appeler({action:"getChantiers"},{error:"Erreur chantiers"});return Array.isArray(r)?r:[];};
export const getAffectations=async()=>{if(!TERACITY_API_URL)return[];const r=await appeler({action:"getAffectations"},{error:"Erreur affectations"});return Array.isArray(r)?r:[];};
export const createOuvrier=async(nom,type,metier)=>TERACITY_API_URL?appeler({action:"createOuvrier",nom,type,metier}):unavailable();
export const createChantier=async(nom,dateDebut,dateFin,description,couleur="")=>TERACITY_API_URL?appeler({action:"createChantier",nom,dateDebut,dateFin,description:description||"",couleur:couleur||""}):unavailable();
export const updateOuvrier=async(id,nom,type,metier,statut,ordre="",separateurApres=false)=>TERACITY_API_URL?appeler({action:"updateOuvrier",id,nom:nom||"",type:type||"",metier:metier||"",statut:statut||"",ordre:ordre===""?"":String(ordre),separateurApres:separateurApres?"TRUE":"FALSE"}):unavailable();
export const updateChantier=async(id,nom,dateDebut,dateFin,description,statut,couleur="")=>TERACITY_API_URL?appeler({action:"updateChantier",id,nom:nom||"",dateDebut:dateDebut||"",dateFin:dateFin||"",description:description||"",statut:statut||"",couleur:couleur||""}):unavailable();
export const deleteChantier=async id=>TERACITY_API_URL?appeler({action:"deleteChantier",id}):unavailable();
export const createAffectation=async(ouvrierID,chantierId,dateDebut,dateFin,tache,nomAffectation="",typeAffectation="CHANTIER")=>TERACITY_API_URL?appeler({action:"createAffectation",ouvrierID,chantierId:chantierId||"",dateDebut,dateFin,tache:tache||"",nomAffectation:nomAffectation||"",nomExterne:nomAffectation||"",typeAffectation:typeAffectation||"CHANTIER"}):unavailable();
export const updateAffectation=async(id,dateDebut,dateFin,tache,statut,nomAffectation="",chantierId="")=>TERACITY_API_URL?appeler({action:"updateAffectation",id,dateDebut:dateDebut||"",dateFin:dateFin||"",tache:tache||"",statut:statut||"",nomAffectation:nomAffectation||"",chantierId:chantierId||""}):unavailable();
export const deleteAffectation=async id=>TERACITY_API_URL?appeler({action:"deleteAffectation",id}):unavailable();
