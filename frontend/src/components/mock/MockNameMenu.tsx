import { Ref } from "react";
import { LayoutPerson } from "../../types";
import { LegendLanguage } from "../../hooks/useMockPreviewControls";
import { NameDisplayMode } from "../../utils/formatters";

interface MockNameMenuProps {
  menuRef: Ref<HTMLDivElement>;
  isOpen: boolean;
  isApplyToOpen: boolean;
  nameMode: NameDisplayMode;
  lang: LegendLanguage;
  candidates: LayoutPerson[];
  targetIds: number[];
  onToggleMenu: () => void;
  onToggleApplyTo: () => void;
  onToggleNameMode: () => void;
  onToggleLanguage: () => void;
  onToggleTargetId: (personId: number) => void;
}

export function MockNameMenu({
  menuRef,
  isOpen,
  isApplyToOpen,
  nameMode,
  lang,
  candidates,
  targetIds,
  onToggleMenu,
  onToggleApplyTo,
  onToggleNameMode,
  onToggleLanguage,
  onToggleTargetId,
}: MockNameMenuProps) {
  return (
    <div className="mock-name-menu" ref={menuRef}>
      <button className="mock-name-menu-trigger" onClick={onToggleMenu}>
        ≡
      </button>
      {isOpen && (
        <div className="mock-name-menu-panel">
          <section className="mock-name-menu-section">
            <span className="mock-name-menu-label">Formato</span>
            <button
              className={`mock-name-toggle-track ${nameMode === "last-first" ? "is-last-first" : ""}`}
              onClick={onToggleNameMode}
            >
              <span className="mock-name-toggle-thumb" />
              <span className="mock-name-toggle-option">Nome</span>
              <span className="mock-name-toggle-option">Sobrenome</span>
            </button>
          </section>

          <section className="mock-name-menu-section">
            <button className="mock-name-menu-expandable-trigger" onClick={onToggleApplyTo}>
              <span className="mock-name-menu-label">Aplicar em</span>
              <span>{isApplyToOpen ? "▲" : "▼"}</span>
            </button>
            {isApplyToOpen && (
              <div className="mock-name-node-list">
                {candidates.map((person) => (
                  <label key={person.id} className="mock-name-node-item">
                    <input
                      type="checkbox"
                      checked={targetIds.includes(person.id)}
                      onChange={() => onToggleTargetId(person.id)}
                    />
                    <span>{person.name}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="mock-name-menu-section">
            <span className="mock-name-menu-label">Idioma</span>
            <button
              className={`mock-name-toggle-track ${lang === "it" ? "is-it" : ""}`}
              onClick={onToggleLanguage}
            >
              <span className="mock-name-toggle-thumb" />
              <span className="mock-name-toggle-option">PT</span>
              <span className="mock-name-toggle-option">IT</span>
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
