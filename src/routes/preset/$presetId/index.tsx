import { hasLength, useForm } from "@mantine/form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { db, type Preset } from "../../../utils/db";
import {
  Stack,
  Group,
  Title,
  Button,
  TextInput,
  Textarea,
  Text,
  Slider,
} from "@mantine/core";

export const Route = createFileRoute("/preset/$presetId/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const presetId = params.presetId;

    const preset = await db.presets.get(presetId);
    if (!preset) {
      throw new Response("Preset Not Found", { status: 404 });
    }

    return preset;
  },
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();
  const navTo = useNavigate();

  const form = useForm<Preset>({
    mode: "uncontrolled",
    initialValues: loaderData,
    validate: {
      name: hasLength({ min: 1 }, "Name is required"),
      model: hasLength({ min: 1 }, "Model is required"),
      preHistoryInstructions: hasLength(
        { min: 1 },
        "Pre-history instructions are required"
      ),
      postHistoryInstructions: hasLength(
        { min: 1 },
        "Post-history instructions are required"
      ),
      impersonationPrompt: hasLength(
        { min: 1 },
        "Impersonation prompt is required"
      ),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await db.presets.update(loaderData.id, values).then(() => {
          navTo({
            to: "/preset",
          });
        });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>Update Preset</Title>
          <Button type="submit">Update Preset</Button>
        </Group>

        <TextInput
          label="Name"
          placeholder="Enter preset name"
          key={form.key("name")}
          {...form.getInputProps("name")}
        />

        <TextInput
          label="Model"
          placeholder="Enter model name"
          key={form.key("model")}
          {...form.getInputProps("model")}
        />

        <Textarea
          label="Pre-History Instructions"
          placeholder="Enter pre-history instructions"
          minRows={4}
          autosize
          key={form.key("preHistoryInstructions")}
          {...form.getInputProps("preHistoryInstructions")}
        />

        <Textarea
          label="Post-History Instructions"
          placeholder="Enter post-history instructions"
          minRows={4}
          autosize
          key={form.key("postHistoryInstructions")}
          {...form.getInputProps("postHistoryInstructions")}
        />

        <Textarea
          label="Impersonation Prompt"
          placeholder="Enter impersonation prompt"
          minRows={4}
          autosize
          key={form.key("impersonationPrompt")}
          {...form.getInputProps("impersonationPrompt")}
        />

        <div>
          <Text>Temperature</Text>
          <Slider
            min={0}
            max={2}
            step={0.01}
            key={form.key("temperature")}
            {...form.getInputProps("temperature")}
          />
        </div>

        <div>
          <Text>Repetition Penalty</Text>
          <Slider
            min={0}
            max={2}
            step={0.01}
            key={form.key("repetitionPenalty")}
            {...form.getInputProps("repetitionPenalty")}
          />
        </div>

        <div>
          <Text>Frequency Penalty</Text>
          <Slider
            min={-2}
            max={2}
            step={0.01}
            key={form.key("frequencyPenalty")}
            {...form.getInputProps("frequencyPenalty")}
          />
        </div>

        <div>
          <Text>Presence Penalty</Text>
          <Slider
            min={-2}
            max={2}
            step={0.01}
            key={form.key("presencePenalty")}
            {...form.getInputProps("presencePenalty")}
          />
        </div>

        <div>
          <Text>Top P</Text>
          <Slider
            min={0}
            max={1}
            step={0.01}
            key={form.key("topP")}
            {...form.getInputProps("topP")}
          />
        </div>

        <div>
          <Text>Top K</Text>
          <Slider
            min={0}
            max={200}
            step={1}
            key={form.key("topK")}
            {...form.getInputProps("topK")}
          />
        </div>

        <div>
          <Text>Max New Token</Text>
          <Slider
            min={256}
            max={128000}
            step={256}
            key={form.key("maxNewToken")}
            {...form.getInputProps("maxNewToken")}
          />
        </div>

        <div>
          <Text>Context Size</Text>
          <Slider
            min={256}
            max={128000}
            step={256}
            key={form.key("contextSize")}
            {...form.getInputProps("contextSize")}
          />
        </div>
      </Stack>
    </form>
  );
}
