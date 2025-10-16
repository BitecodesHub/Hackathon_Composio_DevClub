import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { Avatar, Box, Divider, IconButton, Paper, TextField, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function AIChatPanel({ open = true, setOpen = () => {} }) {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Hello Bhavika! Ask me to find top candidates, schedule interviews, or summarize resumes." }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: "user", text: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput("");

    // UI-only assistant reply (mocked) — replace with real backend later
    setTimeout(() => {
      const reply = {
        id: Date.now() + 1,
        role: "assistant",
        text: `Mock reply: I parsed your request "${userMsg.text}" — here are 3 suggested actions: (1) Shortlist 5 candidates, (2) Schedule interviews, (3) Post improved JD.`
      };
      setMessages(m => [...m, reply]);
    }, 700);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          style={{
            width: 360,
            position: "relative",
            zIndex: 40,
          }}
        >
          <Paper elevation={12} sx={{ height: "100vh", display: "flex", flexDirection: "column", borderRadius: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "#1976d2" }}>AI</Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Co-Pilot</Typography>
                  <Typography variant="caption" color="text.secondary">AI assistant (mock)</Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setOpen(false)}><CloseIcon /></IconButton>
            </Box>

            <Divider />

            <Box ref={scrollRef} sx={{ flex: 1, overflow: "auto", p: 2, bgcolor: "#f7fbff" }}>
              {messages.map((m) => (
                <Box key={m.id} sx={{ display: "flex", mb: 2, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && <Avatar sx={{ width: 32, height: 32, mr: 1 }}>A</Avatar>}
                  <Box sx={{
                    maxWidth: "80%",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: m.role === "user" ? "primary.main" : "#fff",
                    color: m.role === "user" ? "#fff" : "text.primary",
                    boxShadow: "0 4px 14px rgba(16,24,40,0.06)"
                  }}>
                    <Typography variant="body2">{m.text}</Typography>
                  </Box>
                  {m.role === "user" && <Avatar sx={{ width: 32, height: 32, ml: 1 }}>B</Avatar>}
                </Box>
              ))}
            </Box>

            <Box sx={{ p: 2, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <TextField
                size="small"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") send(); }}
                placeholder='Ask: "Show top Data Analyst candidates"'
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={send} color="primary">
                      <SendIcon />
                    </IconButton>
                  ),
                }}
                fullWidth
              />
            </Box>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
