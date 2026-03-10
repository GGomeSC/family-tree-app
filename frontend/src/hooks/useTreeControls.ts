import { useMemo, useReducer } from "react";
import { getResponsivePreviewScale } from "../config/layout";
import { LayoutPerson } from "../types";
import { NameDisplayMode } from "../utils/formatters";

export type ZoomMode = "auto" | "manual";
export type LegendLanguage = "pt" | "it";

interface TreeControlsState {
  detailsOpen: boolean;
  mobileDetailsOpen: boolean;
  zoomMode: ZoomMode;
  nameMode: NameDisplayMode;
  isNameMenuOpen: boolean;
  lang: LegendLanguage;
  zoomFactor: number;
  width: number;
  isApplyToOpen: boolean;
}

type Action =
  | { type: "toggleDetails" }
  | { type: "openDetails" }
  | { type: "toggleMobileDetails" }
  | { type: "openMobileDetails" }
  | { type: "closeMobileDetails" }
  | { type: "toggleNameMenu" }
  | { type: "closeNameMenu" }
  | { type: "toggleApplyTo" }
  | { type: "toggleNameMode" }
  | { type: "toggleLanguage" }
  | { type: "zoomIn" }
  | { type: "zoomOut" }
  | { type: "resetZoom" }
  | { type: "setWidth"; width: number };

const initialState: TreeControlsState = {
  detailsOpen: true,
  mobileDetailsOpen: false,
  zoomMode: "auto",
  nameMode: "first-first",
  isNameMenuOpen: false,
  lang: "pt",
  zoomFactor: 1,
  width: 0,
  isApplyToOpen: false,
};

function reducer(state: TreeControlsState, action: Action): TreeControlsState {
  switch (action.type) {
    case "toggleDetails":
      return { ...state, detailsOpen: !state.detailsOpen };
    case "openDetails":
      return { ...state, detailsOpen: true };
    case "toggleMobileDetails":
      return { ...state, mobileDetailsOpen: !state.mobileDetailsOpen };
    case "openMobileDetails":
      return { ...state, mobileDetailsOpen: true };
    case "closeMobileDetails":
      return { ...state, mobileDetailsOpen: false };
    case "toggleNameMenu":
      return { ...state, isNameMenuOpen: !state.isNameMenuOpen };
    case "closeNameMenu":
      return { ...state, isNameMenuOpen: false };
    case "toggleApplyTo":
      return { ...state, isApplyToOpen: !state.isApplyToOpen };
    case "toggleNameMode":
      return {
        ...state,
        nameMode: state.nameMode === "last-first" ? "first-first" : "last-first",
      };
    case "toggleLanguage":
      return { ...state, lang: state.lang === "it" ? "pt" : "it" };
    case "zoomIn":
      return {
        ...state,
        zoomMode: "manual",
        zoomFactor: Math.min(3, state.zoomFactor + 0.1),
      };
    case "zoomOut":
      return {
        ...state,
        zoomMode: "manual",
        zoomFactor: Math.max(0.2, state.zoomFactor - 0.1),
      };
    case "resetZoom":
      return { ...state, zoomMode: "auto", zoomFactor: 1 };
    case "setWidth":
      return { ...state, width: action.width };
    default:
      return state;
  }
}

export function useTreeControls(persons: LayoutPerson[]) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const finalScale = useMemo(() => {
    const zoomFactor = state.zoomMode === "auto" ? 1 : state.zoomFactor;
    return getResponsivePreviewScale(persons, state.width, zoomFactor);
  }, [persons, state.width, state.zoomFactor, state.zoomMode]);

  const actions = useMemo(
    () => ({
      toggleDetails: () => dispatch({ type: "toggleDetails" }),
      openDetails: () => dispatch({ type: "openDetails" }),
      toggleMobileDetails: () => dispatch({ type: "toggleMobileDetails" }),
      openMobileDetails: () => dispatch({ type: "openMobileDetails" }),
      closeMobileDetails: () => dispatch({ type: "closeMobileDetails" }),
      toggleNameMenu: () => dispatch({ type: "toggleNameMenu" }),
      closeNameMenu: () => dispatch({ type: "closeNameMenu" }),
      toggleApplyTo: () => dispatch({ type: "toggleApplyTo" }),
      toggleNameMode: () => dispatch({ type: "toggleNameMode" }),
      toggleLanguage: () => dispatch({ type: "toggleLanguage" }),
      zoomIn: () => dispatch({ type: "zoomIn" }),
      zoomOut: () => dispatch({ type: "zoomOut" }),
      resetZoom: () => dispatch({ type: "resetZoom" }),
      setWidth: (width: number) => dispatch({ type: "setWidth", width }),
    }),
    []
  );

  return {
    state,
    finalScale,
    actions,
  };
}
