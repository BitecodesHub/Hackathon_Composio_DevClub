import { Box, CssBaseline } from "@mui/material";
import { useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";


import AIChatPanel from "./components/AIChatPanel";
import DashboardHeader from "./components/DashboardHeader";
import Sidebar from "./components/Sidebar";

import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";
import Candidates from "./pages/Candidates";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Settings from "./pages/Settings";
import RecruiterCopilot from "./pages/RecruiterCopilot";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);

  const drawerWidth = 240;
  const collapsedWidth = 60;

  return (
    <Router>
      <CssBaseline /> {/* Reset CSS */}
      <Box sx={{ display: "flex", height: "100vh", background: "linear-gradient(145deg,#eaf6ff,#fbfdff)" }}>
        
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            ml: sidebarOpen ? `${drawerWidth}px` : `${collapsedWidth}px`, // shift content
            transition: "margin 0.3s ease",
          }}
        >
          {/* Top Navigation / Header */}
          <DashboardHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onToggleChat={() => setChatOpen(!chatOpen)} />

          {/* Pages */}
          <Box sx={{ flex: 1, overflow: "auto", p: 4 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
               <Route path="/recruitercopilot" element={<RecruiterCopilot />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/calendar" element={<Calendar />} /> 
              <Route path="/settings" element={<Settings />} />
            </Routes>

          </Box>
        </Box>

        {/* AI Chat Panel (dock on right) */}
        <AIChatPanel open={chatOpen} setOpen={setChatOpen} />

      </Box>
    </Router>
  );
};

export default App;

