import { afterEach, describe, expect, it } from "vitest";
import { clearScreenCache, readScreen, writeScreen } from "@/lib/screen-cache";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("screen-cache user scoping", () => {
  const previous = globalThis.localStorage;

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previous,
    });
  });

  function install() {
    const store = new MemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: store,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: store },
    });
    return store;
  }

  it("does not return another member's cached screen", () => {
    install();
    writeScreen("alice@club.com", "member-threads", [
      { id: "t1", lastMessage: "Alice private note" },
    ]);
    expect(readScreen("bob@club.com", "member-threads")).toBeNull();
    expect(readScreen("alice@club.com", "member-threads")).toEqual([
      { id: "t1", lastMessage: "Alice private note" },
    ]);
  });

  it("ignores blank user keys so unscoped paints cannot happen", () => {
    install();
    writeScreen("  ", "member-home", { profile: { name: "Nope" } });
    expect(readScreen("", "member-home")).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("clearScreenCache removes every barnaby-screen entry including legacy keys", () => {
    const store = install();
    writeScreen("alice@club.com", "member-home", { ok: true });
    store.setItem("barnaby-screen:member-threads", JSON.stringify([{ id: "legacy" }]));
    clearScreenCache();
    expect(localStorage.length).toBe(0);
  });
});
