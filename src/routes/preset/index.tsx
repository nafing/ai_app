import React from "react";
import {
  Button,
  Card,
  FileButton,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { db, type Preset } from "../../utils/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";
import { exportEntitiesToFile, parseImportedEntities } from "../../utils/exportImport";
import { generateUUID } from "../../utils/UUID";

export const Route = createFileRoute("/preset/")({
  component: RouteComponent,
});

function RouteComponent() {
  const presets = useLiveQuery(() => db.presets.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingPresetId, setDeletingPresetId] = React.useState<string | null>(
    null
  );
  const [importOpened, importHandlers] = useDisclosure(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>("");
  const pendingFileRef = React.useRef<File | null>(null);

  const handleDelete = (id: string) => {
    setDeletingPresetId(id);
    handlers.open();
  };

  const handleExport = React.useCallback(async () => {
    const allPresets = (await db.presets.toArray()) ?? [];
    exportEntitiesToFile("presets", allPresets);
  }, []);

  const handleFileSelect = (file: File | null) => {
    pendingFileRef.current = file;
    setSelectedFileName(file ? file.name : "");
    setImportError(null);
  };

  const handleImport = async () => {
    if (!pendingFileRef.current) {
      setImportError("Select a JSON file before importing.");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const rawItems = await parseImportedEntities<Partial<Preset>>(
        "presets",
        pendingFileRef.current
      );

      if (rawItems.length === 0) {
        throw new Error("Import file does not contain any presets.");
      }

      const sanitizeNumber = (value: unknown, fallback: number) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const sanitized: Preset[] = rawItems.map((item) => {
        const idCandidate = typeof item.id === "string" ? item.id.trim() : "";
        const name = (item.name ?? "").trim();
        const model = (item.model ?? "").trim();

        return {
          id: idCandidate || generateUUID(),
          isActive: Boolean(item.isActive),
          name: name || "Unnamed Preset",
          model: model || "unknown-model",
          preHistoryInstructions: item.preHistoryInstructions ?? "",
          postHistoryInstructions: item.postHistoryInstructions ?? "",
          impersonationPrompt: item.impersonationPrompt ?? "",
          temperature: sanitizeNumber(item.temperature, 0.7),
          repetitionPenalty: sanitizeNumber(item.repetitionPenalty, 1),
          frequencyPenalty: sanitizeNumber(item.frequencyPenalty, 0),
          presencePenalty: sanitizeNumber(item.presencePenalty, 0),
          topP: sanitizeNumber(item.topP, 1),
          topK: Math.max(0, Math.round(sanitizeNumber(item.topK, 40))),
          contextSize: Math.max(0, Math.round(sanitizeNumber(item.contextSize, 2048))),
          maxNewToken: Math.max(0, Math.round(sanitizeNumber(item.maxNewToken, 2048))),
        };
      });

      const deduped = new Map<string, Preset>();
      for (const preset of sanitized) {
        if (deduped.has(preset.id)) {
          preset.id = generateUUID();
          preset.isActive = false;
        }
        deduped.set(preset.id, preset);
      }

      await db.transaction("rw", db.presets, async () => {
        await db.presets.bulkPut(Array.from(deduped.values()));
      });

      importHandlers.close();
      setSelectedFileName("");
      pendingFileRef.current = null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import presets.";
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Presets</Title>
        <Group gap="xs">
          <Button variant="default" onClick={handleExport}>
            Export
          </Button>
          <Button variant="default" onClick={importHandlers.open}>
            Import
          </Button>
          <Button component={Link} to="/preset/new/">
            New Preset
          </Button>
        </Group>
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

      <Modal opened={importOpened} onClose={importHandlers.close} title="Import Presets">
        <Stack>
          <Text size="sm">
            Import presets from a JSON export file. Existing presets with the same
            identifier will be overwritten.
          </Text>

          <Group justify="space-between" align="center">
            <FileButton onChange={handleFileSelect} accept="application/json">
              {(props) => (
                <Button {...props} variant="default" size="compact-sm">
                  Choose File
                </Button>
              )}
            </FileButton>
            <Text size="sm" c="dimmed">
              {selectedFileName || "No file selected"}
            </Text>
          </Group>

          {importError && (
            <Text size="sm" c="red">
              {importError}
            </Text>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={importHandlers.close}>
              Cancel
            </Button>
            <Button onClick={handleImport} loading={isImporting}>
              Import
            </Button>
          </Group>
        </Stack>
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
