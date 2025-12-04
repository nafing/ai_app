import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Chat } from "../../utils/db";
import { useDisclosure } from "@mantine/hooks";
import React from "react";
import { Group, Title, Button, Stack, Modal, Card, Text } from "@mantine/core";

export const Route = createFileRoute("/chat/")({
  component: RouteComponent,
});

function RouteComponent() {
  const chats = useLiveQuery(() => db.chats.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingChatId, setDeletingChatId] = React.useState<string | null>(
    null
  );

  const handleDelete = (id: string) => {
    setDeletingChatId(id);
    handlers.open();
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Chats</Title>
        <Button component={Link} to="/chat/new/">
          New Chat
        </Button>
      </Group>

      <Stack gap="xs">
        {chats?.map((c) => (
          <ChatCard key={c.id} c={c} onDelete={() => handleDelete(c.id)} />
        ))}
      </Stack>

      <Modal opened={opened} onClose={handlers.close} title="Delete Chat">
        Are you sure you want to delete this chat?
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={handlers.close}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={async () => {
              if (deletingChatId) {
                await db.messages
                  .where("chatId")
                  .equals(deletingChatId)
                  .delete();

                await db.chats.delete(deletingChatId);
              }

              handlers.close();
            }}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </React.Fragment>
  );
}

function ChatCard({ c, onDelete }: { c: Chat; onDelete: () => void }) {
  const navTo = useNavigate();

  return (
    <Card
      radius="md"
      p="md"
      withBorder
      style={{
        backdropFilter: "saturate(180%) blur(20px)",
        backgroundColor: `rgba(0, 0, 0, 0.3)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        navTo({ to: `/conversation/${c.id}` });
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={4}>
          <Text fw={600}>{c.name}</Text>
          <Text size="sm" c="dimmed">
            {c.characterIds.length} Characters
          </Text>
        </Stack>

        <Stack gap="xs">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              navTo({ to: `/chat/${c.id}` });
            }}
            size="compact-xs"
          >
            Edit
          </Button>
          <Button
            size="compact-xs"
            color="red"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </Button>
        </Stack>
      </Group>
    </Card>
  );
}
