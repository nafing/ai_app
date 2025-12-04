import { hasLength, useForm } from "@mantine/form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { db, type Character } from "../../../utils/db";
import {
  Stack,
  Group,
  Title,
  Button,
  TextInput,
  Textarea,
  MultiSelect,
} from "@mantine/core";

export const Route = createFileRoute("/character/$characterId/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const characterId = params.characterId;

    const character = await db.characters.get(characterId);
    if (!character) {
      throw new Response("Character Not Found", { status: 404 });
    }

    const lorebooks = await db.lorebooks.toArray();

    return { character, lorebooks };
  },
});

function RouteComponent() {
  const { character, lorebooks } = Route.useLoaderData();
  const navTo = useNavigate();

  const form = useForm<Character>({
    mode: "uncontrolled",
    initialValues: character,
    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      inChatName: hasLength({ min: 1 }, "In Chat Name is required"),
      description: hasLength({ min: 1 }, "Description is required"),
      initMessage: hasLength({ min: 1 }, "Initial Message is required"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await db.characters.put({ ...values, id: character.id });
        navTo({
          to: "/character",
        });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>Update Character</Title>
          <Button type="submit">Update Character</Button>
        </Group>

        <TextInput
          label="Name"
          placeholder="Enter character name"
          key={form.key("name")}
          {...form.getInputProps("name")}
        />

        <TextInput
          label="In Chat Name"
          placeholder="Enter in chat name"
          key={form.key("inChatName")}
          {...form.getInputProps("inChatName")}
        />

        <TextInput
          label="Avatar"
          placeholder="Enter avatar URL"
          key={form.key("avatar")}
          {...form.getInputProps("avatar")}
        />

        <Textarea
          label="Description"
          placeholder="Enter description"
          key={form.key("description")}
          {...form.getInputProps("description")}
          minRows={2}
          autosize
        />

        <Textarea
          label="Initial Message"
          placeholder="Enter initial message"
          key={form.key("initMessage")}
          {...form.getInputProps("initMessage")}
          minRows={2}
          autosize
        />

        <Textarea
          label="Scenario"
          placeholder="Enter scenario"
          key={form.key("scenario")}
          {...form.getInputProps("scenario")}
          minRows={2}
          autosize
        />

        <MultiSelect
          label="Lorebooks"
          placeholder="Attach lorebooks"
          data={lorebooks.map((l) => ({ value: l.id, label: l.name }))}
          searchable
          clearable
          key={form.key("lorebookIds")}
          {...form.getInputProps("lorebookIds")}
        />
      </Stack>
    </form>
  );
}
