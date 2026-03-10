import { FormEvent, useState } from "react";
import { CreateParentChildRequest, LayoutPerson } from "../../types";

interface ParentChildFormCardProps {
  people: LayoutPerson[];
  onSubmit: (payload: CreateParentChildRequest) => Promise<boolean>;
}

const initialParentChildForm = {
  parentId: 0,
  childId: 0,
};

function PersonOptions({ people }: { people: LayoutPerson[] }) {
  return (
    <>
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </>
  );
}

export function ParentChildFormCard({ people, onSubmit }: ParentChildFormCardProps) {
  const [form, setForm] = useState(initialParentChildForm);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const didSave = await onSubmit({
      parent_person_id: form.parentId,
      child_person_id: form.childId,
    });

    if (didSave) {
      setForm(initialParentChildForm);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Vínculo pai/mãe-filho(a)</h3>
      <select
        value={form.parentId}
        onChange={(event) => setForm((current) => ({ ...current, parentId: Number(event.target.value) }))}
        required
      >
        <option value={0}>Pessoa ascendente</option>
        <PersonOptions people={people} />
      </select>
      <select
        value={form.childId}
        onChange={(event) => setForm((current) => ({ ...current, childId: Number(event.target.value) }))}
        required
      >
        <option value={0}>Pessoa descendente</option>
        <PersonOptions people={people} />
      </select>
      <button type="submit">Adicionar vínculo</button>
    </form>
  );
}
