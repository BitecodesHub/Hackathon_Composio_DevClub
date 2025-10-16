import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import { AppBar, Avatar, Badge, Box, IconButton, InputBase, Toolbar } from "@mui/material";

export default function TopNav({ onToggleSidebar = () => {}, onToggleChat = () => {} }) {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ backdropFilter: "blur(8px)" }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={onToggleSidebar} size="small" sx={{ mr: 1 }}>
            {/* A small hamburger for collapse handled in Sidebar; optional */}
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", background: "#fff", px: 1, borderRadius: 2 }}>
            <SearchIcon color="action" />
            <InputBase placeholder="Search candidates, roles..." sx={{ ml: 1 }} />
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={onToggleChat}><ChatBubbleOutlineIcon /></IconButton>
          <IconButton><Badge color="error" variant="dot"><NotificationsIcon /></Badge></IconButton>
          <Avatar src="https://i.pravatar.cc/300" />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
