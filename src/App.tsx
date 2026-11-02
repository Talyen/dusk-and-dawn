import { useTranslation } from "react-i18next";

export function App() {
  const { t } = useTranslation();
  return (
    <main className="shell">
      <div className="horizon" aria-hidden="true">
        <span className="sun" />
      </div>
      <section className="intro" aria-labelledby="title">
        <p className="eyebrow">{t("tagline")}</p>
        <h1 id="title">{t("title")}</h1>
        <p className="description">{t("description")}</p>
        <p className="status">{t("status")}</p>
      </section>
    </main>
  );
}
