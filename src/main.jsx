import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/Language";
import "./style.css";
import "./pages/evolution.css";
createRoot(document.getElementById("root")).render(<LanguageProvider><App /></LanguageProvider>);
