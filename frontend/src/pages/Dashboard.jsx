import { Box, Card, Grid, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Pie chart data
const pieData = [
  { name: "Shortlisted", value: 45 },
  { name: "Interviewed", value: 25 },
  { name: "Rejected", value: 20 },
  { name: "Hired", value: 10 },
];
const COLORS = ["#42A5F5", "#FFB74D", "#E57373", "#81C784"];

// Dashboard stats
const stats = [
  { title: "Total Candidates", value: "152" },
  { title: "Active Jobs", value: "24" },
  { title: "Shortlisted", value: "45" },
  { title: "Interviews", value: "58" },
];

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [gapiError, setGapiError] = useState(null);

  // Suppress harmless gapi iframe errors in dev
  useEffect(() => {
    const oldHandler = window.onerror;
    window.onerror = () => true;
    return () => (window.onerror = oldHandler);
  }, []);

  // Wait for gapi to load
  const waitForGapi = () =>
    new Promise((resolve) => {
      const check = () => {
        if (window.gapi) resolve(window.gapi);
        else setTimeout(check, 50);
      };
      check();
    });

  // Initialize gapi and load calendar events
  useEffect(() => {
    const initializeGapi = async () => {
      try {
        const gapi = await waitForGapi();

        await new Promise((resolve, reject) =>
          gapi.load("client:auth2", { callback: resolve, onerror: reject })
        );

        await gapi.client.init({
          apiKey: "AIzaSyDj63l6Em6gSpAmPUTZUSKaZJ988UmrN84",
          clientId: "915660634853-9rqbrgdcu5afj7k706pdv26871ilb0bd.apps.googleusercontent.com",
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
          ],
          scope: "https://www.googleapis.com/auth/calendar.readonly",
        });

        const response = await gapi.client.calendar.events.list({
          calendarId: "primary",
          timeMin: new Date().toISOString(),
          showDeleted: false,
          singleEvents: true,
          maxResults: 10,
          orderBy: "startTime",
        });

        setEvents(response.result.items || []);
      } catch (err) {
        console.error("Error initializing gapi", err);
        setGapiError(err);
      }
    };

    initializeGapi();
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Page title */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: "linear-gradient(90deg,#0072ff,#00c6ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Dashboard
        </Typography>
      </motion.div>

      <Grid container spacing={4}>
        {/* Left section */}
        <Grid item xs={12} md={8}>
          {/* Insights */}
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              mb: 3,
              boxShadow: "0 8px 30px rgba(16,24,40,0.06)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Insights
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {stats.map((s, i) => (
                <Box
                  key={i}
                  sx={{
                    flex: "1 1 180px",
                    p: 2,
                    borderRadius: 2,
                    background: "linear-gradient(90deg,#ffffff,#f7fbff)",
                    boxShadow: "0 6px 18px rgba(16,24,40,0.04)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {s.title}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {s.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>

          {/* Application Pipeline Pie Chart */}
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: "0 8px 30px rgba(16,24,40,0.06)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Application Pipeline Overview
            </Typography>
            <Box sx={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>

          {/* Calendar */}
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              mt: 3,
              boxShadow: "0 8px 30px rgba(16,24,40,0.06)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Upcoming Calendar Events
            </Typography>
            {gapiError ? (
              <Typography color="error">
                Error loading calendar: {gapiError.message || "Check console"}
              </Typography>
            ) : events.length === 0 ? (
              <Typography>No upcoming events</Typography>
            ) : (
              <ul>
                {events.map((event) => (
                  <li key={event.id}>
                    {event.summary} —{" "}
                    {new Date(
                      event.start.dateTime || event.start.date
                    ).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Grid>

        {/* Right section */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              mb: 3,
              boxShadow: "0 8px 30px rgba(16,24,40,0.06)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              AI Suggestions
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              💡 3 candidates have &gt; 90% skill match for Data Analyst.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              📈 Frontend roles showing increased applications — boost JD
              visibility.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              🤖 Automate resume parsing to save ~6 hours/week.
            </Typography>
          </Card>

          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: "0 8px 30px rgba(16,24,40,0.06)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Recent Activity
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Rahul Mehta — Applied for Frontend Dev
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Sneha Patel — Resume parsed
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Maya Rao — Shortlisted
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
