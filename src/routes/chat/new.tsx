import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { db, type Chat } from "../../utils/db";
import { hasLength, useForm } from "@mantine/form";
import { generateUUID } from "../../utils/UUID";
import {
  Button,
  Group,
  MultiSelect,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";

export const Route = createFileRoute("/chat/new")({
  component: RouteComponent,
  loader: async () => {
    const [characters, lorebooks] = await Promise.all([
      db.characters.toArray(),
      db.lorebooks.toArray(),
    ]);

    return { characters, lorebooks };
  },
});

function RouteComponent() {
  const { characters, lorebooks } = Route.useLoaderData();
  const navTo = useNavigate();

  const identifiers = useMemo(() => {
    return {
      chatId: generateUUID(),
      branchId: generateUUID(),
    };
  }, []);

  const form = useForm<Chat>({
    mode: "uncontrolled",
    initialValues: {
      id: identifiers.chatId,
      name: "",
      characterIds: [],
      lorebookIds: [],
      activeBranchId: identifiers.branchId,
    },
    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      characterIds: (value) =>
        value.length === 0 ? "At least one character must be selected" : null,
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        const branchId = values.activeBranchId ?? generateUUID();

        await db.transaction("rw", db.chats, db.chatBranches, async () => {
          await db.chats.add({
            ...values,
            activeBranchId: branchId,
          });

          await db.chatBranches.add({
            id: branchId,
            chatId: values.id,
            name: "Main",
            parentBranchId: null,
            pivotMessageId: null,
            createdAt: Date.now(),
          });
        });

        navTo({
          to: "/chat",
        });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>New Chat</Title>
          <Button type="submit">Create Chat</Button>
        </Group>

        <TextInput
          label="Name"
          placeholder="Enter chat name"
          key={form.key("name")}
          {...form.getInputProps("name")}
        />

        <MultiSelect
          label="Characters"
          placeholder="Select characters"
          data={
            characters.map((char) => ({
              value: char.id,
              label: char.inChatName,
            })) || []
          }
          key={form.key("characterIds")}
          {...form.getInputProps("characterIds")}
          multiple
          searchable
        />

        <MultiSelect
          label="Lorebooks"
          placeholder="Attach lorebooks"
          data={lorebooks.map((l) => ({ value: l.id, label: l.name }))}
          key={form.key("lorebookIds")}
          {...form.getInputProps("lorebookIds")}
          multiple
          searchable
          clearable
        />
      </Stack>
    </form>
  );
}
