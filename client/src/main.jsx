// client/src/main.jsx
import React from "react";                      // <- ADD THIS LINE
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css"; // if you have global CSS (optional)

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);
root.render(<App />);
