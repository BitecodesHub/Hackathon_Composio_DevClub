import { GoogleOAuthProvider } from "@react-oauth/google";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId="915660634853-9rqbrgdcu5afj7k706pdv26871ilb0bd.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
