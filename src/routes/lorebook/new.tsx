import {
  Button,
  Group,
  Stack,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { hasLength, useForm } from "@mantine/form";
import { db, type Lorebook } from "../../utils/db";
import { generateUUID } from "../../utils/UUID";

export const Route = createFileRoute("/lorebook/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navTo = useNavigate();

  const form = useForm<Lorebook>({
    mode: "uncontrolled",
    initialValues: {
      id: generateUUID(),
      name: "",
      description: "",
      content: "",
    },
    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      content: hasLength({ min: 1 }, "Content is required"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await db.lorebooks.add(values);
        navTo({ to: "/lorebook" });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>New Lorebook</Title>
          <Button type="submit">Create Lorebook</Button>
        </Group>

        <TextInput
          label="Name"
          placeholder="Enter lorebook name"
          key={form.key("name")}
          {...form.getInputProps("name")}
        />

        <TextInput
          label="Description"
          placeholder="Optional short description"
          key={form.key("description")}
          {...form.getInputProps("description")}
        />

        <Textarea
          label="Content"
          placeholder="Write the lore content"
          key={form.key("content")}
          {...form.getInputProps("content")}
          minRows={6}
          autosize
        />
      </Stack>
    </form>
  );
}
