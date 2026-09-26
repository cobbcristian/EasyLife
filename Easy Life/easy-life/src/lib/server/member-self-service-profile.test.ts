import { describe, expect, it } from "vitest";
import { memberSelfServiceProfilePatch } from "@/lib/server/member-self-service-profile";

describe("memberSelfServiceProfilePatch", () => {
  it("strips unit and other billing-identity fields from member patches", () => {
    const safe = memberSelfServiceProfilePatch({
      phone: "555-0100",
      unit: "402",
      householdRole: "admin",
      paysHoa: false,
      residencyStatus: "owner",
      membershipTier: "full",
      directoryVisible: true,
      commsPush: true,
    });

    expect(safe).toEqual({
      phone: "555-0100",
      joined: undefined,
      directoryVisible: true,
      commsEmail: undefined,
      commsSms: undefined,
      commsPush: true,
    });
    expect(safe).not.toHaveProperty("unit");
    expect(safe).not.toHaveProperty("paysHoa");
    expect(safe).not.toHaveProperty("householdRole");
  });
});
