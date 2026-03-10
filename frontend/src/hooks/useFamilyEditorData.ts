import { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  CreateParentChildRequest,
  CreatePersonRequest,
  CreateUnionRequest,
  ExportItem,
  LayoutPerson,
  LayoutPreview,
} from "../types";

async function swallowError<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export function useFamilyEditorData(familyId: number) {
  const [preview, setPreview] = useState<LayoutPreview | null>(null);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      const [nextPreview, nextExports] = await Promise.all([
        swallowError(api.preview(familyId), null),
        swallowError(api.listExports(familyId), []),
      ]);
      setPreview(nextPreview);
      setExports(nextExports);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    void loadData();
  }, [familyId]);

  async function runMutation(action: () => Promise<unknown>) {
    setError("");

    try {
      await action();
      await loadData();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }

  return {
    preview,
    exports,
    error,
    personOptions: preview?.persons ?? ([] as LayoutPerson[]),
    createPerson: (payload: CreatePersonRequest) => runMutation(() => api.createPerson(familyId, payload)),
    createUnion: (payload: CreateUnionRequest) => runMutation(() => api.createUnion(familyId, payload)),
    createParentChild: (payload: CreateParentChildRequest) =>
      runMutation(() => api.createParentChild(familyId, payload)),
    exportPdf: () => runMutation(() => api.exportPdf(familyId)),
  };
}
