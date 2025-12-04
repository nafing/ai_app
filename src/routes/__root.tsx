import { Outlet, createRootRoute } from "@tanstack/react-router";
import React from "react";
import Header from "../components/Header";
import { Container } from "@mantine/core";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <Header />

      <Container mt={64} mb="md">
        <Outlet />
      </Container>
    </React.Fragment>
  );
}
