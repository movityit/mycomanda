import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { it } from "./locales/it";
import { en } from "./locales/en";

const resources = {
  it,
  en,
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "it", // Default static language on server, will be overridden on client
    fallbackLng: "it",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
