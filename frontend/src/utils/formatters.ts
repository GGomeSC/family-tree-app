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
  
  if (parts.length === 1) return { firstName: parts[0], restName: "" };

  if (nameDisplayMode === "last-first") {
    return {
      firstName: parts[parts.length - 1],
      restName: parts.slice(0, -1).join(" "),
    };
  }

  return {
    firstName: parts[0],
    restName: parts.slice(1).join(" "),
  };
}
