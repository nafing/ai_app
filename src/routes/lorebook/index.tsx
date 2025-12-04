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
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";
import { db, type Lorebook } from "../../utils/db";
import { exportEntitiesToFile, parseImportedEntities } from "../../utils/exportImport";
import { generateUUID } from "../../utils/UUID";

export const Route = createFileRoute("/lorebook/")({
  component: RouteComponent,
});

function RouteComponent() {
  const lorebooks = useLiveQuery(() => db.lorebooks.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingLorebookId, setDeletingLorebookId] = React.useState<string | null>(
    null
  );
  const [importOpened, importHandlers] = useDisclosure(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>("");
  const pendingFileRef = React.useRef<File | null>(null);

  const handleDelete = (id: string) => {
    setDeletingLorebookId(id);
    handlers.open();
  };

  const handleExport = React.useCallback(async () => {
    const allLorebooks = (await db.lorebooks.toArray()) ?? [];
    exportEntitiesToFile("lorebooks", allLorebooks);
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
      const rawItems = await parseImportedEntities<Partial<Lorebook>>(
        "lorebooks",
        pendingFileRef.current
      );

      if (rawItems.length === 0) {
        throw new Error("Import file does not contain any lorebooks.");
      }

      const sanitized: Lorebook[] = rawItems.map((item) => {
        const idCandidate = typeof item.id === "string" ? item.id.trim() : "";
        const name = (item.name ?? "").trim();

        return {
          id: idCandidate || generateUUID(),
          name: name || "Untitled Lorebook",
          description: item.description ?? "",
          content: item.content ?? "",
        };
      });

      const deduped = new Map<string, Lorebook>();
      for (const lorebook of sanitized) {
        if (deduped.has(lorebook.id)) {
          lorebook.id = generateUUID();
        }
        deduped.set(lorebook.id, lorebook);
      }

      await db.transaction("rw", db.lorebooks, async () => {
        await db.lorebooks.bulkPut(Array.from(deduped.values()));
      });

      importHandlers.close();
      setSelectedFileName("");
      pendingFileRef.current = null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import lorebooks.";
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Lorebooks</Title>
        <Group gap="xs">
          <Button variant="default" onClick={handleExport}>
            Export
          </Button>
          <Button variant="default" onClick={importHandlers.open}>
            Import
          </Button>
          <Button component={Link} to="/lorebook/new/">
            New Lorebook
          </Button>
        </Group>
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

      <Modal opened={importOpened} onClose={importHandlers.close} title="Import Lorebooks">
        <Stack>
          <Text size="sm">
            Import lorebooks from a JSON export file. Existing lorebooks with the same
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
