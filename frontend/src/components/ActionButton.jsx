import { Button, CircularProgress } from "@mui/material";

export default function ActionButton({ label, onClick, loading }) {
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={onClick}
      disabled={loading}
      sx={{ m: 1 }}
    >
      {loading ? <CircularProgress size={20} color="inherit" /> : label}
    </Button>
  );
}
