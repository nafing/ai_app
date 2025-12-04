import {
  Stack,
  Group,
  Button,
  Textarea,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useRef, useState } from "react";

type SnippetKey = "OOC" | "USER" | "CHAR" | "ACTION" | "NEXT";

const SNIPPETS: Record<SnippetKey, string> = {
  OOC: "((ooc: **)) ",
  USER: "{{user}} ",
  CHAR: "{{char}} ",
  ACTION: "((action: **)) ",
  NEXT: "((next)) ",
};

const Input = ({
  onSend,
  disabled = false,
  isProcessing = false,
}: {
  onSend: (message: string) => Promise<void> | void;
  disabled?: boolean;
  isProcessing?: boolean;
}) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertText = (type: SnippetKey) => {
    const snippet = SNIPPETS[type];
    const textarea = textareaRef.current;

    if (!textarea || !snippet) {
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;

    setValue((prev) => {
      const updated = prev.slice(0, start) + snippet + prev.slice(end);

      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPosition = start + snippet.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      });

      return updated;
    });
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isProcessing) {
      return;
    }

    try {
      await onSend(trimmed);
      setValue("");
    } finally {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  return (
    <Stack gap={6}>
      <Group gap={4}>
        {(Object.keys(SNIPPETS) as SnippetKey[]).map((key) => (
          <Button
            key={key}
            size="compact-xs"
            disabled={disabled || isProcessing}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertText(key)}
          >
            {key}
          </Button>
        ))}
      </Group>

      <Group gap="xs" wrap="nowrap">
        <Textarea
          radius="lg"
          autosize
          minRows={2}
          placeholder="Type your message..."
          flex={1}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          ref={textareaRef}
          disabled={disabled || isProcessing}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          rightSection={
            <ActionIcon
              onClick={handleSend}
              radius="xl"
              variant="light"
              disabled={
                disabled || isProcessing || value.trim().length === 0
              }
            >
              {isProcessing ? <Loader size="xs" /> : <IconSend />}
            </ActionIcon>
          }
        />
      </Group>
    </Stack>
  );
};

export default Input;
