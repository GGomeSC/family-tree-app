import { useParams } from "react-router-dom";
import { ExportPanelCard } from "../components/family-editor/ExportPanelCard";
import { ParentChildFormCard } from "../components/family-editor/ParentChildFormCard";
import { PersonFormCard } from "../components/family-editor/PersonFormCard";
import { UnionFormCard } from "../components/family-editor/UnionFormCard";
import { HierarchyPreview } from "../components/HierarchyPreview";
import { useFamilyEditorData } from "../hooks/useFamilyEditorData";

export function FamilyEditorPage() {
  const { familyId } = useParams();
  const id = Number(familyId);
  const { error, exports, personOptions, preview, createPerson, createUnion, createParentChild, exportPdf } =
    useFamilyEditorData(id);

  return (
    <main className="container">
      <h2>Editor da Família #{id}</h2>
      {error && <p className="error">{error}</p>}

      <section className="grid-two">
        <PersonFormCard onSubmit={createPerson} />
        <UnionFormCard people={personOptions} onSubmit={createUnion} />
        <ParentChildFormCard people={personOptions} onSubmit={createParentChild} />
        <ExportPanelCard exports={exports} onExport={exportPdf} />
      </section>

      <section className="card">
        <h3>Preview (layout automático)</h3>
        {!preview ? <p>Adicione pessoas e vínculos para visualizar.</p> : <HierarchyPreview preview={preview} />}
      </section>
    </main>
  );
}
