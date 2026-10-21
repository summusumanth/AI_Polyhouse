import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import { ToastProvider } from "./components/Toast";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/art.css";
import "./styles/pages.css";
import "./styles/team.css";
<<<<<<< HEAD
import "./styles/facility.css";
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
