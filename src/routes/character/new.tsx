import {
  Button,
  Group,
  MultiSelect,
  Stack,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { hasLength, useForm } from "@mantine/form";
import { db, type Character } from "../../utils/db";
import { generateUUID } from "../../utils/UUID";

export const Route = createFileRoute("/character/new")({
  loader: async () => {
    return await db.lorebooks.toArray();
  },
  component: RouteComponent,
});

function RouteComponent() {
  const lorebooks = Route.useLoaderData();
  const navTo = useNavigate();

  const form = useForm<Character>({
    mode: "uncontrolled",
    initialValues: {
      id: generateUUID(),
      avatar: "",
      name: "",
      inChatName: "",
      description: "",
      initMessage: "",
      scenario: "",
      lorebookIds: [],
    },

    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      inChatName: hasLength({ min: 1 }, "In Chat Name is required"),
      description: hasLength({ min: 1 }, "Description is required"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await db.characters.add(values).then(() => {
          navTo({
            to: "/character",
          });
        });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>New Character</Title>
          <Button type="submit">Create Character</Button>
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
