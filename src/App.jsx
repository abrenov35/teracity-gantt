import React, { useState } from "react";
import { AppProvider } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { GanttPage } from "./pages/GanttPage";
import { OuvriersPage } from "./pages/OuvriersPage";
import { ChantierPage } from "./pages/ChantierPage";

function App() {
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem("currentPage") || "gantt");
  const [ganttControls, setGanttControls] = useState(null);

  const handleSetCurrentPage = page => {
    localStorage.setItem("currentPage", page);
    setCurrentPage(page);
  };

  const pages = {
    gantt: { title:"Vue Gantt Unifiée", subtitle:"Visualiser les ouvriers et chantiers sur la même timeline", component:GanttPage },
    ouvriers: { title:"Ouvriers & Équipes", subtitle:"Gestion des effectifs CDI et sous-traitants", component:OuvriersPage },
    chantiers: { title:"Gestion des Chantiers", subtitle:"Actifs et archivés", component:ChantierPage }
  };

  const CurrentPage = pages[currentPage].component;
  const isGantt = currentPage === "gantt";

  return (
    <AppProvider>
      <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>
        <Sidebar currentPage={currentPage} setCurrentPage={handleSetCurrentPage} ganttControls={ganttControls} />
        <div style={{flex:1,overflow:isGantt?"hidden":"auto",background:"#f9fafb",display:"flex",justifyContent:"center",padding:isGantt?0:"0 1rem",minHeight:0}}>
          <div style={{width:"100%",maxWidth:isGantt?"none":"1200px",display:"flex",flexDirection:"column",minHeight:0}}>
            <CurrentPage onGanttControlsReady={setGanttControls} />
          </div>
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
