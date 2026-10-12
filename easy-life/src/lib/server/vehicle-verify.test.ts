import { describe, expect, it } from "vitest";
import { scoreVehicleDocuments } from "@/lib/server/vehicle-verify";

describe("vehicle document verification", () => {
  const claim = {
    year: 2022,
    make: "Toyota",
    model: "Camry",
    plate: "ABC1234",
    ownerName: "Sarah Mitchell",
    memberName: "Sarah Mitchell",
    memberEmail: "sarah.mitchell@oceanside.com",
  };

  it("verifies when registration and insurance text match the claim", () => {
    const result = scoreVehicleDocuments(claim, [
      {
        kind: "registration",
        fileName: "2022-toyota-camry-registration.pdf",
        text: "Owner Sarah Mitchell 2022 Toyota Camry plate ABC1234",
      },
      {
        kind: "insurance",
        fileName: "insurance-card.pdf",
        text: "Insured Sarah Mitchell Toyota Camry ABC1234",
      },
      {
        kind: "gov_id",
        fileName: "drivers-license.jpg",
        text: "Sarah Mitchell Driver License",
      },
    ]);
    expect(result.status).toBe("verified");
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("rejects when owner is not the club member", () => {
    const result = scoreVehicleDocuments(
      { ...claim, ownerName: "John Doe" },
      [
        {
          kind: "registration",
          fileName: "reg.pdf",
          text: "John Doe 2022 Toyota Camry ABC1234",
        },
        {
          kind: "insurance",
          fileName: "ins.pdf",
          text: "John Doe Toyota Camry",
        },
      ],
    );
    expect(result.status).toBe("rejected");
    expect(result.matches.find((m) => m.field === "owner_is_member")?.matched).toBe(false);
  });
});
