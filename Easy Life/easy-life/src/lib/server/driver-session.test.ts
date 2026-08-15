import { describe, expect, it } from "vitest";
import {
  createDriverSessionToken,
  verifyDriverSessionToken,
} from "@/lib/server/driver-session";

describe("driver-session", () => {
  it("accepts a token for the matching driver id", async () => {
    const token = await createDriverSessionToken("driver_abc");
    expect(await verifyDriverSessionToken(token, "driver_abc")).toBe(true);
  });

  it("rejects a token used against a different driver id", async () => {
    const token = await createDriverSessionToken("driver_abc");
    expect(await verifyDriverSessionToken(token, "driver_other")).toBe(false);
  });

  it("rejects missing or garbage tokens", async () => {
    expect(await verifyDriverSessionToken(undefined, "driver_abc")).toBe(false);
    expect(await verifyDriverSessionToken("not-a-jwt", "driver_abc")).toBe(false);
  });
});
