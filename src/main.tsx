import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { App } from "./App";
import { localization } from "./lib/localization";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(
  <StrictMode>
    <I18nextProvider i18n={localization}>
      <App />
    </I18nextProvider>
  </StrictMode>,
);
