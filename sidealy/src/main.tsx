import React from "react";
import { initBotId } from "botid/client/core";

initBotId({
  protect: [{ method: "POST", path: "/api/chat" }],
});

import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
