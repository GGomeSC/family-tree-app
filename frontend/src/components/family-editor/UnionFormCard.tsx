import { FormEvent, useState } from "react";
import { CreateUnionRequest, Person } from "../../types";

interface UnionFormCardProps {
  people: Person[];
  onSubmit: (payload: CreateUnionRequest) => Promise<boolean>;
}

const initialUnionForm = {
  partnerA: 0,
  partnerB: 0,
  marriageDate: "",
};

function PersonOptions({ people }: { people: Person[] }) {
  return (
    <>
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.full_name}
        </option>
      ))}
    </>
  );
}

export function UnionFormCard({ people, onSubmit }: UnionFormCardProps) {
  const [form, setForm] = useState(initialUnionForm);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload: CreateUnionRequest = {
      partner_a_person_id: form.partnerA,
      partner_b_person_id: form.partnerB,
    };

    if (form.marriageDate) {
      payload.marriage_date = form.marriageDate;
    }

    const didSave = await onSubmit(payload);

    if (didSave) {
      setForm(initialUnionForm);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>União</h3>
      <select
        value={form.partnerA}
        onChange={(event) => setForm((current) => ({ ...current, partnerA: Number(event.target.value) }))}
        required
      >
        <option value={0}>Parceiro A</option>
        <PersonOptions people={people} />
      </select>
      <select
        value={form.partnerB}
        onChange={(event) => setForm((current) => ({ ...current, partnerB: Number(event.target.value) }))}
        required
      >
        <option value={0}>Parceiro B</option>
        <PersonOptions people={people} />
      </select>
      <input
        type="date"
        value={form.marriageDate}
        onChange={(event) => setForm((current) => ({ ...current, marriageDate: event.target.value }))}
      />
      <button type="submit">Adicionar união</button>
    </form>
  );
}
