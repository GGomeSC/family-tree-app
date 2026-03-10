export type NameDisplayMode = "first-first" | "last-first";
export interface FormattedNodeName {
  firstName: string;
  restName: string;
}

export function formatDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

export function formatNodeName(value: string, nameDisplayMode: NameDisplayMode): FormattedNodeName {
  const normalized = value.trim().replace(/\s+/g, " ") || "Pessoa sem nome";
  const parts = normalized.split(" ");
  const [firstPart = "Pessoa sem nome"] = parts;
  const lastPart = parts[parts.length - 1] ?? firstPart;
  
  if (parts.length === 1) return { firstName: firstPart, restName: "" };

  if (nameDisplayMode === "last-first") {
    return {
      firstName: lastPart,
      restName: parts.slice(0, -1).join(" "),
    };
  }

  return {
    firstName: firstPart,
    restName: parts.slice(1).join(" "),
  };
}
