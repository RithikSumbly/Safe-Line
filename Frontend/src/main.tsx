import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { A11yModeProvider } from "@/contexts/A11yModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <A11yModeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </A11yModeProvider>
    </ThemeProvider>
  </StrictMode>,
);
