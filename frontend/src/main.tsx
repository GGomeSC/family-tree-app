import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "./App";
import { runtimeConfig } from "./config/runtime";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {runtimeConfig.routerMode === "hash" ? (
      <HashRouter>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter basename={runtimeConfig.basePath}>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>
);
