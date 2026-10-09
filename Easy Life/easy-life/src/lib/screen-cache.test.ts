import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearScreenCaches, readScreen, writeScreen } from "@/lib/screen-cache";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
}

describe("screen-cache user scoping", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  afterEach(() => {
    clearScreenCaches();
    vi.unstubAllGlobals();
  });

  it("does not return another member's cached screen", () => {
    writeScreen("alice@club.com", "member-home", {
      profile: { name: "Alice", email: "alice@club.com" },
      balance: 420,
    });
    writeScreen("bob@club.com", "member-home", {
      profile: { name: "Bob", email: "bob@club.com" },
      balance: 15,
    });

    expect(readScreen<{ balance: number }>("bob@club.com", "member-home")?.balance).toBe(15);
    expect(readScreen<{ balance: number }>("alice@club.com", "member-home")?.balance).toBe(420);
    expect(readScreen("carol@club.com", "member-home")).toBeNull();
  });

  it("ignores blank emails and clears all barnaby-screen keys on logout", () => {
    writeScreen("alice@club.com", "member-threads", [{ id: "t1" }]);
    writeScreen("bob@club.com", "member-thread:t1", [{ body: "secret" }]);
    writeScreen("", "member-home", { balance: 1 });

    expect(readScreen("", "member-home")).toBeNull();
    clearScreenCaches();
    expect(readScreen("alice@club.com", "member-threads")).toBeNull();
    expect(readScreen("bob@club.com", "member-thread:t1")).toBeNull();
  });
});
