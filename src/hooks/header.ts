import { db } from "../utils/db";
import { generateUUID } from "../utils/UUID";
import { OPENROUTER_API_KEY_SETTING } from "../utils/openrouter";
import { createPlaceholderResolver } from "./usePlaceholderResolver";

export const resetConversation = async (chatId: string | undefined) => {
  if (!chatId) return;

  const chat = await db.chats.get(chatId);
  if (!chat) {
    return;
  }

  const characters = await db.characters
    .where("id")
    .anyOf(chat.characterIds)
    .toArray();

  const activePersona = await db.personas
    .filter((persona) => persona.isActive)
    .first();

  const selectedCharacter = characters[0];

  const defaultBranchId = generateUUID();

  await db.transaction(
    "rw",
    db.messages,
    db.chatBranches,
    db.chats,
    async () => {
      await db.messages.where("chatId").equals(chatId).delete();
      await db.chatBranches.where("chatId").equals(chatId).delete();

      await db.chatBranches.add({
        id: defaultBranchId,
        chatId,
        name: "Main",
        parentBranchId: null,
        pivotMessageId: null,
        createdAt: Date.now(),
      });

      await db.chats.update(chatId, {
        activeBranchId: defaultBranchId,
      });

      if (selectedCharacter?.initMessage?.trim()) {
        const characterName =
          selectedCharacter.inChatName?.trim() ||
          selectedCharacter.name?.trim() ||
          "Assistant";

        const userName =
          activePersona?.inChatName?.trim() ||
          activePersona?.name?.trim() ||
          "You";

        const resolvePlaceholders = createPlaceholderResolver(
          characterName,
          userName
        );

        await db.messages.add({
          id: generateUUID(),
          role: "assistant",
          name: characterName,
          content: resolvePlaceholders(selectedCharacter.initMessage),
          timestamp: Date.now(),
          chatId,
          avatar: selectedCharacter.avatar,
          branchId: defaultBranchId,
        });
      }
    }
  );
};

export const getAllPresets = async () => {
  return await db.presets.toArray();
};

export const getActivePresetID = async () => {
  const activePreset = await db.presets
    .filter((preset) => preset.isActive)
    .first();
  return activePreset?.id || null;
};

export const updateActivePreset = async (presetId: string | null) => {
  await db.transaction("rw", db.presets, async () => {
    const allPresets = await db.presets.toArray();
    for (const preset of allPresets) {
      if (preset.id === presetId) {
        await db.presets.update(preset.id, { isActive: true });
      } else if (preset.isActive) {
        await db.presets.update(preset.id, { isActive: false });
      }
    }
  });
};

export const getAllPersonas = async () => {
  return await db.personas.toArray();
};

export const getActivePersonaID = async () => {
  const activePersona = await db.personas
    .filter((persona) => persona.isActive)
    .first();
  return activePersona?.id || null;
};

export const updateActivePersona = async (personaId: string | null) => {
  await db.transaction("rw", db.personas, async () => {
    const allPersonas = await db.personas.toArray();
    for (const persona of allPersonas) {
      if (persona.id === personaId) {
        await db.personas.update(persona.id, { isActive: true });
      } else if (persona.isActive) {
        await db.personas.update(persona.id, { isActive: false });
      }
    }
  });
};

export const getOpenRouterApiKey = async (): Promise<string> => {
  const record = await db.appSettings.get(OPENROUTER_API_KEY_SETTING);
  return record?.value ?? "";
};

export const upsertOpenRouterApiKey = async (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    await db.appSettings.delete(OPENROUTER_API_KEY_SETTING);
    return;
  }

  await db.appSettings.put({
    key: OPENROUTER_API_KEY_SETTING,
    value: trimmed,
  });
};
