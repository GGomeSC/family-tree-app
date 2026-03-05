export type AppMode = "live" | "mock";
export type RouterMode = "browser" | "hash";

function parseAppMode(value: string | undefined): AppMode {
  return value === "mock" ? "mock" : "live";
}

function parseRouterMode(value: string | undefined): RouterMode {
  return value === "hash" ? "hash" : "browser";
}

function normalizeBasePath(value: string | undefined): string {
  if (!value) return "/";
  let result = value.trim();
  if (!result.startsWith("/")) {
    result = `/${result}`;
  }
  if (!result.endsWith("/")) {
    result = `${result}/`;
  }
  return result;
}

export const runtimeConfig = {
  appMode: parseAppMode(import.meta.env.VITE_APP_MODE),
  routerMode: parseRouterMode(import.meta.env.VITE_ROUTER_MODE),
  basePath: normalizeBasePath(import.meta.env.VITE_BASE_PATH),
};