import { useEffect, useState } from "react";
import { ApiError, api } from "../api/client";
import {
  CreateParentChildRequest,
  CreatePersonRequest,
  CreateUnionRequest,
  ExportItem,
  LayoutPreview,
  Person,
} from "../types";

const EMPTY_PREVIEW_DETAIL = "Family has no persons";

function isEmptyPreviewError(error: unknown) {
  return error instanceof ApiError && error.status === 400 && error.detail === EMPTY_PREVIEW_DETAIL;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro na API";
}

export function useFamilyEditorData(familyId: number) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [preview, setPreview] = useState<LayoutPreview | null>(null);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [error, setError] = useState("");

  async function loadData() {
    const [personsResult, previewResult, exportsResult] = await Promise.allSettled([
      api.listPersons(familyId),
      api.preview(familyId),
      api.listExports(familyId),
    ]);

    let nextError: unknown = null;

    if (personsResult.status === "fulfilled") {
      setPersons(personsResult.value);
    } else {
      setPersons([]);
      nextError = personsResult.reason;
    }

    if (previewResult.status === "fulfilled") {
      setPreview(previewResult.value);
    } else if (isEmptyPreviewError(previewResult.reason)) {
      setPreview(null);
    } else {
      setPreview(null);
      nextError ??= previewResult.reason;
    }

    if (exportsResult.status === "fulfilled") {
      setExports(exportsResult.value);
    } else {
      setExports([]);
    }

    if (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    }

    setError("");
  }

  useEffect(() => {
    loadData().catch((err) => console.error(err));
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
    persons,
    preview,
    exports,
    error,
    createPerson: (payload: CreatePersonRequest) => runMutation(() => api.createPerson(familyId, payload)),
    createUnion: (payload: CreateUnionRequest) => runMutation(() => api.createUnion(familyId, payload)),
    createParentChild: (payload: CreateParentChildRequest) =>
      runMutation(() => api.createParentChild(familyId, payload)),
    exportPdf: () => runMutation(() => api.exportPdf(familyId)),
  };
}
