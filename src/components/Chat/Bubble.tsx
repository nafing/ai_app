import React, { useMemo } from "react";
import {
  ActionIcon,
  Avatar,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconGitBranch,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";

type ChatBubbleProps = {
  text: string;
  time: number;
  fromMe: boolean;
  avatarUrl: string;
  name: string;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onCreateBranch?: () => void;
  onNavigateBranch?: (direction: "previous" | "next") => void;
  branchLabel?: string;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
};

const Bubble: React.FC<ChatBubbleProps> = ({
  text,
  time,
  fromMe = false,
  avatarUrl,
  name,
  onDelete,
  onRegenerate,
  onCreateBranch,
  onNavigateBranch,
  branchLabel,
  canNavigatePrev = false,
  canNavigateNext = false,
}) => {
  const avatarInitial = useMemo(() => {
    return name?.trim()?.[0]?.toUpperCase() ?? undefined;
  }, [name]);

  const formattedContent = useMemo<React.ReactNode[]>(() => {
    const applyLineBreaks = (
      input: string,
      render: (value: string, idx: number) => React.ReactNode,
      keyBase: string
    ): React.ReactNode[] => {
      return input.split(/\r?\n/g).flatMap<React.ReactNode>((part, idx) => {
        const nodes: React.ReactNode[] = [];
        if (idx > 0) {
          nodes.push(<br key={`${keyBase}-br-${idx}`} />);
        }
        nodes.push(render(part, idx));
        return nodes;
      });
    };

    const segments = text.split(/(!\[[^\]]*\]\([^)]+\)|\*[^*]+\*|"[^"]+")/g);

    return segments.flatMap<React.ReactNode>((segment, index) => {
      if (!segment) {
        return [];
      }

      const imageMatch = segment.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        return [
          <Image
            key={`image-${index}`}
            src={src}
            alt={alt || "Image"}
            radius="md"
            fit="contain"
            maw={260}
            loading="lazy"
            style={{ maxWidth: "100%" }}
          />,
        ];
      }

      if (segment.startsWith('"') && segment.endsWith('"')) {
        const value = segment.slice(1, -1);
        const quoted = `"${value}"`;
        return applyLineBreaks(
          quoted,
          (part, partIdx) => (
            <span key={`quote-${index}-${partIdx}`} style={{ fontWeight: 600 }}>
              {part}
            </span>
          ),
          `quote-${index}`
        );
      }

      if (segment.startsWith("*") && segment.endsWith("*")) {
        const value = segment.slice(1, -1);
        return applyLineBreaks(
          value,
          (part, partIdx) => (
            <span
              key={`asterisk-${index}-${partIdx}`}
              style={{
                color: "var(--mantine-color-dimmed)",
                fontStyle: "italic",
              }}
            >
              {part}
            </span>
          ),
          `asterisk-${index}`
        );
      }

      return applyLineBreaks(
        segment,
        (part, partIdx) => (
          <React.Fragment key={`plain-${index}-${partIdx}`}>
            {part}
          </React.Fragment>
        ),
        `plain-${index}`
      );
    });
  }, [text]);

  const renderAvatar = (position: "left" | "right") => (
    <Avatar
      key={`${name}-${position}`}
      src={avatarUrl}
      radius="xl"
      size={28}
      alt={name}
    >
      {!avatarUrl && avatarInitial}
    </Avatar>
  );

  return (
    <Group justify={fromMe ? "end" : "start"} align="end" gap={6}>
      {!fromMe && renderAvatar("left")}

      <Stack align={fromMe ? "flex-end" : "flex-start"} gap={4} maw="80%">
        {(name || branchLabel || onDelete || onRegenerate || onCreateBranch || onNavigateBranch) && (
          <Group justify="space-between" gap={4} w="100%">
            <Group gap={6} align="center">
              {!fromMe && name && (
                <Text size="xs" c="dimmed">
                  {name}
                </Text>
              )}
              {branchLabel && (
                <Text size="xs" c="dimmed">
                  {branchLabel}
                </Text>
              )}
            </Group>

            <Group gap={4} justify="flex-end">
              {onNavigateBranch && (
                <>
                  <Tooltip label="Previous branch" withArrow>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      aria-label="Previous branch"
                      disabled={!canNavigatePrev}
                      onClick={() => {
                        if (canNavigatePrev) {
                          onNavigateBranch("previous");
                        }
                      }}
                    >
                      <IconChevronLeft size={14} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Next branch" withArrow>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      aria-label="Next branch"
                      disabled={!canNavigateNext}
                      onClick={() => {
                        if (canNavigateNext) {
                          onNavigateBranch("next");
                        }
                      }}
                    >
                      <IconChevronRight size={14} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                </>
              )}

              {onCreateBranch && (
                <Tooltip label="Create branch from here" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="teal"
                    aria-label="Create branch"
                    onClick={onCreateBranch}
                  >
                    <IconGitBranch size={14} stroke={1.5} />
                  </ActionIcon>
                </Tooltip>
              )}

              {onRegenerate && (
                <Tooltip label="Regenerate message" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="blue"
                    aria-label="Regenerate message"
                    onClick={onRegenerate}
                  >
                    <IconRefresh size={14} stroke={1.5} />
                  </ActionIcon>
                </Tooltip>
              )}

              {onDelete && (
                <Tooltip label="Delete message" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    aria-label="Delete message"
                    onClick={onDelete}
                  >
                    <IconTrash size={14} stroke={1.5} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>
        )}

        <Paper
          radius={16}
          p="sm"
          shadow="xs"
          style={{
            backdropFilter: "saturate(180%) blur(20px)",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            borderTopRightRadius: fromMe ? 4 : 16,
            borderTopLeftRadius: fromMe ? 16 : 4,
          }}
        >
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {formattedContent}
          </Text>
        </Paper>

        {time && (
          <Text size="xs" c="dimmed">
            {new Date(time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}
      </Stack>

      {fromMe && renderAvatar("right")}
    </Group>
  );
};

export default Bubble;
