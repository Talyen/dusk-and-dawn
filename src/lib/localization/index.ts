import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import english from "./locales/en.json";
import expanded from "./locales/en-XA.json";

export const localization = i18next.createInstance();
void localization.use(initReactI18next).init({
  resources: { en: { translation: english }, "en-XA": { translation: expanded } },
  lng: "en",
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
