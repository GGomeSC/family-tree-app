import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "./App";
import { MockApp } from "./app/MockApp";
import { runtimeConfig } from "./config/runtime";
import "./styles.css";

const RootApp = runtimeConfig.appMode === "mock" ? MockApp : App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {runtimeConfig.routerMode === "hash" ? (
      <HashRouter>
        <RootApp />
      </HashRouter>
    ) : (
      <BrowserRouter basename={runtimeConfig.basePath}>
        <RootApp />
      </BrowserRouter>
    )}
  </React.StrictMode>
);
