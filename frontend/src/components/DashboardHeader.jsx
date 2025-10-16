import { AccountCircle, Menu as MenuIcon, Notifications, Search } from "@mui/icons-material";
import { Avatar, Box, IconButton, InputAdornment, TextField, Typography } from "@mui/material";

const DashboardHeader = ({ onToggleSidebar, onToggleChat }) => {
  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left: Sidebar toggle & title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={onToggleSidebar}>
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            background: "linear-gradient(90deg,#0072ff,#00c6ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AI Resume Co-Pilot
        </Typography>
      </Box>

      {/* Right: Search, notifications, avatar, chat toggle */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search candidates, jobs..."
          sx={{
            width: 280,
            backgroundColor: "#fff",
            borderRadius: 2,
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
        />
        <IconButton onClick={onToggleChat}>
          <Notifications />
        </IconButton>
        <Avatar>
          <AccountCircle />
        </Avatar>
      </Box>
    </Box>
  );
};

export default DashboardHeader;
