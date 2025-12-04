import { hasLength, useForm } from "@mantine/form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { db, type Lorebook } from "../../../utils/db";
import {
  Button,
  Group,
  Stack,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";

export const Route = createFileRoute("/lorebook/$lorebookId/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const lorebook = await db.lorebooks.get(params.lorebookId);
    if (!lorebook) {
      throw new Response("Lorebook Not Found", { status: 404 });
    }

    return lorebook;
  },
});

function RouteComponent() {
  const lorebook = Route.useLoaderData();
  const navTo = useNavigate();

  const form = useForm<Lorebook>({
    mode: "uncontrolled",
    initialValues: lorebook,
    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      content: hasLength({ min: 1 }, "Content is required"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await db.lorebooks.update(lorebook.id, values);
        navTo({ to: "/lorebook" });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>Update Lorebook</Title>
          <Button type="submit">Update Lorebook</Button>
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
