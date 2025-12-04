import { useMemo } from "react";

const normaliseName = (value?: string | null, fallback: string = "") =>
  (value ?? "").trim() || fallback;

export const createPlaceholderResolver = (
  characterName?: string | null,
  userName?: string | null
) => {
  const character = normaliseName(characterName, "Assistant");
  const user = normaliseName(userName, "You");

  return (input?: string | null) => {
    if (!input) {
      return "";
    }

    return input
      .replaceAll("{{char}}", character)
      .replaceAll("{{user}}", user);
  };
};

export const usePlaceholderResolver = (
  characterName?: string | null,
  userName?: string | null
) => {
  return useMemo(
    () => createPlaceholderResolver(characterName, userName),
    [characterName, userName]
  );
};
