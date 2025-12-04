import {
  Button,
  Group,
  Slider,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { hasLength, useForm } from "@mantine/form";
import { db, type Preset } from "../../utils/db";
import { generateUUID } from "../../utils/UUID";

export const Route = createFileRoute("/preset/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navTo = useNavigate();

  const form = useForm<Preset>({
    mode: "uncontrolled",
    initialValues: {
      id: generateUUID(),
      isActive: false,
      name: "",
      model: "deepseek/deepseek-chat-v3-0324",
      preHistoryInstructions: "",
      postHistoryInstructions: "",
      impersonationPrompt: "",
      temperature: 0.7,
      repetitionPenalty: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      topP: 1.0,
      topK: 40,
      contextSize: 2048,
      maxNewToken: 2048,
    },

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
        await db.presets.add(values).then(() => {
          navTo({
            to: "/preset",
          });
        });
      })}
    >
      <Stack>
        <Group justify="space-between" align="end" mb="md">
          <Title order={2}>New Preset</Title>
          <Button type="submit">Create Preset</Button>
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
