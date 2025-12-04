import {
  ActionIcon,
  Box,
  Burger,
  Button,
  Drawer,
  Group,
  Modal,
  NavLink,
  Select,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";
import { Link, useParams } from "@tanstack/react-router";
import {
  getActivePersonaID,
  getActivePresetID,
  getAllPersonas,
  getAllPresets,
  getOpenRouterApiKey,
  resetConversation,
  updateActivePersona,
  updateActivePreset,
  upsertOpenRouterApiKey,
} from "../hooks/header";
import type { Persona, Preset } from "../utils/db";
import React from "react";
import { invalidateOpenRouterClient } from "../utils/openrouter";

const Header = () => {
  const pinned = useHeadroom({ fixedAt: 120 });
  const [opened, { open, close }] = useDisclosure(false);

  const looseParams = useParams({ strict: false });
  const [openedChat, handlerChat] = useDisclosure(false);

  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [presets, setPresets] = React.useState<Preset[]>([]);
  const [activePersona, setActivePersona] = React.useState<string | null>(null);
  const [personas, setPersonas] = React.useState<Persona[]>([]);
  const [apiKeyValue, setApiKeyValue] = React.useState<string>("");
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false);
  const [apiKeyMessage, setApiKeyMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchPresets = async () => {
      const allPresets = await getAllPresets();
      const active = await getActivePresetID();

      setPresets(allPresets);
      setActivePreset(active);

      const allPersonas = await getAllPersonas();
      const activeP = await getActivePersonaID();
      setPersonas(allPersonas);
      setActivePersona(activeP);

      const storedKey = await getOpenRouterApiKey();
      setApiKeyValue(storedKey);
    };
    fetchPresets();
  }, []);

  const handleSaveApiKey = async () => {
    setIsSavingApiKey(true);
    try {
      await upsertOpenRouterApiKey(apiKeyValue);
      invalidateOpenRouterClient();
      setApiKeyMessage(
        apiKeyValue.trim().length > 0
          ? "OpenRouter API key saved."
          : "OpenRouter API key cleared."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save API key.";
      setApiKeyMessage(message);
    } finally {
      setIsSavingApiKey(false);
    }
  };

  return (
    <Box
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        padding: "var(--mantine-spacing-xs)",
        height: 60,
        zIndex: 220,
        transform: `translate3d(0, ${pinned ? 0 : "-110px"}, 0)`,
        transition: "transform 400ms ease",

        backdropFilter: "saturate(180%) blur(20px)",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
      }}
    >
      <Group justify="space-between" align="center" h="100%">
        <Burger opened={opened} onClick={opened ? close : open} />

        <ActionIcon
          size="lg"
          onClick={() => {
            handlerChat.open();
          }}
        >
          <IconSettings />
        </ActionIcon>
      </Group>

      <Drawer
        opened={opened}
        onClose={close}
        withCloseButton={false}
        position="top"
        styles={{
          content: {
            backdropFilter: "saturate(180%) blur(20px)",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
          header: {
            backgroundColor: "rgba(0, 0, 0, 0.0)",
          },
        }}
      >
        <SimpleGrid cols={2} mt={60}>
          <NavLink component={Link} to="/" label="Home" />
          <NavLink component={Link} to="/character" label="My Characters" />
          <NavLink component={Link} to="/chat" label="My Chats" />
          <NavLink component={Link} to="/persona" label=" My Personas" />
          <NavLink component={Link} to="/preset" label="My Presets" />
          <NavLink component={Link} to="/lorebook" label="My Lorebooks" />
        </SimpleGrid>
      </Drawer>

      <Modal opened={openedChat} onClose={handlerChat.close} title="Settings">
        <Select
          label="Preset Selector"
          placeholder="Select a preset to apply"
          value={activePreset || undefined}
          onChange={async (value) => {
            setActivePreset(value || null);
            await updateActivePreset(value || null);
          }}
          data={presets.map((preset) => ({
            value: preset.id,
            label: preset.name,
          }))}
        />

        <Select
          label="Persona Selector"
          placeholder="Select a persona to apply"
          value={activePersona || undefined}
          onChange={async (value) => {
            setActivePersona(value || null);
            await updateActivePersona(value || null);
          }}
          data={personas.map((persona) => ({
            value: persona.id,
            label: persona.name,
          }))}
        />

        <TextInput
          mt="md"
          label="OpenRouter API Key"
          placeholder="Paste your OpenRouter API key"
          value={apiKeyValue}
          onChange={(event) => {
            setApiKeyValue(event.currentTarget.value);
            setApiKeyMessage(null);
          }}
          type="password"
        />

        <Group justify="space-between" mt="xs">
          <Text size="xs" c="dimmed">
            Key is stored locally in your browser database.
          </Text>
          <Group gap="xs">
            <Button
              variant="default"
              size="compact-sm"
              onClick={() => {
                setApiKeyValue("");
                setApiKeyMessage(null);
              }}
            >
              Clear
            </Button>
            <Button
              size="compact-sm"
              onClick={handleSaveApiKey}
              loading={isSavingApiKey}
            >
              Save Key
            </Button>
          </Group>
        </Group>

        {apiKeyMessage && (
          <Text size="sm" c="dimmed" mt="xs">
            {apiKeyMessage}
          </Text>
        )}

        {looseParams.chatId && (
          <Button
            color="red"
            onClick={async () => {
              await resetConversation(looseParams.chatId);
              handlerChat.close();
            }}
          >
            Clear Conversation
          </Button>
        )}
      </Modal>
    </Box>
  );
};

export default Header;
