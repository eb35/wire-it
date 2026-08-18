import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { clerkEnabled } from "./lib/clerk";
import { CloudSession } from "./components/CloudSession";
import { Editor } from "./components/Editor";
import { SignInScreen } from "./components/SignInScreen";

export function App() {
  if (!clerkEnabled) {
    return <Editor />;
  }

  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <div className="relative">
          <Editor />
          <CloudSession />
        </div>
      </SignedIn>
    </>
  );
}
