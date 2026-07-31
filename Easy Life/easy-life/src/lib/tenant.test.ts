import { describe, expect, it } from "vitest";
import {
  isIronLakeCommunityUser,
  resolveDemoTenant,
  readCookieValue,
  userBelongsToDemoTenant,
  listSalesReadyTenants,
  listAllDemoTenants,
  demoLoginsForTenant,
  GOLDEN_OCALA_TENANT,
  HERITAGE_BAY_TENANT,
  HUNTERS_RIDGE_TENANT,
  BONITA_BAY_TENANT,
  SHADOW_WOOD_TENANT,
  HERON_CREEK_TENANT,
  DEBARY_TENANT,
  JACARANDA_TENANT,
  IRONCREST_TENANT,
  THE_DUNES_TENANT,
  MARTIN_DOWNS_TENANT,
  THE_NEST_TENANT,
  SEAGATE_TENANT,
  COPPERLEAF_TENANT,
  CLUB_RENAISSANCE_TENANT,
  WORTHINGTON_TENANT,
  FALLS_CLUB_TENANT,
  ESTERO_TENANT,
  WILDCAT_RUN_TENANT,
  HIGHLAND_WOODS_TENANT,
  BONITA_NATIONAL_TENANT,
  CARROLLWOOD_TENANT,
  WINDSOR_TENANT,
  SPANISH_WELLS_TENANT,
  HARBOR_POINTE_TENANT,
  WILLOW_CREEK_TENANT,
  ALLIANT_TENANT,
} from "@/lib/tenant";

