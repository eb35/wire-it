import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useDiagramStore } from "../store/useDiagramStore";

export function CloudSession() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const connectCloud = useDiagramStore((state) => state.connectCloud);
  const disconnectCloud = useDiagramStore((state) => state.disconnectCloud);
  const pendingMigration = useDiagramStore((state) => state.pendingMigration);
  const acceptMigration = useDiagramStore((state) => state.acceptMigration);
  const skipMigration = useDiagramStore((state) => state.skipMigration);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      disconnectCloud();
      return;
    }
    void connectCloud({ userId, getToken });
  }, [isLoaded, isSignedIn, userId, getToken, connectCloud, disconnectCloud]);

  if (pendingMigration == null) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
      <div className="max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-xl">
        <h2 className="text-base font-semibold">Upload drawings from this browser?</h2>
        <p className="mt-2 text-sm text-zinc-400">
          This account has no cloud drawings yet. This browser has {pendingMigration}{" "}
          {pendingMigration === 1 ? "drawing" : "drawings"} saved locally. Upload them so they
          follow you to other devices, or start empty.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded bg-sky-400 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-sky-300"
            onClick={() => void acceptMigration()}
          >
            Upload them
          </button>
          <button
            type="button"
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => void skipMigration()}
          >
            Start empty
          </button>
        </div>
      </div>
    </div>
  );
}
