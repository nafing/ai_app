import React from "react";
import { Button, Card, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { db, type Preset } from "../../utils/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";

export const Route = createFileRoute("/preset/")({
  component: RouteComponent,
});

function RouteComponent() {
  const presets = useLiveQuery(() => db.presets.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingPresetId, setDeletingPresetId] = React.useState<string | null>(
    null
  );

  const handleDelete = (id: string) => {
    setDeletingPresetId(id);
    handlers.open();
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Presets</Title>
        <Button component={Link} to="/preset/new/">
          New Preset
        </Button>
      </Group>

      <Stack gap="xs">
        {presets?.map((p) => (
          <PresetCard
            key={p.id}
            p={p}
            onDelete={() => handleDelete(p.id)}
            setAsActive={() => {
              db.transaction("rw", db.presets, async () => {
                const allPresets = await db.presets.toArray();
                for (const preset of allPresets) {
                  await db.presets.update(preset.id, { isActive: false });
                }
                await db.presets.update(p.id, { isActive: true });
              });
            }}
          />
        ))}
      </Stack>

      <Modal opened={opened} onClose={handlers.close} title="Delete Preset">
        Are you sure you want to delete this preset?
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={handlers.close}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={async () => {
              if (deletingPresetId) {
                await db.presets.delete(deletingPresetId);
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

function PresetCard({
  p,
  onDelete,
  setAsActive,
}: {
  p: Preset;
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
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={4}>
          <Text fw={600}>
            {p.name} ({p.isActive ? "Active" : "Inactive"})
          </Text>
          <Text size="sm" c="dimmed">
            {p.model}
          </Text>
        </Stack>

        <Stack gap="xs">
          <Button
            onClick={(e) => {
              e.stopPropagation();
            }}
            component={Link}
            to={`/preset/${p.id}`}
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
