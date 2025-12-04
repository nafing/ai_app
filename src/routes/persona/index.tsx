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
import { db, type Persona } from "../../utils/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useDisclosure } from "@mantine/hooks";
import { exportEntitiesToFile, parseImportedEntities } from "../../utils/exportImport";
import { generateUUID } from "../../utils/UUID";

export const Route = createFileRoute("/persona/")({
  component: RouteComponent,
});

function RouteComponent() {
  const personas = useLiveQuery(() => db.personas.toArray());

  const [opened, handlers] = useDisclosure();
  const [deletingPersonaId, setDeletingPersonaId] = React.useState<
    string | null
  >(null);
  const [importOpened, importHandlers] = useDisclosure(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>("");
  const pendingFileRef = React.useRef<File | null>(null);

  const handleDelete = (id: string) => {
    setDeletingPersonaId(id);
    handlers.open();
  };

  const handleExport = React.useCallback(async () => {
    const allPersonas = (await db.personas.toArray()) ?? [];
    exportEntitiesToFile("personas", allPersonas);
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
      const rawItems = await parseImportedEntities<Partial<Persona>>(
        "personas",
        pendingFileRef.current
      );

      if (rawItems.length === 0) {
        throw new Error("Import file does not contain any personas.");
      }

      const sanitized: Persona[] = rawItems.map((item) => {
        const idCandidate = typeof item.id === "string" ? item.id.trim() : "";
        const name = (item.name ?? "").trim();
        const inChatName = (item.inChatName ?? "").trim();

        return {
          id: idCandidate || generateUUID(),
          name: name || "Unnamed Persona",
          inChatName: inChatName || name || "User",
          description: item.description ?? "",
          avatar: item.avatar,
          isActive: Boolean(item.isActive),
          lorebookIds: Array.isArray(item.lorebookIds) ? item.lorebookIds : [],
        };
      });

      const deduped = new Map<string, Persona>();
      for (const persona of sanitized) {
        if (deduped.has(persona.id)) {
          persona.id = generateUUID();
          persona.isActive = false;
        }
        deduped.set(persona.id, persona);
      }

      await db.transaction("rw", db.personas, async () => {
        await db.personas.bulkPut(Array.from(deduped.values()));
      });

      importHandlers.close();
      setSelectedFileName("");
      pendingFileRef.current = null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import personas.";
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <React.Fragment>
      <Group justify="space-between" align="end" mb="md">
        <Title order={2}>Personas</Title>
        <Group gap="xs">
          <Button variant="default" onClick={handleExport}>
            Export
          </Button>
          <Button variant="default" onClick={importHandlers.open}>
            Import
          </Button>
          <Button component={Link} to="/persona/new/">
            New Persona
          </Button>
        </Group>
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

      <Modal opened={importOpened} onClose={importHandlers.close} title="Import Personas">
        <Stack>
          <Text size="sm">
            Import personas from a JSON export file. Existing personas with the same
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
