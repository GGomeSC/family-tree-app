import { Ref } from "react";
import { LayoutPerson } from "../../types";
import { LegendLanguage } from "../../hooks/useTreeControls";
import { NameDisplayMode } from "../../utils/formatters";

interface TreeNameMenuProps {
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

export function TreeNameMenu({
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
}: TreeNameMenuProps) {
  return (
    <div className="tree-name-menu" ref={menuRef}>
      <button className="tree-name-menu-trigger" onClick={onToggleMenu}>
        ≡
      </button>
      {isOpen && (
        <div className="tree-name-menu-panel">
          <section className="tree-name-menu-section">
            <span className="tree-name-menu-label">Formato</span>
            <button
              className={`tree-name-toggle-track ${nameMode === "last-first" ? "is-last-first" : ""}`}
              onClick={onToggleNameMode}
            >
              <span className="tree-name-toggle-thumb" />
              <span className="tree-name-toggle-option">Nome</span>
              <span className="tree-name-toggle-option">Sobrenome</span>
            </button>
          </section>

          <section className="tree-name-menu-section">
            <button className="tree-name-menu-expandable-trigger" onClick={onToggleApplyTo}>
              <span className="tree-name-menu-label">Aplicar em</span>
              <span>{isApplyToOpen ? "▲" : "▼"}</span>
            </button>
            {isApplyToOpen && (
              <div className="tree-name-node-list">
                {candidates.map((person) => (
                  <label key={person.id} className="tree-name-node-item">
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

          <section className="tree-name-menu-section">
            <span className="tree-name-menu-label">Idioma</span>
            <button
              className={`tree-name-toggle-track ${lang === "it" ? "is-it" : ""}`}
              onClick={onToggleLanguage}
            >
              <span className="tree-name-toggle-thumb" />
              <span className="tree-name-toggle-option">PT</span>
              <span className="tree-name-toggle-option">IT</span>
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
