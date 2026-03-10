import { FormEvent, useState } from "react";
import { CreatePersonRequest } from "../../types";

interface PersonFormCardProps {
  onSubmit: (payload: CreatePersonRequest) => Promise<boolean>;
}

const initialPersonForm = {
  name: "",
  birthDate: "",
  isRichiedente: false,
};

export function PersonFormCard({ onSubmit }: PersonFormCardProps) {
  const [form, setForm] = useState(initialPersonForm);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const didSave = await onSubmit({
      full_name: form.name,
      birth_date: form.birthDate,
      is_richiedente: form.isRichiedente,
    });

    if (didSave) {
      setForm(initialPersonForm);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Pessoa</h3>
      <input
        placeholder="Nome completo"
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        required
      />
      <input
        type="date"
        value={form.birthDate}
        onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
        required
      />
      <label>
        <input
          type="checkbox"
          checked={form.isRichiedente}
          onChange={(event) =>
            setForm((current) => ({ ...current, isRichiedente: event.target.checked }))
          }
        />
        Richiedente
      </label>
      <button type="submit">Adicionar pessoa</button>
    </form>
  );
}
