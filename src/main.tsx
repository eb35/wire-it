import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { clerkEnabled, clerkPublishableKey } from "./lib/clerk";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    {clerkEnabled ? (
      <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
