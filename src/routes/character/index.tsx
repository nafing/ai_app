import React from "react";
import {
  Avatar,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { db, type Character } from "../../utils/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";

export const Route = createFileRoute("/character/")({
  component: RouteComponent,
});

function RouteComponent() {
  const characters = useLiveQuery(() => db.characters.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingCharacterId, setDeletingCharacterId] = React.useState<
    string | null
  >(null);

  const handleDelete = (id: string) => {
    setDeletingCharacterId(id);
    handlers.open();
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Characters</Title>
        <Button component={Link} to="/character/new/">
          New Character
        </Button>
      </Group>

      <Stack gap="xs">
        {characters?.map((c) => (
          <CharacterCard key={c.id} c={c} onDelete={() => handleDelete(c.id)} />
        ))}
      </Stack>

      <Modal opened={opened} onClose={handlers.close} title="Delete Character">
        Are you sure you want to delete this character?
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={handlers.close}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={async () => {
              if (deletingCharacterId) {
                await db.characters.delete(deletingCharacterId);
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

function CharacterCard({
  c,
  onDelete,
}: {
  c: Character;
  onDelete: () => void;
}) {
  return (
    <Card
      radius="md"
      p="md"
      withBorder
      style={{
        backdropFilter: "saturate(180%) blur(20px)",
        backgroundColor: `rgba(0, 0, 0, 0.3)`,
      }}
    >
      <Group justify="space-between">
        <Group wrap="nowrap">
          <Avatar radius="xl" src={c.avatar} alt={c.name} size="lg" />
          <Stack gap={4}>
            <Text fw={600}>{c.name}</Text>
            <Text size="sm" c="dimmed">
              {c.inChatName}
            </Text>
          </Stack>
        </Group>

        <Stack gap="xs">
          <Button
            onClick={(e) => {
              e.stopPropagation();
            }}
            component={Link}
            to={`/character/${c.id}`}
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
