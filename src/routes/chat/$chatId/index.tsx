import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { db, type Chat } from "../../../utils/db";
import { hasLength, useForm } from "@mantine/form";
import {
  Stack,
  Group,
  Title,
  Button,
  TextInput,
  MultiSelect,
} from "@mantine/core";

export const Route = createFileRoute("/chat/$chatId/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const chatId = params.chatId;

    const chat = await db.chats.get(chatId);
    if (!chat) {
      throw new Response("Chat Not Found", { status: 404 });
    }
    const [characters, lorebooks] = await Promise.all([
      db.characters.toArray(),
      db.lorebooks.toArray(),
    ]);

    return {
      chat: chat,
      characters,
      lorebooks,
    };
  },
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();
  const navTo = useNavigate();

  const form = useForm<Chat>({
    mode: "uncontrolled",
    initialValues: loaderData.chat,
    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      characterIds: hasLength({ min: 1 }, "At least one character is required"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await db.chats
          .update(loaderData.chat.id, {
            name: values.name,
            characterIds: values.characterIds,
            lorebookIds: values.lorebookIds,
          })
          .then(() => {
            navTo({
              to: "/chat",
            });
          });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>Update Chat</Title>
          <Button type="submit">Update Chat</Button>
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
            loaderData.characters.map((char) => ({
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
          data={loaderData.lorebooks.map((l) => ({ value: l.id, label: l.name }))}
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
