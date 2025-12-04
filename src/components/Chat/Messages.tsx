import { ScrollArea, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import Bubble from "./Bubble";
import type React from "react";
import type { Character, Message, Persona } from "../../utils/db";

const Messages = ({
  viewport,
  messages,
  characters,
  persona,
  onDeleteMessage,
  onRegenerateMessage,
  onCreateBranch,
  onNavigateBranch,
  branchLabel,
  canNavigatePrev,
  canNavigateNext,
}: {
  viewport: React.RefObject<HTMLDivElement | null>;
  messages: Message[] | undefined;
  characters: Character[];
  persona: Persona | null | undefined;
  onDeleteMessage: (message: Message) => void;
  onRegenerateMessage?: (message: Message) => void;
  onCreateBranch?: (message: Message) => void;
  onNavigateBranch?: (direction: "previous" | "next") => void;
  branchLabel?: string;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}) => {
  const orderedMessages = useMemo(() => {
    return [...(messages ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages]);

  const resolveAvatar = useMemo(() => {
    return (message: Message): string => {
      if (message.avatar) {
        return message.avatar;
      }

      if (message.role === "user") {
        return persona?.avatar ?? "";
      }

      if (message.role === "assistant") {
        const matchedCharacter = characters.find((character) => {
          const normalizedName = character.inChatName || character.name;
          return (
            normalizedName?.toLowerCase() === message.name?.toLowerCase() ||
            character.name?.toLowerCase() === message.name?.toLowerCase()
          );
        });

        return matchedCharacter?.avatar ?? "";
      }

      return "";
    };
  }, [characters, persona?.avatar]);

  return (
    <ScrollArea scrollbarSize={4} type="never" viewportRef={viewport}>
      <Stack gap="xs" py="xs">
        {orderedMessages.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center">
            Start the conversation by sending a message.
          </Text>
        ) : (
          orderedMessages.map((message) => (
            <Bubble
              key={message.id}
              text={message.content}
              time={message.timestamp}
              fromMe={message.role === "user"}
              name={message.name}
              avatarUrl={resolveAvatar(message)}
              onDelete={() => onDeleteMessage(message)}
              onRegenerate={
                message.role === "assistant" && onRegenerateMessage
                  ? () => onRegenerateMessage(message)
                  : undefined
              }
              onCreateBranch={
                onCreateBranch ? () => onCreateBranch(message) : undefined
              }
              onNavigateBranch={onNavigateBranch}
              branchLabel={branchLabel}
              canNavigatePrev={canNavigatePrev}
              canNavigateNext={canNavigateNext}
            />
          ))
        )}
      </Stack>
    </ScrollArea>
  );
};

export default Messages;
