import React from "react";
import {
  Avatar,
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
import { db, type Character } from "../../utils/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";
import { exportEntitiesToFile, parseImportedEntities } from "../../utils/exportImport";
import { generateUUID } from "../../utils/UUID";

export const Route = createFileRoute("/character/")({
  component: RouteComponent,
});

function RouteComponent() {
  const characters = useLiveQuery(() => db.characters.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingCharacterId, setDeletingCharacterId] = React.useState<
    string | null
  >(null);
  const [importOpened, importHandlers] = useDisclosure(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>("");
  const pendingFileRef = React.useRef<File | null>(null);

  const handleDelete = (id: string) => {
    setDeletingCharacterId(id);
    handlers.open();
  };

  const handleExport = React.useCallback(async () => {
    const allCharacters = (await db.characters.toArray()) ?? [];
    exportEntitiesToFile("characters", allCharacters);
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
      const rawItems = await parseImportedEntities<Partial<Character>>(
        "characters",
        pendingFileRef.current
      );

      if (rawItems.length === 0) {
        throw new Error("Import file does not contain any characters.");
      }

      const sanitized: Character[] = rawItems.map((item) => {
        const trimmedName = (item.name ?? "").trim();
        const idCandidate = typeof item.id === "string" ? item.id.trim() : "";

        return {
          id: idCandidate || generateUUID(),
          name: trimmedName || "Unnamed Character",
          inChatName: (item.inChatName ?? trimmedName ?? "Character").trim() ||
            (trimmedName || "Character"),
          avatar: item.avatar,
          description: item.description ?? "",
          initMessage: item.initMessage ?? "",
          scenario: item.scenario ?? "",
          lorebookIds: Array.isArray(item.lorebookIds) ? item.lorebookIds : [],
        };
      });

      const deduped = new Map<string, Character>();
      for (const character of sanitized) {
        if (deduped.has(character.id)) {
          character.id = generateUUID();
        }
        deduped.set(character.id, character);
      }

      await db.transaction("rw", db.characters, async () => {
        await db.characters.bulkPut(Array.from(deduped.values()));
      });

      importHandlers.close();
      setSelectedFileName("");
      pendingFileRef.current = null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import characters.";
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Characters</Title>
        <Group gap="xs">
          <Button variant="default" onClick={handleExport}>
            Export
          </Button>
          <Button variant="default" onClick={importHandlers.open}>
            Import
          </Button>
          <Button component={Link} to="/character/new/">
            New Character
          </Button>
        </Group>
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

      <Modal opened={importOpened} onClose={importHandlers.close} title="Import Characters">
        <Stack>
          <Text size="sm">
            Import characters from a JSON export file. Existing characters with the
            same identifier will be overwritten.
          </Text>

          <Group justify="space-between" align="center">
            <FileButton
              onChange={handleFileSelect}
              accept="application/json"
            >
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
