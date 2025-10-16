import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";

export default function Scheduler() {
  const [candidate, setCandidate] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  const handleSchedule = () => {
    if (candidate && date) {
      setMessage(`✅ Interview scheduled for ${candidate} on ${date}`);
    } else {
      setMessage("⚠️ Please fill all fields");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Interview Scheduler
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 500 }}>
        <TextField
          label="Candidate Name"
          fullWidth
          margin="normal"
          value={candidate}
          onChange={(e) => setCandidate(e.target.value)}
        />
        <TextField
          label="Interview Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleSchedule}
        >
          Schedule Interview
        </Button>
        {message && (
          <Typography variant="subtitle1" color="secondary" sx={{ mt: 2 }}>
            {message}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
