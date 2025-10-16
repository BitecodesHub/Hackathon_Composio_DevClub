import { Box, Card, CardContent, Typography } from "@mui/material";
import { motion } from "framer-motion";

const KPI = ({ title, value, change }) => (
  <motion.div whileHover={{ scale: 1.05 }}>
    <Card
      sx={{
        borderRadius: 4,
        backdropFilter: "blur(10px)",
        background: "rgba(255, 255, 255, 0.75)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      }}
    >
      <CardContent>
        <Typography
          variant="subtitle2"
          sx={{ color: "#666", fontWeight: 600, mb: 1 }}
        >
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: change >= 0 ? "#2e7d32" : "#c62828", fontWeight: 500 }}
          >
            {change > 0 ? `+${change}%` : `${change}%`}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  </motion.div>
);

export default KPI;
