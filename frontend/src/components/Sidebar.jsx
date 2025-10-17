import BarChartIcon from "@mui/icons-material/BarChart";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventIcon from "@mui/icons-material/Event";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import WorkIcon from "@mui/icons-material/Work";
import { Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";


const drawerWidth = 260;
const collapsedWidth = 72;

export default function Sidebar({ open = true, setOpen = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Candidates", icon: <PeopleIcon />, path: "/candidates" },
  { text: "Jobs", icon: <WorkIcon />, path: "/jobs" },
  { text: "Analytics", icon: <BarChartIcon />, path: "/analytics" },
  { text: "Calendar", icon: <EventIcon />, path: "/calendar" },     
  { text: "LinkedIn Enricher", icon: <LinkedInIcon />, path: "/linkedin" },  
  { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
];


  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        sx: {
          width: open ? drawerWidth : collapsedWidth,
          transition: "width 200ms ease",
          overflowX: "hidden",
          boxShadow: "0 6px 24px rgba(16,24,40,0.08)",
          background: "linear-gradient(180deg,#ffffff,#f7fbff)",
        },
      }}
    >
      <Toolbar sx={{ display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center", px: 2 }}>
        {open ? <Box sx={{ fontWeight: 800, letterSpacing: 0.3 }}>AI Resume Co-Pilot</Box> : <Box sx={{ fontWeight: 800 }}>ARC</Box>}
        <IconButton onClick={() => setOpen(o => !o)} size="small">
          {open ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <List sx={{ mt: 1 }}>
        {menuItems.map((m) => {
            const selected = m.path === location.pathname || (m.text === "AI Assistant" && location.hash === "#ai");
            return (
            <Tooltip key={m.text} title={open ? "" : m.text} placement="right">
                <ListItemButton
                sx={{
                    mx: 1,
                    borderRadius: 2,
                    mb: 0.5,
                    background: selected ? "linear-gradient(90deg,#e8f4ff,#f3fbff)" : "transparent",
                }}
                onClick={() => {
                    if (m.text === "AI Assistant") {
                    window.location.hash = "ai";
                    } else navigate(m.path);
                }}
                selected={selected}
                >
                <ListItemIcon sx={{ minWidth: 36 }}>{m.icon}</ListItemIcon>
                {open && <ListItemText primary={m.text} />}
                </ListItemButton>
            </Tooltip>
            );
        })}
    </List>

    </Drawer>
  );
}
