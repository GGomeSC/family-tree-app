import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../api/client";
import { LAYOUT } from "../config/layout";
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

  const [virtualCounter, setVirtualCounter] = useState(-1);

  const loadData = useCallback(async () => {
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
  }, [familyId]);

  useEffect(() => {
    loadData().catch((err) => console.error(err));
  }, [loadData]);

  const runMutation = useCallback(
    async (action: () => Promise<unknown>) => {
      setError("");

      try {
        await action();
        await loadData();
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [loadData]
  );

  const addVirtualEntity = useCallback(
    (type: "parent" | "sibling" | "partner" | "child", targetId: number) => {
      setPreview((currentPreview) => {
        if (!currentPreview) return null;

        const target = currentPreview.persons.find((p) => p.id === targetId);
        if (!target) return currentPreview;

        const newPreview = { ...currentPreview };
        let currentVId = virtualCounter;

        const getNextVId = () => {
          const id = currentVId;
          currentVId -= 1;
          return id;
        };

        const verticalGap = LAYOUT.NODE_HEIGHT + LAYOUT.PAD_Y * 2;
        const horizontalGap = LAYOUT.NODE_WIDTH + 40;

        if (type === "parent") {
          const parentEdges = currentPreview.edges.filter((e) => e.to_id === targetId);

          if (parentEdges.length === 0) {
            const p1Id = getNextVId();
            const p2Id = getNextVId();
            const uId = getNextVId();

            newPreview.persons = [
              ...newPreview.persons,
              {
                id: p1Id,
                name: "Pai/Mãe 1",
                birth_date: "",
                is_virtual: true,
                is_richiedente: false,
                x: target.x - horizontalGap / 2,
                y: target.y - verticalGap,
                role: "lineage",
                page: target.page,
              },
              {
                id: p2Id,
                name: "Pai/Mãe 2",
                birth_date: "",
                is_virtual: true,
                is_richiedente: false,
                x: target.x + horizontalGap / 2,
                y: target.y - verticalGap,
                role: "spouse",
                page: target.page,
              },
            ];

            newPreview.unions = [
              ...newPreview.unions,
              { id: uId, partner_a_person_id: p1Id, partner_b_person_id: p2Id, marriage_date: null },
            ];

            newPreview.edges = [
              ...newPreview.edges,
              { from_id: p1Id, to_id: targetId, via_union_id: uId, from_page: target.page, to_page: target.page },
            ];
          } else {
            const pId = getNextVId();
            const uId = getNextVId();
            const existingParentId = parentEdges[0].from_id;
            const existingParent = currentPreview.persons.find(p => p.id === existingParentId);

            newPreview.persons = [
              ...newPreview.persons,
              {
                id: pId,
                name: "Pai/Mãe",
                birth_date: "",
                is_virtual: true,
                is_richiedente: false,
                x: (existingParent?.x ?? target.x) + horizontalGap,
                y: (existingParent?.y ?? target.y - verticalGap),
                role: "spouse",
                page: target.page,
              },
            ];

            newPreview.unions = [
              ...newPreview.unions,
              { id: uId, partner_a_person_id: existingParentId, partner_b_person_id: pId, marriage_date: null },
            ];

            newPreview.edges = newPreview.edges.map((e) =>
              e.from_id === existingParentId && e.to_id === targetId ? { ...e, via_union_id: uId } : e
            );
          }
        } else if (type === "child") {
          const vId = getNextVId();
          newPreview.persons = [
            ...newPreview.persons,
            {
              id: vId,
              name: "Filho(a)",
              birth_date: "",
              is_virtual: true,
              is_richiedente: false,
              x: target.x,
              y: target.y + verticalGap,
              role: "lineage",
              page: target.page,
            },
          ];
          newPreview.edges = [
            ...newPreview.edges,
            { from_id: targetId, to_id: vId, via_union_id: null, from_page: target.page, to_page: target.page },
          ];
        } else if (type === "partner") {
          const vId = getNextVId();
          const uId = getNextVId();
          newPreview.persons = [
            ...newPreview.persons,
            {
              id: vId,
              name: "Cônjuge",
              birth_date: "",
              is_virtual: true,
              is_richiedente: false,
              x: target.x + horizontalGap,
              y: target.y,
              role: "spouse",
              page: target.page,
            },
          ];
          newPreview.unions = [
            ...newPreview.unions,
            { id: uId, partner_a_person_id: targetId, partner_b_person_id: vId, marriage_date: null },
          ];
        } else if (type === "sibling") {
          const vId = getNextVId();
          newPreview.persons = [
            ...newPreview.persons,
            {
              id: vId,
              name: "Irmão(ã)",
              birth_date: "",
              is_virtual: true,
              is_richiedente: false,
              x: target.x + horizontalGap,
              y: target.y,
              role: "lineage",
              page: target.page,
            },
          ];

          const targetEdges = currentPreview.edges.filter((e) => e.to_id === targetId);
          if (targetEdges.length > 0) {
            targetEdges.forEach((e) => {
              newPreview.edges = [...newPreview.edges, { ...e, to_id: vId }];
            });
          }
        }

        setVirtualCounter(currentVId);
        return newPreview;
      });
    },
    [virtualCounter]
  );

  const saveVirtualPerson = useCallback(
    async (vId: number, payload: CreatePersonRequest) => {
      if (!preview) return false;

      setError("");
      try {
        const newPerson = await api.createPerson(familyId, payload);

        const vEdges = preview.edges.filter((e) => e.from_id === vId || e.to_id === vId);
        const vUnions = preview.unions.filter((u) => u.partner_a_person_id === vId || u.partner_b_person_id === vId);

        for (const edge of vEdges) {
          const fromId = edge.from_id === vId ? newPerson.id : edge.from_id;
          const toId = edge.to_id === vId ? newPerson.id : edge.to_id;
          await api.createParentChild(familyId, { parent_person_id: fromId, child_person_id: toId });
        }

        for (const union of vUnions) {
          const aId = union.partner_a_person_id === vId ? newPerson.id : union.partner_a_person_id;
          const bId = union.partner_b_person_id === vId ? newPerson.id : union.partner_b_person_id;
          await api.createUnion(familyId, { partner_a_person_id: aId, partner_b_person_id: bId });
        }

        await loadData();
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [familyId, loadData, preview]
  );

  const deletePerson = useCallback(
    async (personId: number) => {
      if (personId < 0) {
        setPreview((currentPreview) => {
          if (!currentPreview) return null;
          const newPreview = { ...currentPreview };
          newPreview.persons = newPreview.persons.filter((p) => p.id !== personId);
          newPreview.edges = newPreview.edges.filter((e) => e.from_id !== personId && e.to_id !== personId);
          newPreview.unions = newPreview.unions.filter(
            (u) => u.partner_a_person_id !== personId && u.partner_b_person_id !== personId
          );
          return newPreview;
        });
        return true;
      }

      return runMutation(() => api.deletePerson(familyId, personId));
    },
    [familyId, runMutation]
  );

  const createPerson = useCallback(
    (payload: CreatePersonRequest) => runMutation(() => api.createPerson(familyId, payload)),
    [familyId, runMutation]
  );
  const createUnion = useCallback(
    (payload: CreateUnionRequest) => runMutation(() => api.createUnion(familyId, payload)),
    [familyId, runMutation]
  );
  const createParentChild = useCallback(
    (payload: CreateParentChildRequest) => runMutation(() => api.createParentChild(familyId, payload)),
    [familyId, runMutation]
  );
  const exportPdf = useCallback(() => runMutation(() => api.exportPdf(familyId)), [familyId, runMutation]);

  return {
    persons,
    preview,
    exports,
    error,
    createPerson,
    createUnion,
    createParentChild,
    exportPdf,
    addVirtualEntity,
    saveVirtualPerson,
    deletePerson,
  };
}
