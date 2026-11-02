import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return (
    <main className="shell">
      <div className="horizon" aria-hidden="true">
        <span className="sun" />
      </div>
      <section className="intro" aria-labelledby="title">
        <p className="eyebrow">A card game prototype</p>
        <h1 id="title">
          Dusk <span>&amp;</span> Dawn
        </h1>
        <p className="description">A new story is taking shape.</p>
        <p className="status">Prototype foundation</p>
      </section>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
