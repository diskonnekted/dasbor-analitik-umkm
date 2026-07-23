// src/hooks/useDB.ts
import { useSyncExternalStore } from "react";
import { initDB } from "@/lib/db";

type Status = "idle" | "loading" | "ready" | "error";
let state: Status = "idle";
let error: string | null = null;
let promise: Promise<unknown> | null = null;
const listeners = new Set<() => void>();

function set(s: Status, e: string | null = null) {
  state = s;
  error = e;
  listeners.forEach((l) => l());
}

export function useDB(): { status: Status; error: string | null } {
  function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }
  function get() {
    return state;
  }
  useSyncExternalStore(subscribe, get, get);

  if (state === "idle") {
    set("loading");
    promise = initDB()
      .then(() => set("ready"))
      .catch((e) => set("error", String(e?.message ?? e)));
  }
  return { status: state, error };
}
