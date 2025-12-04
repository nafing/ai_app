import { Dexie, type EntityTable } from "dexie";
import { generateUUID } from "./UUID";

export interface Persona {
  id: string;
  isActive: boolean;
  avatar?: string;
  name: string;
  inChatName: string;
  description: string;
  lorebookIds: string[];
}

export interface Character {
  id: string;
  name: string;
  inChatName: string;
  avatar?: string;
  description: string;
  initMessage: string;
  scenario: string;
  lorebookIds: string[];
}

export interface Preset {
  id: string;
  isActive: boolean;
  name: string;
  model: string;
  preHistoryInstructions: string;
  postHistoryInstructions: string;
  impersonationPrompt: string;
  temperature: number;
  repetitionPenalty: number;
  frequencyPenalty: number;
  presencePenalty: number;
  topP: number;
  topK: number;
  contextSize: number;
  maxNewToken: number;
}

export interface Chat {
  id: string;
  name: string;
  characterIds: string[];
  lorebookIds: string[];
  activeBranchId?: string;
}

export interface Message {
  id: string;
  role: string;
  name: string;
  content: string;
  timestamp: number;
  chatId: string;
  avatar?: string;
  branchId?: string;
}

export interface Lorebook {
  id: string;
  name: string;
  description: string;
  content: string;
}

export interface ChatBranch {
  id: string;
  chatId: string;
  name: string;
  parentBranchId: string | null;
  pivotMessageId: string | null;
  createdAt: number;
}

export interface AppSetting {
  key: string;
  value: string;
}

const db = new Dexie("ai_app") as Dexie & {
  personas: EntityTable<Persona, "id">;
  characters: EntityTable<Character, "id">;
  presets: EntityTable<Preset, "id">;
  chats: EntityTable<Chat, "id">;
  messages: EntityTable<Message, "id">;
  lorebooks: EntityTable<Lorebook, "id">;
  chatBranches: EntityTable<ChatBranch, "id">;
  appSettings: EntityTable<AppSetting, "key">;
};

db.version(1).stores({
  personas: "id, avatar, isActive, name, inChatName, description",
  characters:
    "id, avatar, name, inChatName, description, initMessage, scenario",
  presets:
    "id, isActive, name, model, preHistoryInstructions, postHistoryInstructions, impersonationPrompt, temperature, repetitionPenalty, frequencyPenalty, presencePenalty, topP, topK, contextSize, maxNewToken",
  chats: "id, name, characterIds",
  messages: "id, role, name, content, timestamp, chatId",
});

db.version(2)
  .stores({
    personas:
      "id, avatar, isActive, name, inChatName, description, *lorebookIds",
    characters:
      "id, avatar, name, inChatName, description, initMessage, scenario, *lorebookIds",
    presets:
      "id, isActive, name, model, preHistoryInstructions, postHistoryInstructions, impersonationPrompt, temperature, repetitionPenalty, frequencyPenalty, presencePenalty, topP, topK, contextSize, maxNewToken",
    chats: "id, name, characterIds, *lorebookIds",
    messages: "id, role, name, content, timestamp, chatId",
    lorebooks: "id, name",
  })
  .upgrade(async (trans) => {
    await trans
      .table("personas")
      .toCollection()
      .modify((persona: Persona) => {
        persona.lorebookIds = persona.lorebookIds ?? [];
      });

    await trans
      .table("characters")
      .toCollection()
      .modify((character: Character) => {
        character.lorebookIds = character.lorebookIds ?? [];
      });

    await trans
      .table("chats")
      .toCollection()
      .modify((chat: Chat) => {
        chat.lorebookIds = chat.lorebookIds ?? [];
      });
  });

db.version(3)
  .stores({
    personas:
      "id, avatar, isActive, name, inChatName, description, *lorebookIds",
    characters:
      "id, avatar, name, inChatName, description, initMessage, scenario, *lorebookIds",
    presets:
      "id, isActive, name, model, preHistoryInstructions, postHistoryInstructions, impersonationPrompt, temperature, repetitionPenalty, frequencyPenalty, presencePenalty, topP, topK, contextSize, maxNewToken",
    chats: "id, name, characterIds, *lorebookIds, activeBranchId",
    messages: "id, role, name, content, timestamp, chatId, branchId",
    lorebooks: "id, name",
    chatBranches: "id, chatId, parentBranchId",
  })
  .upgrade(async (trans) => {
    const chatTable = trans.table("chats");
    const branchTable = trans.table("chatBranches");
    const messageTable = trans.table("messages");

    const chats = await chatTable.toArray();

    for (const chat of chats) {
      const existingBranchId = chat.activeBranchId;
      const branchId = existingBranchId ?? generateUUID();

      await branchTable.put({
        id: branchId,
        chatId: chat.id,
        name: "Main",
        parentBranchId: null,
        pivotMessageId: null,
        createdAt: Date.now(),
      });

      if (!existingBranchId) {
        chat.activeBranchId = branchId;
        await chatTable.put(chat);
      }

      await messageTable
        .where("chatId")
        .equals(chat.id)
        .modify((message: Message) => {
          if (!message.branchId) {
            message.branchId = branchId;
          }
        });
    }
  });

db.version(4)
  .stores({
    personas:
      "id, avatar, isActive, name, inChatName, description, *lorebookIds",
    characters:
      "id, avatar, name, inChatName, description, initMessage, scenario, *lorebookIds",
    presets:
      "id, isActive, name, model, preHistoryInstructions, postHistoryInstructions, impersonationPrompt, temperature, repetitionPenalty, frequencyPenalty, presencePenalty, topP, topK, contextSize, maxNewToken",
    chats: "id, name, characterIds, *lorebookIds, activeBranchId",
    messages: "id, role, name, content, timestamp, chatId, branchId",
    lorebooks: "id, name",
    chatBranches: "id, chatId, parentBranchId",
    appSettings: "key",
  })
  .upgrade(async () => {
    // No data migration required beyond creating the new table.
  });

export { db };