describe("demo tenant", () => {
  it("locks ironcrest hosts and cookies to iron-lake", () => {
    expect(resolveDemoTenant("ironcrest-easy-life.vercel.app")?.communityId).toBe(
      "iron-lake",
    );
    expect(resolveDemoTenant("preview-ironcrest.example.com")?.id).toBe("ironcrest");
    expect(resolveDemoTenant("easy-life-peach-two.vercel.app", "ironcrest")?.id).toBe(
      "ironcrest",
    );
    expect(resolveDemoTenant("easy-life-peach-two.vercel.app")).toBeNull();
    expect(resolveDemoTenant(null, "ironcrest")?.loginHeroSrc).toContain("ironcrest");
  });

  it("prefers /go cookie over DEMO_TENANT env so multi-club demos work", () => {
    const prev = process.env.DEMO_TENANT;
    process.env.DEMO_TENANT = "heritagebay";
    try {
      expect(resolveDemoTenant("easy-life-peach-two.vercel.app", "shadowwood")?.id).toBe(
        "shadowwood",
      );
    } finally {
      if (prev === undefined) delete process.env.DEMO_TENANT;
      else process.env.DEMO_TENANT = prev;
    }
  });

  it("locks goldenocala hosts and cookies to golden-ocala", () => {
    expect(resolveDemoTenant("goldenocala-demo.vercel.app")?.communityId).toBe(
      "golden-ocala",
    );
    expect(resolveDemoTenant("easy-life-peach-two.vercel.app", "goldenocala")?.id).toBe(
      "goldenocala",
    );
    expect(
      resolveDemoTenant("easy-life-peach-two.vercel.app", "goldenocala")?.logoSrc,
    ).toContain("golden-ocala");
    expect(resolveDemoTenant(null, "goldenocala")?.loginHeroSrc).toContain(
      "golden-ocala",
    );
  });

  it("locks heritagebay hosts and cookies to heritage-bay", () => {
    expect(resolveDemoTenant("heritagebay-demo.vercel.app")?.communityId).toBe(
      "heritage-bay",
    );
    expect(resolveDemoTenant(null, "heritagebay")?.id).toBe("heritagebay");
    expect(resolveDemoTenant(null, "heritagebay")?.logoSrc).toContain("heritage-bay");
  });

  it("locks huntersridge hosts and cookies to hunters-ridge", () => {
    expect(resolveDemoTenant("huntersridge-demo.vercel.app")?.communityId).toBe(
      "hunters-ridge",
    );
    expect(resolveDemoTenant(null, "huntersridge")?.id).toBe("huntersridge");
    expect(resolveDemoTenant(null, "huntersridge")?.logoSrc).toContain("hunters-ridge");
  });

  it("locks bonitabay hosts and cookies to bonita-bay", () => {
    expect(resolveDemoTenant("bonitabay-demo.vercel.app")?.communityId).toBe("bonita-bay");
    expect(resolveDemoTenant(null, "bonitabay")?.id).toBe("bonitabay");
    expect(resolveDemoTenant(null, "bonitabay")?.logoSrc).toContain("bonita-bay");
  });

  it("locks shadowwood hosts and cookies to shadow-wood", () => {
    expect(resolveDemoTenant("shadowwood-demo.vercel.app")?.communityId).toBe("shadow-wood");
    expect(resolveDemoTenant(null, "shadowwood")?.id).toBe("shadowwood");
    expect(resolveDemoTenant(null, "shadowwood")?.logoSrc).toContain("shadow-wood");
  });

  it("locks heroncreek hosts and cookies to heron-creek", () => {
    expect(resolveDemoTenant("heroncreek-demo.vercel.app")?.communityId).toBe("heron-creek");
    expect(resolveDemoTenant(null, "heroncreek")?.id).toBe("heroncreek");
    expect(resolveDemoTenant(null, "heroncreek")?.logoSrc).toContain("heron-creek");
  });

  it("locks debary hosts and cookies to debary", () => {
    expect(resolveDemoTenant("debary-demo.vercel.app")?.communityId).toBe("debary");
    expect(resolveDemoTenant(null, "debary")?.id).toBe("debary");
    expect(resolveDemoTenant(null, "debary")?.logoSrc).toContain("debary");
  });

  it("locks jacaranda hosts and cookies to jacaranda", () => {
    expect(resolveDemoTenant("jacaranda-demo.vercel.app")?.communityId).toBe("jacaranda");
    expect(resolveDemoTenant(null, "jacaranda")?.id).toBe("jacaranda");
    expect(resolveDemoTenant(null, "jacaranda")?.logoSrc).toContain("jacaranda");
  });

  it("locks thedunes hosts and cookies to the-dunes", () => {
    expect(resolveDemoTenant("thedunes-demo.vercel.app")?.communityId).toBe("the-dunes");
    expect(resolveDemoTenant(null, "thedunes")?.id).toBe("thedunes");
    expect(resolveDemoTenant(null, "thedunes")?.logoSrc).toContain("the-dunes");
  });

  it("locks martindowns hosts and cookies to martin-downs", () => {
    expect(resolveDemoTenant("martindowns-demo.vercel.app")?.communityId).toBe(
      "martin-downs",
    );
    expect(resolveDemoTenant(null, "martindowns")?.id).toBe("martindowns");
    expect(resolveDemoTenant(null, "martindowns")?.logoSrc).toContain("martin-downs");
  });

  it("locks thenest hosts and cookies to the-nest", () => {
    expect(resolveDemoTenant("thenest-demo.vercel.app")?.communityId).toBe("the-nest");
    expect(resolveDemoTenant(null, "thenest")?.id).toBe("thenest");
    expect(resolveDemoTenant(null, "thenest")?.logoSrc).toContain("the-nest");
  });

  it("locks seagate hosts and cookies to seagate", () => {
    expect(resolveDemoTenant("seagate-demo.vercel.app")?.communityId).toBe("seagate");
    expect(resolveDemoTenant(null, "seagate")?.id).toBe("seagate");
    expect(resolveDemoTenant(null, "seagate")?.logoSrc).toContain("seagate");
  });

  it("locks copperleaf hosts and cookies to copperleaf", () => {
    expect(resolveDemoTenant("copperleaf-demo.vercel.app")?.communityId).toBe("copperleaf");
    expect(resolveDemoTenant(null, "copperleaf")?.id).toBe("copperleaf");
    expect(resolveDemoTenant(null, "copperleaf")?.logoSrc).toContain("copperleaf");
  });

  it("locks clubrenaissance hosts and cookies to club-renaissance", () => {
    expect(resolveDemoTenant("clubrenaissance-demo.vercel.app")?.communityId).toBe(
      "club-renaissance",
    );
    expect(resolveDemoTenant(null, "clubrenaissance")?.id).toBe("clubrenaissance");
    expect(resolveDemoTenant(null, "clubrenaissance")?.logoSrc).toContain("club-renaissance");
  });

  it("locks fallsclub hosts and cookies to falls-club", () => {
    expect(resolveDemoTenant("fallsclub-demo.vercel.app")?.communityId).toBe("falls-club");
    expect(resolveDemoTenant(null, "fallsclub")?.id).toBe("fallsclub");
    expect(resolveDemoTenant(null, "fallsclub")?.logoSrc).toContain("falls-club");
  });

  it("locks estero hosts and cookies to estero", () => {
    expect(resolveDemoTenant("estero-demo.vercel.app")?.communityId).toBe("estero");
    expect(resolveDemoTenant(null, "estero")?.id).toBe("estero");
    expect(resolveDemoTenant(null, "estero")?.logoSrc).toContain("estero");
  });

  it("locks wildcatrun hosts and cookies to wildcat-run", () => {
    expect(resolveDemoTenant("wildcatrun-demo.vercel.app")?.communityId).toBe("wildcat-run");
    expect(resolveDemoTenant(null, "wildcatrun")?.id).toBe("wildcatrun");
    expect(resolveDemoTenant(null, "wildcatrun")?.logoSrc).toContain("wildcat-run");
  });

  it("locks highlandwoods hosts and cookies to highland-woods", () => {
    expect(resolveDemoTenant("highlandwoods-demo.vercel.app")?.communityId).toBe("highland-woods");
    expect(resolveDemoTenant(null, "highlandwoods")?.id).toBe("highlandwoods");
    expect(resolveDemoTenant(null, "highlandwoods")?.logoSrc).toContain("highland-woods");
  });

  it("locks bonitanational hosts and cookies to bonita-national", () => {
    expect(resolveDemoTenant("bonitanational-demo.vercel.app")?.communityId).toBe("bonita-national");
    expect(resolveDemoTenant(null, "bonitanational")?.id).toBe("bonitanational");
    expect(resolveDemoTenant(null, "bonitanational")?.logoSrc).toContain("bonita-national");
  });

  it("locks windsor hosts and cookies to windsor", () => {
    expect(resolveDemoTenant("windsor-demo.vercel.app")?.communityId).toBe("windsor");
    expect(resolveDemoTenant(null, "windsor")?.id).toBe("windsor");
    expect(resolveDemoTenant(null, "windsor")?.logoSrc).toContain("windsor");
  });

  it("locks carrollwood hosts and cookies to carrollwood", () => {
    expect(resolveDemoTenant("carrollwood-demo.vercel.app")?.communityId).toBe("carrollwood");
    expect(resolveDemoTenant(null, "carrollwood")?.id).toBe("carrollwood");
    expect(resolveDemoTenant(null, "carrollwood")?.logoSrc).toContain("carrollwood");
  });

  it("locks worthington hosts and cookies to worthington", () => {
    expect(resolveDemoTenant("worthington-demo.vercel.app")?.communityId).toBe("worthington");
    expect(resolveDemoTenant(null, "worthington")?.id).toBe("worthington");
    expect(resolveDemoTenant(null, "worthington")?.logoSrc).toContain("worthington");
  });

  it("locks spanishwells hosts and cookies to spanish-wells", () => {
    expect(resolveDemoTenant("spanishwells-demo.vercel.app")?.communityId).toBe("spanish-wells");
    expect(resolveDemoTenant(null, "spanishwells")?.logoSrc).toContain("spanish-wells");
  });

  it("locks harborpointe hosts and cookies to harbor-pointe", () => {
    expect(resolveDemoTenant("harborpointe-demo.vercel.app")?.communityId).toBe("harbor-pointe");
    expect(resolveDemoTenant(null, "harborpointe")?.logoSrc).toContain("harbor-pointe");
  });

  it("locks willowcreek hosts and cookies to willow-creek", () => {
    expect(resolveDemoTenant("willowcreek-demo.vercel.app")?.communityId).toBe("willow-creek");
    expect(resolveDemoTenant(null, "willowcreek")?.logoSrc).toContain("willow-creek");
  });

  it("locks alliant hosts and cookies to alliant", () => {
    expect(resolveDemoTenant("alliant-demo.vercel.app")?.communityId).toBe("alliant");
    expect(resolveDemoTenant(null, "alliant")?.defaultLoginEmail).toContain("pm.demo");
    expect(resolveDemoTenant(null, "alliant")?.logoSrc).toContain("alliant");
  });

  it("readCookieValue prefers the last duplicate cookie", () => {
    expect(
      readCookieValue(
        "el_demo_tenant=bonitabay; el_active_community=shadow-wood; el_demo_tenant=shadowwood",
        "el_demo_tenant",
      ),
    ).toBe("shadowwood");
  });

  it("accepts only matching community users on a locked tenant", () => {
    expect(isIronLakeCommunityUser("iron-lake")).toBe(true);
    expect(isIronLakeCommunityUser("golden-ocala")).toBe(false);
    expect(userBelongsToDemoTenant("iron-lake", IRONCREST_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("golden-ocala", IRONCREST_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("golden-ocala", GOLDEN_OCALA_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("iron-lake", GOLDEN_OCALA_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant(null, GOLDEN_OCALA_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("heritage-bay", HERITAGE_BAY_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("iron-lake", HERITAGE_BAY_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("hunters-ridge", HUNTERS_RIDGE_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("heritage-bay", HUNTERS_RIDGE_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("bonita-bay", BONITA_BAY_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("hunters-ridge", BONITA_BAY_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("shadow-wood", SHADOW_WOOD_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("bonita-bay", SHADOW_WOOD_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("heron-creek", HERON_CREEK_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("shadow-wood", HERON_CREEK_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("debary", DEBARY_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("heron-creek", DEBARY_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("jacaranda", JACARANDA_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("debary", JACARANDA_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("the-dunes", THE_DUNES_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("jacaranda", THE_DUNES_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("martin-downs", MARTIN_DOWNS_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("the-dunes", MARTIN_DOWNS_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("the-nest", THE_NEST_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("the-dunes", THE_NEST_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("seagate", SEAGATE_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("the-nest", SEAGATE_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("copperleaf", COPPERLEAF_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("seagate", COPPERLEAF_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("club-renaissance", CLUB_RENAISSANCE_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("seagate", CLUB_RENAISSANCE_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("falls-club", FALLS_CLUB_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("club-renaissance", FALLS_CLUB_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("worthington", WORTHINGTON_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("falls-club", WORTHINGTON_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("estero", ESTERO_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("wildcat-run", WILDCAT_RUN_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("highland-woods", HIGHLAND_WOODS_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("bonita-national", BONITA_NATIONAL_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("carrollwood", CARROLLWOOD_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("windsor", WINDSOR_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("spanish-wells", SPANISH_WELLS_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("harbor-pointe", HARBOR_POINTE_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("willow-creek", WILLOW_CREEK_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("alliant", ALLIANT_TENANT)).toBe(true);
    expect(userBelongsToDemoTenant("estero", WILDCAT_RUN_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("worthington", ESTERO_TENANT)).toBe(false);
    expect(userBelongsToDemoTenant("windsor", SPANISH_WELLS_TENANT)).toBe(false);
  });

  it("hides salesReady:false tenants from the sales directory", () => {
    const ready = listSalesReadyTenants();
    const all = listAllDemoTenants();
    expect(all.some((t) => t.id === "fallsclub")).toBe(true);
    expect(FALLS_CLUB_TENANT.salesReady).toBe(false);
    expect(ready.some((t) => t.id === "fallsclub")).toBe(false);
    expect(ready.map((t) => t.id).sort()).toEqual([
      "alliant",
      "harborpointe",
      "spanishwells",
      "willowcreek",
    ]);
    expect(ready.length).toBeLessThan(all.length);
  });

  it("returns role demo logins for sales cheat sheets", () => {
    const spanish = demoLoginsForTenant(SPANISH_WELLS_TENANT);
    expect(spanish).toEqual([
      {
        role: "Member",
        email: "member.demo@spanishwellscountryclub.com",
        password: "password",
      },
      {
        role: "Board",
        email: "board.demo@spanishwellscountryclub.com",
        password: "password",
      },
      {
        role: "PM",
        email: "pm.demo@spanishwellscountryclub.com",
        password: "password",
      },
    ]);
    const iron = demoLoginsForTenant(IRONCREST_TENANT);
    expect(iron.some((l) => l.role === "Admin")).toBe(true);
    expect(iron.some((l) => l.email === "member.equestrian@theclubatironlake.com")).toBe(
      true,
    );
    expect(iron.some((l) => l.email === "lawn@ironcrest.services" && l.password === "password1!")).toBe(
      true,
    );
    expect(iron).toHaveLength(9);
    expect(demoLoginsForTenant(ALLIANT_TENANT)[0]?.email).toContain("resident.demo");
    expect(
      demoLoginsForTenant(GOLDEN_OCALA_TENANT).some(
        (l) =>
          l.email === "cassiesmeticuloustouch@gmail.com" &&
          l.password === "password1!",
      ),
    ).toBe(true);
  });
});
