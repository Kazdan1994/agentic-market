import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <main className="p-8 text-lg">Agentic Market</main>
  </StrictMode>,
);
