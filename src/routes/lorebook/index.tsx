import React from "react";
import {
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";
import { db, type Lorebook } from "../../utils/db";

export const Route = createFileRoute("/lorebook/")({
  component: RouteComponent,
});

function RouteComponent() {
  const lorebooks = useLiveQuery(() => db.lorebooks.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingLorebookId, setDeletingLorebookId] = React.useState<string | null>(
    null
  );

  const handleDelete = (id: string) => {
    setDeletingLorebookId(id);
    handlers.open();
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Lorebooks</Title>
        <Button component={Link} to="/lorebook/new/">
          New Lorebook
        </Button>
      </Group>

      <Stack gap="xs">
        {lorebooks?.map((lorebook) => (
          <LorebookCard
            key={lorebook.id}
            lorebook={lorebook}
            onDelete={() => handleDelete(lorebook.id)}
          />
        ))}

        {(!lorebooks || lorebooks.length === 0) && (
          <Text c="dimmed">No lorebooks yet. Create one to get started.</Text>
        )}
      </Stack>

      <Modal opened={opened} onClose={handlers.close} title="Delete Lorebook">
        Are you sure you want to delete this lorebook?
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={handlers.close}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={async () => {
              if (deletingLorebookId) {
                await db.lorebooks.delete(deletingLorebookId);

                await Promise.all([
                  db.personas
                    .toCollection()
                    .modify((persona) => {
                      persona.lorebookIds = (persona.lorebookIds || []).filter(
                        (id) => id !== deletingLorebookId
                      );
                    }),
                  db.characters
                    .toCollection()
                    .modify((character) => {
                      character.lorebookIds = (
                        character.lorebookIds || []
                      ).filter((id) => id !== deletingLorebookId);
                    }),
                  db.chats
                    .toCollection()
                    .modify((chat) => {
                      chat.lorebookIds = (chat.lorebookIds || []).filter(
                        (id) => id !== deletingLorebookId
                      );
                    }),
                ]);
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

function LorebookCard({
  lorebook,
  onDelete,
}: {
  lorebook: Lorebook;
  onDelete: () => void;
}) {
  return (
    <Card
      radius="md"
      p="md"
      withBorder
      style={{
        backdropFilter: "saturate(180%) blur(20px)",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
      }}
    >
      <Group justify="space-between" align="start" gap="md">
        <Stack gap={4} flex={1}>
          <Text fw={600}>{lorebook.name}</Text>
          <Text size="sm" c="dimmed">
            {lorebook.description || "No description"}
          </Text>
        </Stack>

        <Stack gap="xs">
          <Button
            onClick={(event) => {
              event.stopPropagation();
            }}
            component={Link}
            to={`/lorebook/${lorebook.id}`}
            size="compact-xs"
          >
            Edit
          </Button>
          <Button
            size="compact-xs"
            color="red"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
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
