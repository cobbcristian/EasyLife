import { describe, expect, it } from "vitest";
import { translate } from "@/lib/translate";

describe("translate", () => {
  it("passes English through", () => {
    expect(translate("en", "Active")).toBe("Active");
    expect(translate("en", "Code: IRONHEDGE15")).toBe("Code: IRONHEDGE15");
  });

  it("translates dictionary keys and lowercase status", () => {
    expect(translate("es", "Active")).toBe("Activo");
    expect(translate("es", "active")).toBe("Activo");
    expect(translate("es", "Clinics")).toBe("Clínicas");
  });

  it("translates Code: and PPC detail patterns", () => {
    expect(translate("es", "Code: IRONHEDGE15")).toBe("Código: IRONHEDGE15");
    expect(translate("es", "$0.95 / click · $175 budget")).toBe(
      "$0.95 / clic · presupuesto $175",
    );
  });

  it("translates IronCrest promo titles", () => {
    expect(translate("es", "15% off first hedge trim")).toBe(
      "15% desc. en el primer recorte de seto",
    );
  });
});
