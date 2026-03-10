import { api } from "../../api/client";
import { ExportItem } from "../../types";

interface ExportPanelCardProps {
  exports: ExportItem[];
  onExport: () => Promise<boolean>;
}

export function ExportPanelCard({ exports, onExport }: ExportPanelCardProps) {
  return (
    <section className="card">
      <h3>Exportação</h3>
      <button type="button" onClick={() => void onExport()}>
        Gerar PDF
      </button>
      <ul className="list">
        {exports.map((item) => (
          <li key={item.id}>
            <a href={api.downloadExportUrl(item.id)} target="_blank" rel="noreferrer">
              Export #{item.id} - {new Date(item.created_at).toLocaleString("pt-BR")}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
