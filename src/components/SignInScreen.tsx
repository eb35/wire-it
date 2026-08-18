import { SignIn } from "@clerk/clerk-react";

export function SignInScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4 text-zinc-100">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Wire-it</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          Household Romex documentation. Invite-only — use the email you were invited with.
        </p>
      </div>
      <SignIn
        routing="hash"
        appearance={{
          variables: {
            colorBackground: "#18181b",
            colorInputBackground: "#09090b",
            colorInputText: "#fafafa",
            colorText: "#fafafa",
            colorPrimary: "#38bdf8",
            colorTextSecondary: "#a1a1aa",
            borderRadius: "0.5rem",
          },
        }}
      />
    </div>
  );
}
