import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { App } from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

const tree = <App />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {convex ? (
      <ConvexAuthProvider client={convex}>{tree}</ConvexAuthProvider>
    ) : (
      tree
    )}
  </StrictMode>,
);
