import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { LiveProvider } from "./hooks/useLive";
import { LanguageProvider } from "./i18n/LanguageProvider";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LiveProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </LiveProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
