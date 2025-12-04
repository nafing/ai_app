import { hasLength, useForm } from "@mantine/form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { db, type Persona } from "../../../utils/db";
import {
  Stack,
  Group,
  Title,
  Button,
  TextInput,
  Textarea,
  MultiSelect,
} from "@mantine/core";

export const Route = createFileRoute("/persona/$personaId/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const personaId = params.personaId;

    const persona = await db.personas.get(personaId);
    if (!persona) {
      throw new Response("Persona Not Found", { status: 404 });
    }

    const lorebooks = await db.lorebooks.toArray();

    return { persona, lorebooks };
  },
});

function RouteComponent() {
  const { persona, lorebooks } = Route.useLoaderData();
  const navTo = useNavigate();

  const form = useForm<Persona>({
    mode: "uncontrolled",
    initialValues: persona,
    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      inChatName: hasLength({ min: 1 }, "In Chat Name is required"),
      description: hasLength({ min: 1 }, "Description is required"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await db.personas.put({ ...values, id: persona.id });
        navTo({
          to: "/persona",
        });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>Update Persona</Title>
          <Button type="submit">Update Persona</Button>
        </Group>

        <TextInput
          label="Name"
          placeholder="Enter persona name"
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
