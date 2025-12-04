import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@mantine/core/styles.layer.css";
import { MantineProvider } from "@mantine/core";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultStaleTime: 2000,
  scrollRestoration: true,
  basepath: "/ai_app",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        defaultGradient: { from: "#862c52ff", to: "#225590ff", deg: 120 },

        components: {
          Button: {
            defaultProps: {
              variant: "light",
              size: "xs",
            },
          },
          ActionIcon: {
            defaultProps: {
              variant: "light",
            },
          },
          TextInput: {
            styles: {
              input: {
                backdropFilter: "saturate(180%) blur(20px)",
                backgroundColor: "rgba(0, 0, 0, 0.4)",
              },
            },
          },
          Textarea: {
            styles: {
              input: {
                backdropFilter: "saturate(180%) blur(20px)",
                backgroundColor: "rgba(0, 0, 0, 0.4)",
              },
            },
          },
          Select: {
            styles: {
              input: {
                backdropFilter: "saturate(180%) blur(20px)",
                backgroundColor: "rgba(0, 0, 0, 0.4)",
              },
            },
          },
          MultiSelect: {
            styles: {
              input: {
                backdropFilter: "saturate(180%) blur(20px)",
                backgroundColor: "rgba(0, 0, 0, 0.4)",
              },
            },
          },
          Popover: {
            styles: {
              dropdown: {
                backdropFilter: "saturate(180%) blur(20px)",
                backgroundColor: "rgba(0, 0, 0, 0.4)",
              },
            },
          },
          Modal: {
            defaultProps: {
              zIndex: 300,
            },
            styles: {
              content: {
                backdropFilter: "saturate(180%) blur(20px)",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "2px solid rgba(255, 255, 255, 0.1)",
              },
              header: {
                backgroundColor: "transparent",
              },
            },
          },
          Drawer: {
            defaultProps: {
              zIndex: 200,
            },
          },
        },
      }}
    >
      <RouterProvider router={router} defaultViewTransition={true} />
    </MantineProvider>
  </StrictMode>
);
