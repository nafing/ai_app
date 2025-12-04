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
import { db, type Persona } from "../../utils/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";

export const Route = createFileRoute("/persona/")({
  component: RouteComponent,
});

function RouteComponent() {
  const personas = useLiveQuery(() => db.personas.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingPersonaId, setDeletingPersonaId] = React.useState<
    string | null
  >(null);

  const handleDelete = (id: string) => {
    setDeletingPersonaId(id);
    handlers.open();
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Personas</Title>
        <Button component={Link} to="/persona/new/">
          New Persona
        </Button>
      </Group>

      <Stack gap="xs">
        {personas?.map((p) => (
          <PersonaCard
            key={p.id}
            p={p}
            onDelete={() => handleDelete(p.id)}
            setAsActive={() => {
              db.transaction("rw", db.personas, async () => {
                const allPersonas = await db.personas.toArray();
                for (const persona of allPersonas) {
                  await db.personas.update(persona.id, { isActive: false });
                }
                await db.personas.update(p.id, { isActive: true });
              });
            }}
          />
        ))}
      </Stack>

      <Modal opened={opened} onClose={handlers.close} title="Delete Persona">
        Are you sure you want to delete this persona?
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={handlers.close}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={async () => {
              if (deletingPersonaId) {
                await db.personas.delete(deletingPersonaId);
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

function PersonaCard({
  p,
  onDelete,
  setAsActive,
}: {
  p: Persona;
  onDelete: () => void;
  setAsActive: () => void;
}) {
  return (
    <Card
      radius="md"
      p="md"
      withBorder
      style={{
        backdropFilter: "saturate(180%) blur(20px)",
        backgroundColor: `rgba(0, 0, 0, ${p.isActive ? 0.85 : 0.25})`,
      }}
      onClick={() => setAsActive()}
    >
      <Group justify="space-between">
        <Group wrap="nowrap">
          <Avatar radius="xl" src={p.avatar} alt={p.name} size="lg" />
          <Stack gap={4}>
            <Text fw={600}>{p.name}</Text>
            <Text size="sm" c="dimmed">
              {p.inChatName} ({p.isActive ? "Active" : "Inactive"})
            </Text>
          </Stack>
        </Group>

        <Stack gap="xs">
          <Button
            onClick={(e) => {
              e.stopPropagation();
            }}
            component={Link}
            to={`/persona/${p.id}`}
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
