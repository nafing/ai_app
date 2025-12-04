const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};

function buildTimestamp(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", TIMESTAMP_OPTIONS);
  const parts = formatter
    .formatToParts(new Date())
    .filter((part) => part.type !== "literal")
    .map((part) => part.value.padStart(part.type === "year" ? 4 : 2, "0"));

  return parts.join("");
}

export function exportEntitiesToFile<T>(entity: string, items: T[]): void {
  const payload = {
    entity,
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };

  const filename = `${entity}-${buildTimestamp()}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function parseImportedEntities<T>(
  entity: string,
  file: File
): Promise<T[]> {
  const text = await file.text();
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Selected file is not valid JSON.");
  }

  if (Array.isArray(json)) {
    return json as T[];
  }

  if (json && typeof json === "object") {
    const payload = json as { entity?: string; items?: unknown };

    if (payload.entity && payload.entity !== entity) {
      throw new Error(
        `Import data is for '${payload.entity}', expected '${entity}'.`
      );
    }

    if (Array.isArray(payload.items)) {
      return payload.items as T[];
    }
  }

  throw new Error(
    "Unsupported import structure. Expected an array or an object with an 'items' array."
  );
}
