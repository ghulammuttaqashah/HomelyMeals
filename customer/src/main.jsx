import { createRoot } from "react-dom/client";
import AppWrapper from "./App";   // ⬅️ IMPORTANT: import AppWrapper, not App
import "./index.css";

createRoot(document.getElementById("root")).render(
  <AppWrapper />   // ⬅️ MUST render AppWrapper
);
