import { createFileRoute } from "@tanstack/react-router";
import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Messages from "../../../components/Chat/Messages";
import Input from "../../../components/Chat/Input";
import { db, type Lorebook, type Message } from "../../../utils/db";
import { getOpenRouterClient } from "../../../utils/openrouter";
import { generateUUID } from "../../../utils/UUID";
import { usePlaceholderResolver } from "../../../hooks/usePlaceholderResolver";

export const Route = createFileRoute("/conversation/$chatId/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    let chat = await db.chats.get(params.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const chatId = chat.id;

    const activePersona = await db.personas.filter((p) => p.isActive).first();
    const activePreset = await db.presets.filter((p) => p.isActive).first();

    const characters = await db.characters
      .where("id")
      .anyOf(chat.characterIds)
      .toArray();
    const lorebookIdSet = new Set<string>();

    chat.lorebookIds?.forEach((id) => lorebookIdSet.add(id));
    characters.forEach((character) => {
      character.lorebookIds?.forEach((id) => lorebookIdSet.add(id));
    });
    activePersona?.lorebookIds?.forEach((id) => lorebookIdSet.add(id));

    const lorebooks = lorebookIdSet.size
      ? await db.lorebooks
          .where("id")
          .anyOf([...lorebookIdSet])
          .toArray()
      : [];

    let branches = await db.chatBranches
      .where("chatId")
      .equals(chatId)
      .toArray();

    let activeBranchId = chat.activeBranchId;

    if (branches.length === 0 || !activeBranchId) {
      const defaultBranchId = activeBranchId ?? generateUUID();

      await db.transaction(
        "rw",
        db.chatBranches,
        db.chats,
        db.messages,
        async () => {
          await db.chatBranches.put({
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

          await db.messages
            .where("chatId")
            .equals(chatId)
            .modify((message) => {
              if (!message.branchId) {
                message.branchId = defaultBranchId;
              }
            });
        }
      );

      chat = (await db.chats.get(chatId))!;
      activeBranchId = chat.activeBranchId;
      branches = await db.chatBranches
        .where("chatId")
        .equals(chatId)
        .toArray();
    }

    const branchMessages = await db.messages
      .where("chatId")
      .equals(chatId)
      .and((message) => message.branchId === activeBranchId)
      .toArray();

    return {
      chat,
      activePersona,
      activePreset,
      characters,
      messages: branchMessages,
      lorebooks,
      branches,
      activeBranchId,
    };
  },
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();
  const {
    chat,
    activePersona,
    activePreset,
    characters,
    lorebooks,
    branches: initialBranches,
    activeBranchId: initialActiveBranchId,
  } = loaderData;

  const viewport = useRef<HTMLDivElement>(null);
  const scrollToBottom = useCallback(() => {
    const element = viewport.current;
    if (!element) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, []);

  const [activeBranchId, setActiveBranchId] = useState<string | null>(
    initialActiveBranchId ?? null
  );

  const branchesLive = useLiveQuery(
    () => db.chatBranches.where("chatId").equals(chat.id).toArray(),
    [chat.id]
  );

  const branches = useMemo(() => {
    const source = branchesLive ?? initialBranches ?? [];
    return [...source].sort((a, b) => a.createdAt - b.createdAt);
  }, [branchesLive, initialBranches]);

  useEffect(() => {
    if (!branches.length) {
      return;
    }

    const hasActive = activeBranchId
      ? branches.some((branch) => branch.id === activeBranchId)
      : false;

    if (!hasActive) {
      const fallback = branches[branches.length - 1] ?? branches[0];
      if (fallback) {
        setActiveBranchId(fallback.id);
        void db.chats.update(chat.id, { activeBranchId: fallback.id });
      }
    }
  }, [activeBranchId, branches, chat.id]);

  const messages = useLiveQuery(
    async () => {
      if (!activeBranchId) {
        return [] as Message[];
      }

      return db.messages
        .where("chatId")
        .equals(chat.id)
        .and((message) => message.branchId === activeBranchId)
        .toArray();
    },
    [chat.id, activeBranchId],
    activeBranchId === initialActiveBranchId ? loaderData.messages : []
  );

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    () => characters[0]?.id ?? null
  );

  useEffect(() => {
    if (!selectedCharacterId && characters[0]) {
      setSelectedCharacterId(characters[0].id);
    }
  }, [characters, selectedCharacterId]);

  const selectedCharacter = useMemo(() => {
    return (
      characters.find((character) => character.id === selectedCharacterId) ??
      characters[0] ??
      null
    );
  }, [characters, selectedCharacterId]);

  const characterDisplayName = useMemo(() => {
    return (
      selectedCharacter?.inChatName?.trim() ||
      selectedCharacter?.name?.trim() ||
      "Assistant"
    );
  }, [selectedCharacter]);

  const userDisplayName = useMemo(() => {
    return (
      activePersona?.inChatName?.trim() || activePersona?.name?.trim() || "You"
    );
  }, [activePersona]);

  const resolvePlaceholders = usePlaceholderResolver(
    characterDisplayName,
    userDisplayName
  );

  const hasAnyMessages = useMemo(() => {
    if (messages) {
      return messages.length > 0;
    }

    return loaderData.messages.length > 0;
  }, [loaderData.messages.length, messages]);

  useEffect(() => {
    const seedCharacter = selectedCharacter;

    if (
      !seedCharacter ||
      hasAnyMessages ||
      !seedCharacter.initMessage?.trim() ||
      !activeBranchId
    ) {
      return;
    }

    const persistInitialMessage = async () => {
      await db.transaction("rw", db.messages, async () => {
        const existingMessages = await db.messages
          .where("chatId")
          .equals(chat.id)
          .and((message) => message.branchId === activeBranchId)
          .count();

        if (existingMessages > 0) {
          return;
        }

        await db.messages.add({
          id: generateUUID(),
          role: "assistant",
          name: seedCharacter.inChatName ?? seedCharacter.name,
          content: resolvePlaceholders(seedCharacter.initMessage),
          timestamp: Date.now(),
          chatId: chat.id,
          avatar: seedCharacter.avatar,
          branchId: activeBranchId,
        });
      });
    };

    void persistInitialMessage();
  }, [
    activeBranchId,
    chat.id,
    hasAnyMessages,
    resolvePlaceholders,
    selectedCharacter,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [activeBranchId, messages?.length, scrollToBottom]);

  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messagePendingDeletion, setMessagePendingDeletion] =
    useState<Message | null>(null);

  const requestDeleteMessage = useCallback((message: Message) => {
    setMessagePendingDeletion(message);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setMessagePendingDeletion(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const pending = messagePendingDeletion;
    if (!pending || !activeBranchId) {
      return;
    }

    await db.transaction("rw", db.messages, async () => {
      const history = await db.messages
        .where("chatId")
        .equals(chat.id)
        .and((message) => message.branchId === activeBranchId)
        .toArray();

      const sorted = history
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);

      const targetIndex = sorted.findIndex((message) => message.id === pending.id);
      if (targetIndex === -1) {
        return;
      }

      const idsToDelete = sorted.slice(targetIndex).map((message) => message.id);
      await db.messages.bulkDelete(idsToDelete);
    });

    setMessagePendingDeletion(null);
  }, [activeBranchId, chat.id, messagePendingDeletion]);

  useEffect(() => {
    setMessagePendingDeletion(null);
  }, [activeBranchId]);

  const branchIndex = useMemo(() => {
    if (!activeBranchId) {
      return -1;
    }

    return branches.findIndex((branch) => branch.id === activeBranchId);
  }, [activeBranchId, branches]);

  const branchLabel = useMemo(() => {
    if (branchIndex === -1 || branches.length === 0) {
      return undefined;
    }

    const branch = branches[branchIndex];
    const name = branch?.name?.trim() || `Branch ${branchIndex + 1}`;
    return `${name} (${branchIndex + 1}/${branches.length})`;
  }, [branchIndex, branches]);

  const canNavigatePrev = branchIndex > 0;
  const canNavigateNext = branchIndex >= 0 && branchIndex < branches.length - 1;

  const handleNavigateBranch = useCallback(
    async (direction: "previous" | "next") => {
      if (branchIndex === -1) {
        return;
      }

      const targetIndex =
        direction === "previous" ? branchIndex - 1 : branchIndex + 1;

      const targetBranch = branches[targetIndex];
      if (!targetBranch) {
        return;
      }

      setActiveBranchId(targetBranch.id);
      setMessagePendingDeletion(null);
      await db.chats.update(chat.id, { activeBranchId: targetBranch.id });
    },
    [branchIndex, branches, chat.id]
  );

  const handleCreateBranch = useCallback(
    async (pivotMessage: Message) => {
      if (!activeBranchId) {
        setErrorMessage("No active branch is available.");
        return;
      }

      const newBranchId = generateUUID();

      try {
        await db.transaction(
          "rw",
          db.chatBranches,
          db.messages,
          db.chats,
          async () => {
            const existingBranches = await db.chatBranches
              .where("chatId")
              .equals(chat.id)
              .toArray();

            const branchName = `Branch ${existingBranches.length + 1}`;

            await db.chatBranches.add({
              id: newBranchId,
              chatId: chat.id,
              name: branchName,
              parentBranchId: activeBranchId,
              pivotMessageId: pivotMessage.id,
              createdAt: Date.now(),
            });

            const activeMessages = await db.messages
              .where("chatId")
              .equals(chat.id)
              .and((message) => message.branchId === activeBranchId)
              .toArray();

            const sortedActive = activeMessages
              .slice()
              .sort((a, b) => a.timestamp - b.timestamp);

            const pivotIndex = sortedActive.findIndex(
              (message) => message.id === pivotMessage.id
            );

            if (pivotIndex === -1) {
              throw new Error("The selected message is no longer available.");
            }

            const messagesToCopy = sortedActive
              .slice(0, pivotIndex + 1)
              .map((message) => ({
                ...message,
                id: generateUUID(),
                branchId: newBranchId,
              }));

            if (messagesToCopy.length > 0) {
              await db.messages.bulkAdd(messagesToCopy);
            }

            await db.chats.update(chat.id, { activeBranchId: newBranchId });
          }
        );

        setActiveBranchId(newBranchId);
        setErrorMessage(null);
        scrollToBottom();
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Failed to create a branch.";
        setErrorMessage(description);
      }
    },
    [activeBranchId, chat.id, scrollToBottom]
  );

  const missingRequirements = useMemo(() => {
    const issues: string[] = [];

    if (!activePreset) {
      issues.push("activate at least one preset");
    }

    if (characters.length === 0) {
      issues.push("add a character to this chat");
    }

    if (!selectedCharacterId) {
      issues.push("select which character should answer");
    }

    return issues;
  }, [activePreset, characters, selectedCharacterId]);

  const normaliseAssistantContent = useCallback((content: unknown): string => {
    if (!content) {
      return "";
    }

    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item && typeof item === "object" && "text" in item) {
            return typeof item.text === "string" ? item.text : "";
          }

          return "";
        })
        .join("");
    }

    return "";
  }, []);

  const composeSystemInstruction = useCallback(() => {
    if (!activePreset) {
      return "You are a helpful AI assistant.";
    }

    const systemParts: string[] = [];

    if (activePreset.preHistoryInstructions?.trim()) {
      systemParts.push(
        `Pre-history instructions:\n${resolvePlaceholders(
          activePreset.preHistoryInstructions.trim()
        )}`
      );
    }

    if (selectedCharacter) {
      systemParts.push(
        `You are roleplaying as "${
          selectedCharacter.inChatName ?? selectedCharacter.name
        }" (internal name: ${
          selectedCharacter.name
        }).\nDescription: ${resolvePlaceholders(
          selectedCharacter.description
        )}\nScenario: ${resolvePlaceholders(
          selectedCharacter.scenario
        )}\nInitial message guidance: ${resolvePlaceholders(
          selectedCharacter.initMessage
        )}`
      );
    }

    if (selectedCharacter && characters.length > 1) {
      const additional = characters
        .filter((character) => character.id !== selectedCharacter.id)
        .map(
          (character) =>
            `${character.inChatName}: ${resolvePlaceholders(
              character.description
            )}`
        )
        .join("\n");

      if (additional) {
        systemParts.push(`Other characters in this chat:\n${additional}`);
      }
    }

    if (activePersona) {
      systemParts.push(
        `The user persona is "${activePersona.inChatName}".\nDescription: ${activePersona.description}`
      );
    }

    if (activePreset.impersonationPrompt?.trim()) {
      systemParts.push(
        `Impersonation prompt:\n${resolvePlaceholders(
          activePreset.impersonationPrompt.trim()
        )}`
      );
    }

    if (activePreset.postHistoryInstructions?.trim()) {
      systemParts.push(
        `Post-history instructions:\n${resolvePlaceholders(
          activePreset.postHistoryInstructions.trim()
        )}`
      );
    }

    if (lorebooks.length > 0) {
      const lorebookContent = lorebooks
        .map((entry: Lorebook) => {
          const combined = [
            entry.description?.trim()
              ? `Summary: ${resolvePlaceholders(entry.description)}`
              : null,
            resolvePlaceholders(entry.content).trim(),
          ].filter(Boolean);

          return `${entry.name}\n${combined.join("\n")}`;
        })
        .join("\n\n");

      systemParts.push(`Relevant lorebooks:\n${lorebookContent}`);
    }

    if (activePreset.repetitionPenalty !== undefined) {
      systemParts.push(
        `Apply an implicit repetition penalty of ${activePreset.repetitionPenalty}.`
      );
    }

    return (
      systemParts
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join("\n\n") || "You are a helpful AI assistant."
    );
  }, [
    activePersona,
    activePreset,
    characters,
    lorebooks,
    resolvePlaceholders,
    selectedCharacter,
  ]);

  const requestAssistantResponse = useCallback(
    async (history: Message[]) => {
      if (!activePreset) {
        throw new Error("You need to activate a preset before chatting.");
      }

      const systemInstruction = composeSystemInstruction();

      const conversationalHistory = history
        .filter(
          (message) => message.role === "user" || message.role === "assistant"
        )
        .map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
          name: message.name,
        }));

      if (
        conversationalHistory.length === 0 ||
        conversationalHistory[conversationalHistory.length - 1]?.role !== "user"
      ) {
        throw new Error(
          "Cannot generate a response without a preceding user message."
        );
      }

      const payload = [
        {
          role: "system" as const,
          content: systemInstruction,
        },
        ...conversationalHistory,
      ];

      const client = await getOpenRouterClient();

      const response = await client.chat.send({
        model: activePreset.model,
        messages: payload,
        temperature: activePreset.temperature,
        topP: activePreset.topP,
        frequencyPenalty: activePreset.frequencyPenalty,
        presencePenalty: activePreset.presencePenalty,
        maxTokens: activePreset.maxNewToken,
      });

      const assistantContentRaw = response?.choices?.[0]?.message?.content;

      const assistantContent = normaliseAssistantContent(
        assistantContentRaw
      ).trim();

      if (!assistantContent) {
        throw new Error("Model returned an empty response.");
      }

      return assistantContent;
    },
    [activePreset, composeSystemInstruction, normaliseAssistantContent]
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (isSending) {
        return;
      }

      if (!activePreset) {
        setErrorMessage("You need to activate a preset before chatting.");
        return;
      }

      if (!selectedCharacter) {
        setErrorMessage("Select a character to respond to your messages.");
        return;
      }

      if (!activeBranchId) {
        setErrorMessage("No active branch is available.");
        return;
      }

      setIsSending(true);
      setErrorMessage(null);

      const timestamp = Date.now();
      const resolvedContent = resolvePlaceholders(content);
      const userMessage: Message = {
        id: generateUUID(),
        role: "user",
        name: activePersona?.inChatName ?? activePersona?.name ?? "You",
        content: resolvedContent,
        timestamp,
        chatId: chat.id,
        avatar: activePersona?.avatar,
        branchId: activeBranchId,
      };

      try {
        await db.messages.add(userMessage);

        const history = await db.messages
          .where("chatId")
          .equals(chat.id)
          .and((message) => message.branchId === activeBranchId)
          .toArray();

        const sortedHistory = history
          .slice()
          .sort((a, b) => a.timestamp - b.timestamp);

        const assistantContent = await requestAssistantResponse(sortedHistory);

        const assistantMessage: Message = {
          id: generateUUID(),
          role: "assistant",
          name: selectedCharacter.inChatName ?? selectedCharacter.name,
          content: assistantContent,
          timestamp: Date.now(),
          chatId: chat.id,
          avatar: selectedCharacter.avatar,
          branchId: activeBranchId,
        };

        await db.messages.add(assistantMessage);
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Unexpected error";

        setErrorMessage(description);

        await db.messages.add({
          id: generateUUID(),
          role: "system",
          name: "System",
          content: `Failed to fetch a response: ${description}`,
          timestamp: Date.now(),
          chatId: chat.id,
          avatar: undefined,
          branchId: activeBranchId,
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      activePersona,
      activePreset,
      activeBranchId,
      chat.id,
      isSending,
      requestAssistantResponse,
      resolvePlaceholders,
      selectedCharacter,
    ]
  );

  const handleRegenerateMessage = useCallback(
    async (message: Message) => {
      if (isSending) {
        return;
      }

      if (!activePreset) {
        setErrorMessage("You need to activate a preset before regenerating.");
        return;
      }

      if (!selectedCharacter) {
        setErrorMessage("Select a character to respond to your messages.");
        return;
      }

      if (!activeBranchId) {
        setErrorMessage("No active branch is available.");
        return;
      }

      setIsSending(true);
      setErrorMessage(null);
      setMessagePendingDeletion(null);

      try {
        const history = await db.messages
          .where("chatId")
          .equals(chat.id)
          .and((entry) => entry.branchId === activeBranchId)
          .toArray();

        const sortedHistory = history
          .slice()
          .sort((a, b) => a.timestamp - b.timestamp);

        const targetIndex = sortedHistory.findIndex(
          (entry) => entry.id === message.id
        );

        if (targetIndex === -1) {
          throw new Error("Message to regenerate was not found.");
        }

        const historyBeforeTarget = sortedHistory.slice(0, targetIndex);

        const assistantContent = await requestAssistantResponse(
          historyBeforeTarget
        );

        const assistantMessage: Message = {
          id: generateUUID(),
          role: "assistant",
          name: selectedCharacter.inChatName ?? selectedCharacter.name,
          content: assistantContent,
          timestamp: Date.now(),
          chatId: chat.id,
          avatar: selectedCharacter.avatar,
          branchId: activeBranchId,
        };

        await db.transaction("rw", db.messages, async () => {
          const idsToDelete = sortedHistory
            .slice(targetIndex)
            .map((entry) => entry.id);

          if (idsToDelete.length > 0) {
            await db.messages.bulkDelete(idsToDelete);
          }

          await db.messages.add(assistantMessage);
        });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Unexpected error";
        setErrorMessage(description);
      } finally {
        setIsSending(false);
      }
    },
    [
      activePreset,
      activeBranchId,
      chat.id,
      isSending,
      requestAssistantResponse,
      selectedCharacter,
    ]
  );

  const currentMessages = messages ?? loaderData.messages;

  return (
    <Stack
      justify="space-between"
      style={{
        height: "calc(100dvh - 64px - var(--mantine-spacing-md))",
      }}
    >
      <Stack gap="xs">
        <Group>
          {characters.map((character) => (
            <Button
              key={character.id}
              size="compact-xs"
              variant={
                character.id === selectedCharacter?.id ? "filled" : "default"
              }
              onClick={() => setSelectedCharacterId(character.id)}
            >
              {character.name}
            </Button>
          ))}
        </Group>

        {missingRequirements.length > 0 && (
          <Alert
            variant="light"
            color="yellow"
            icon={<IconInfoCircle size={16} />}
          >
            {`To start chatting, ${missingRequirements.join(", ")}.`}
          </Alert>
        )}

        {errorMessage && (
          <Alert
            variant="light"
            color="red"
            icon={<IconInfoCircle size={16} />}
          >
            {errorMessage}
          </Alert>
        )}
      </Stack>

      <Messages
        viewport={viewport}
        messages={currentMessages}
        characters={characters}
        persona={activePersona}
        onDeleteMessage={requestDeleteMessage}
        onRegenerateMessage={handleRegenerateMessage}
        onCreateBranch={handleCreateBranch}
        onNavigateBranch={handleNavigateBranch}
        branchLabel={branchLabel}
        canNavigatePrev={canNavigatePrev}
        canNavigateNext={canNavigateNext}
      />

      <Stack gap="xs">
        {isSending && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">
              {selectedCharacter?.inChatName ?? "Assistant"} is thinking...
            </Text>
          </Group>
        )}

        <Input
          onSend={handleSend}
          disabled={missingRequirements.length > 0 || !activeBranchId}
          isProcessing={isSending}
        />
      </Stack>

      <Modal
        opened={messagePendingDeletion !== null}
        onClose={handleCancelDelete}
        title="Delete message?"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            Are you sure you want to delete this message? This action cannot be
            undone.
          </Text>

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
