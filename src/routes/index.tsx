import { NavLink, SimpleGrid, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <React.Fragment>
      <Title order={2} mb="md">
        Welcome to the AI Chat Application
      </Title>
      <Text mb="lg">
        Use the links below to navigate to different sections of the
        application.
      </Text>

      <SimpleGrid cols={2}>
        <NavLink component={Link} to="/character" label="My Characters" />
        <NavLink component={Link} to="/chat" label="My Chats" />
        <NavLink component={Link} to="/persona" label=" My Personas" />
        <NavLink component={Link} to="/preset" label="My Presets" />
        <NavLink component={Link} to="/lorebook" label="My Lorebooks" />
      </SimpleGrid>
    </React.Fragment>
  );
}
