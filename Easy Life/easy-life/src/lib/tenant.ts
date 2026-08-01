/**
 * Edge-safe demo tenant resolution (host, cookie, and/or DEMO_TENANT env).
 * Used by middleware and server/login branding.
 *
 * Sales demos: each `/go/[tenant]` locks that club's logo on login/home
 * so multiple reps can demo different clubs on the same Vercel site.
 */

export const ACTIVE_COMMUNITY_COOKIE = "el_active_community";
export const DEMO_TENANT_COOKIE = "el_demo_tenant";

/** Last matching cookie wins (browsers may send duplicates after /go switches). */
export function readCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const re = new RegExp(
    `(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`,
    "gi",
  );
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cookieHeader)) !== null) {
    last = decodeURIComponent(m[1] ?? "").trim();
  }
  return last || null;
}

export type DemoTenantId =
  | "ironcrest"
  | "goldenocala"
  | "heritagebay"
  | "huntersridge"
  | "bonitabay"
  | "shadowwood"
  | "heroncreek"
  | "debary"
  | "jacaranda"
  | "thedunes"
  | "martindowns"
  | "thenest"
  | "seagate"
  | "copperleaf"
  | "clubrenaissance"
  | "worthington"
  | "fallsclub"
  | "estero"
  | "wildcatrun"
  | "highlandwoods"
  | "bonitanational"
  | "carrollwood"
  | "windsor"
  | "spanishwells"
  | "harborpointe"
  | "willowcreek"
  | "alliant"
  | "oceansideresidents";

export type DemoTenant = {
  id: DemoTenantId;
  /** Community row locked for this demo site */
  communityId: string;
  brandName: string;
  productName: string;
  communityName: string;
  defaultLoginEmail: string;
  logoSrc: string;
  /** Circular login-hero center image (club crest). Easy Life uses the house aerial. */
  loginHeroSrc: string;
  /** Host substrings that lock this tenant (e.g. ironcrest.example.com) */
  hostHints: string[];
  envHostsKey: string;
  /**
   * When false, hide from the /go sales directory (direct /go/[id] still works).
   * Omit or true = ready for sales demos.
   */
  salesReady?: boolean;
};

export const IRONCREST_TENANT: DemoTenant = {
  id: "ironcrest",
  communityId: "iron-lake",
  brandName: "IronCrest",
  productName: "IronCrest",
  communityName: "The Club at Iron Lake",
  defaultLoginEmail: "member.golf@theclubatironlake.com",
  logoSrc: "/brand/community-ironcrest.svg",
  loginHeroSrc: "/brand/login-hero-ironcrest.png",
  hostHints: ["ironcrest"],
  envHostsKey: "IRONCREST_HOSTS",
};

export const GOLDEN_OCALA_TENANT: DemoTenant = {
  id: "goldenocala",
  communityId: "golden-ocala",
  brandName: "Golden Ocala",
  productName: "Golden Ocala",
  communityName: "Golden Ocala",
  defaultLoginEmail: "sarah.mitchell@oceanside.com",
  logoSrc: "/brand/community-golden-ocala.png",
  loginHeroSrc: "/brand/login-hero-golden-ocala.png",
  hostHints: ["goldenocala", "golden-ocala"],
  envHostsKey: "GOLDEN_OCALA_HOSTS",
};

export const HERITAGE_BAY_TENANT: DemoTenant = {
  id: "heritagebay",
  communityId: "heritage-bay",
  brandName: "Heritage Bay",
  productName: "Heritage Bay",
  communityName: "Heritage Bay Golf & Country Club",
  defaultLoginEmail: "member.demo@golfheritagebay.com",
  logoSrc: "/brand/community-heritage-bay.png",
  loginHeroSrc: "/brand/community-heritage-bay.png",
  hostHints: ["heritagebay", "heritage-bay"],
  envHostsKey: "HERITAGE_BAY_HOSTS",
};

export const HUNTERS_RIDGE_TENANT: DemoTenant = {
  id: "huntersridge",
  communityId: "hunters-ridge",
  brandName: "Hunters Ridge",
  productName: "Hunters Ridge",
  communityName: "Hunters Ridge Golf & Country Club",
  defaultLoginEmail: "member.demo@huntersridge-ca.com",
  logoSrc: "/brand/community-hunters-ridge.png",
  loginHeroSrc: "/brand/community-hunters-ridge.png",
  hostHints: ["huntersridge", "hunters-ridge"],
  envHostsKey: "HUNTERS_RIDGE_HOSTS",
};

export const BONITA_BAY_TENANT: DemoTenant = {
  id: "bonitabay",
  communityId: "bonita-bay",
  brandName: "Bonita Bay Club",
  productName: "Bonita Bay Club",
  communityName: "Bonita Bay Club",
  defaultLoginEmail: "member.demo@bonitabayclub.net",
  logoSrc: "/brand/community-bonita-bay.png",
  loginHeroSrc: "/brand/community-bonita-bay.png",
  hostHints: ["bonitabay", "bonita-bay"],
  envHostsKey: "BONITA_BAY_HOSTS",
};

export const SHADOW_WOOD_TENANT: DemoTenant = {
  id: "shadowwood",
  communityId: "shadow-wood",
  brandName: "Shadow Wood",
  productName: "Shadow Wood",
  communityName: "Shadow Wood Country Club",
  defaultLoginEmail: "member.demo@shadowwoodcc.com",
  logoSrc: "/brand/community-shadow-wood.png",
  loginHeroSrc: "/brand/community-shadow-wood.png",
  hostHints: ["shadowwood", "shadow-wood"],
  envHostsKey: "SHADOW_WOOD_HOSTS",
};

export const HERON_CREEK_TENANT: DemoTenant = {
  id: "heroncreek",
  communityId: "heron-creek",
  brandName: "Heron Creek",
  productName: "Heron Creek",
  communityName: "Heron Creek Golf & Country Club",
  defaultLoginEmail: "member.demo@heroncreekgcc.com",
  logoSrc: "/brand/community-heron-creek.png",
  loginHeroSrc: "/brand/community-heron-creek.png",
  hostHints: ["heroncreek", "heron-creek"],
  envHostsKey: "HERON_CREEK_HOSTS",
};

export const DEBARY_TENANT: DemoTenant = {
  id: "debary",
  communityId: "debary",
  brandName: "DeBary",
  productName: "DeBary",
  communityName: "DeBary Golf & Country Club",
  defaultLoginEmail: "member.demo@debarycc.com",
  logoSrc: "/brand/community-debary.png",
  loginHeroSrc: "/brand/community-debary.png",
  hostHints: ["debary", "debarycc"],
  envHostsKey: "DEBARY_HOSTS",
};

export const JACARANDA_TENANT: DemoTenant = {
  id: "jacaranda",
  communityId: "jacaranda",
  brandName: "Jacaranda",
  productName: "Jacaranda",
  communityName: "Jacaranda Golf Club",
  defaultLoginEmail: "member.demo@jacarandagolfclub.com",
  logoSrc: "/brand/community-jacaranda.png",
  loginHeroSrc: "/brand/community-jacaranda.png",
  hostHints: ["jacaranda", "jacarandagolfclub"],
  envHostsKey: "JACARANDA_HOSTS",
};

export const THE_DUNES_TENANT: DemoTenant = {
  id: "thedunes",
  communityId: "the-dunes",
  brandName: "The Dunes",
  productName: "The Dunes",
  communityName: "The Dunes Golf & Tennis Club",
  defaultLoginEmail: "member.demo@sanibeldunesresort.com",
  logoSrc: "/brand/community-the-dunes.png",
  loginHeroSrc: "/brand/community-the-dunes.png",
  hostHints: ["thedunes", "the-dunes", "sanibeldunes"],
  envHostsKey: "THE_DUNES_HOSTS",
};

export const MARTIN_DOWNS_TENANT: DemoTenant = {
  id: "martindowns",
  communityId: "martin-downs",
  brandName: "Martin Downs",
  productName: "Martin Downs",
  communityName: "Martin Downs Golf Club",
  defaultLoginEmail: "member.demo@martindownsgolfclub.com",
  logoSrc: "/brand/community-martin-downs.png",
  loginHeroSrc: "/brand/community-martin-downs.png",
  hostHints: ["martindowns", "martin-downs", "martindownsgolf"],
  envHostsKey: "MARTIN_DOWNS_HOSTS",
};

export const THE_NEST_TENANT: DemoTenant = {
  id: "thenest",
  communityId: "the-nest",
  brandName: "The Nest",
  productName: "The Nest",
  communityName: "The Nest Golf Club",
  defaultLoginEmail: "member.demo@nestgolf.com",
  logoSrc: "/brand/community-the-nest.png",
  loginHeroSrc: "/brand/community-the-nest.png",
  hostHints: ["thenest", "the-nest", "nestgolf"],
  envHostsKey: "THE_NEST_HOSTS",
};

export const SEAGATE_TENANT: DemoTenant = {
  id: "seagate",
  communityId: "seagate",
  brandName: "Seagate",
  productName: "Seagate",
  communityName: "Seagate Country Club",
  defaultLoginEmail: "member.demo@seagatedelray.com",
  logoSrc: "/brand/community-seagate.png",
  loginHeroSrc: "/brand/community-seagate.png",
  hostHints: ["seagate", "seagatedelray"],
  envHostsKey: "SEAGATE_HOSTS",
};

export const COPPERLEAF_TENANT: DemoTenant = {
  id: "copperleaf",
  communityId: "copperleaf",
  brandName: "Copperleaf",
  productName: "Copperleaf",
  communityName: "Copperleaf Golf Club",
  defaultLoginEmail: "member.demo@copperleafgolf.com",
  logoSrc: "/brand/community-copperleaf.png",
  loginHeroSrc: "/brand/community-copperleaf.png",
  hostHints: ["copperleaf", "copperleafgolf"],
  envHostsKey: "COPPERLEAF_HOSTS",
};

export const CLUB_RENAISSANCE_TENANT: DemoTenant = {
  id: "clubrenaissance",
  communityId: "club-renaissance",
  brandName: "Club Renaissance",
  productName: "Club Renaissance",
  communityName: "Club Renaissance Golf Club",
  defaultLoginEmail: "member.demo@clubrenaissance.com",
  logoSrc: "/brand/community-club-renaissance.png",
  loginHeroSrc: "/brand/community-club-renaissance.png",
  hostHints: ["clubrenaissance", "club-renaissance"],
  envHostsKey: "CLUB_RENAISSANCE_HOSTS",
};

export const WORTHINGTON_TENANT: DemoTenant = {
  id: "worthington",
  communityId: "worthington",
  brandName: "Worthington",
  productName: "Worthington",
  communityName: "Worthington Country Club",
  defaultLoginEmail: "member.demo@worthingtoncc.com",
  logoSrc: "/brand/community-worthington.png",
  loginHeroSrc: "/brand/community-worthington.png",
  hostHints: ["worthington", "worthingtoncc"],
  envHostsKey: "WORTHINGTON_HOSTS",
};

export const FALLS_CLUB_TENANT: DemoTenant = {
  id: "fallsclub",
  communityId: "falls-club",
  brandName: "The Falls Club",
  productName: "The Falls Club",
  communityName: "The Falls Club of the Palm Beaches",
  defaultLoginEmail: "member.demo@thefallsclub.com",
  logoSrc: "/brand/community-falls-club.png",
  loginHeroSrc: "/brand/community-falls-club.png",
  hostHints: ["fallsclub", "falls-club", "thefallsclub"],
  envHostsKey: "FALLS_CLUB_HOSTS",
  /** Closed / not for active sales demos — still reachable via direct /go/fallsclub. */
  salesReady: false,
};

export const ESTERO_TENANT: DemoTenant = {
  id: "estero",
  communityId: "estero",
  brandName: "Estero Country Club",
  productName: "Estero Country Club",
  communityName: "Estero Country Club",
  defaultLoginEmail: "member.demo@esterocc.com",
  logoSrc: "/brand/community-estero.png",
  loginHeroSrc: "/brand/community-estero.png",
  hostHints: ["estero", "esterocc", "thevines"],
  envHostsKey: "ESTERO_HOSTS",
};

export const WILDCAT_RUN_TENANT: DemoTenant = {
  id: "wildcatrun",
  communityId: "wildcat-run",
  brandName: "Wildcat Run",
  productName: "Wildcat Run",
  communityName: "Wildcat Run Golf & Country Club",
  defaultLoginEmail: "member.demo@wildcatruncc.com",
  logoSrc: "/brand/community-wildcat-run.png",
  loginHeroSrc: "/brand/community-wildcat-run.png",
  hostHints: ["wildcatrun", "wildcat-run", "wildcatruncc"],
  envHostsKey: "WILDCAT_RUN_HOSTS",
};

export const HIGHLAND_WOODS_TENANT: DemoTenant = {
  id: "highlandwoods",
  communityId: "highland-woods",
  brandName: "Highland Woods",
  productName: "Highland Woods",
  communityName: "Highland Woods Golf & Country Club",
  defaultLoginEmail: "member.demo@hwgcc.com",
  logoSrc: "/brand/community-highland-woods.png",
  loginHeroSrc: "/brand/community-highland-woods.png",
  hostHints: ["highlandwoods", "highland-woods", "hwgcc"],
  envHostsKey: "HIGHLAND_WOODS_HOSTS",
};

export const BONITA_NATIONAL_TENANT: DemoTenant = {
  id: "bonitanational",
  communityId: "bonita-national",
  brandName: "Bonita National",
  productName: "Bonita National",
  communityName: "Bonita National Golf & Country Club",
  defaultLoginEmail: "member.demo@bonitanationalgolfcc.com",
  logoSrc: "/brand/community-bonita-national.png",
  loginHeroSrc: "/brand/community-bonita-national.png",
  hostHints: ["bonitanational", "bonita-national", "bonitanationalgolfcc"],
  envHostsKey: "BONITA_NATIONAL_HOSTS",
};

export const CARROLLWOOD_TENANT: DemoTenant = {
  id: "carrollwood",
  communityId: "carrollwood",
  brandName: "Carrollwood",
  productName: "Carrollwood",
  communityName: "Carrollwood Country Club",
  defaultLoginEmail: "member.demo@carrollwoodcc.com",
  logoSrc: "/brand/community-carrollwood.png",
  loginHeroSrc: "/brand/community-carrollwood.png",
  hostHints: ["carrollwood", "carrollwoodcc"],
  envHostsKey: "CARROLLWOOD_HOSTS",
};

export const WINDSOR_TENANT: DemoTenant = {
  id: "windsor",
  communityId: "windsor",
  brandName: "The Windsor Club",
  productName: "Windsor Club",
  communityName: "The Windsor Club",
  defaultLoginEmail: "member.demo@windsorflorida.com",
  logoSrc: "/brand/community-windsor.png",
  loginHeroSrc: "/brand/community-windsor.png",
  hostHints: ["windsor", "windsorflorida"],
  envHostsKey: "WINDSOR_HOSTS",
};

export const SPANISH_WELLS_TENANT: DemoTenant = {
  id: "spanishwells",
  communityId: "spanish-wells",
  brandName: "Spanish Wells",
  productName: "Spanish Wells",
  communityName: "Spanish Wells Golf & Country Club",
  defaultLoginEmail: "member.demo@spanishwellscountryclub.com",
  logoSrc: "/brand/community-spanish-wells-wordmark.png",
  loginHeroSrc: "/brand/community-spanish-wells.png",
  hostHints: ["spanishwells", "spanish-wells", "spanishwellscountryclub"],
  envHostsKey: "SPANISH_WELLS_HOSTS",
};

export const HARBOR_POINTE_TENANT: DemoTenant = {
  id: "harborpointe",
  communityId: "harbor-pointe",
  brandName: "Harbor Pointe",
  productName: "Harbor Pointe",
  communityName: "Harbor Pointe",
  defaultLoginEmail: "member.demo@harborpointehoa.com",
  logoSrc: "/brand/community-harbor-pointe.png",
  loginHeroSrc: "/brand/community-harbor-pointe.png",
  hostHints: ["harborpointe", "harbor-pointe"],
  envHostsKey: "HARBOR_POINTE_HOSTS",
};

export const WILLOW_CREEK_TENANT: DemoTenant = {
  id: "willowcreek",
  communityId: "willow-creek",
  brandName: "Willow Creek",
  productName: "Willow Creek",
  communityName: "Willow Creek",
  defaultLoginEmail: "member.demo@willowcreekhoa.com",
  logoSrc: "/brand/community-willow-creek.png",
  loginHeroSrc: "/brand/community-willow-creek.png",
  hostHints: ["willowcreek", "willow-creek"],
  envHostsKey: "WILLOW_CREEK_HOSTS",
};

export const ALLIANT_TENANT: DemoTenant = {
  id: "alliant",
  communityId: "alliant",
  brandName: "Alliant",
  productName: "Alliant Association Management",
  communityName: "Alliant Association Management",
  defaultLoginEmail: "pm.demo@alliantproperty.com",
  logoSrc: "/brand/community-alliant.png",
  loginHeroSrc: "/brand/community-alliant.png",
  hostHints: ["alliant", "alliantproperty"],
  envHostsKey: "ALLIANT_HOSTS",
};

export const OCEANSIDE_RESIDENTS_TENANT: DemoTenant = {
  id: "oceansideresidents",
  communityId: "oceanside-residents",
  brandName: "Oceanside Residents",
  productName: "Oceanside Residents",
  communityName: "Oceanside Residents",
  defaultLoginEmail: "dlms6768@gmail.com",
  logoSrc: "/brand/community-oceanside.png",
  loginHeroSrc: "/brand/community-oceanside.png",
  hostHints: ["oceansideresidents", "oceanside-residents"],
  envHostsKey: "OCEANSIDE_RESIDENTS_HOSTS",
};

export const DEMO_TENANTS: Record<DemoTenantId, DemoTenant> = {
  ironcrest: IRONCREST_TENANT,
  goldenocala: GOLDEN_OCALA_TENANT,
  heritagebay: HERITAGE_BAY_TENANT,
  huntersridge: HUNTERS_RIDGE_TENANT,
  bonitabay: BONITA_BAY_TENANT,
  shadowwood: SHADOW_WOOD_TENANT,
  heroncreek: HERON_CREEK_TENANT,
  debary: DEBARY_TENANT,
  jacaranda: JACARANDA_TENANT,
  thedunes: THE_DUNES_TENANT,
  martindowns: MARTIN_DOWNS_TENANT,
  thenest: THE_NEST_TENANT,
  seagate: SEAGATE_TENANT,
  copperleaf: COPPERLEAF_TENANT,
  clubrenaissance: CLUB_RENAISSANCE_TENANT,
  worthington: WORTHINGTON_TENANT,
  fallsclub: FALLS_CLUB_TENANT,
  estero: ESTERO_TENANT,
  wildcatrun: WILDCAT_RUN_TENANT,
  highlandwoods: HIGHLAND_WOODS_TENANT,
  bonitanational: BONITA_NATIONAL_TENANT,
  carrollwood: CARROLLWOOD_TENANT,
  windsor: WINDSOR_TENANT,
  spanishwells: SPANISH_WELLS_TENANT,
  harborpointe: HARBOR_POINTE_TENANT,
  willowcreek: WILLOW_CREEK_TENANT,
  alliant: ALLIANT_TENANT,
  oceansideresidents: OCEANSIDE_RESIDENTS_TENANT,
};

function parseTenantId(raw: string | null | undefined): DemoTenantId | null {
  const id = raw?.trim().toLowerCase();
  if (!id) return null;
  if (
    id === "ironcrest" ||
    id === "goldenocala" ||
    id === "heritagebay" ||
    id === "huntersridge" ||
    id === "bonitabay" ||
    id === "shadowwood" ||
    id === "heroncreek" ||
    id === "debary" ||
    id === "jacaranda" ||
    id === "thedunes" ||
    id === "martindowns" ||
    id === "thenest" ||
    id === "seagate" ||
    id === "copperleaf" ||
    id === "clubrenaissance" ||
    id === "worthington" ||
    id === "fallsclub" ||
    id === "wildcatrun" ||
    id === "estero" ||
    id === "highlandwoods" ||
    id === "bonitanational" ||
    id === "carrollwood" ||
    id === "windsor" ||
    id === "spanishwells" ||
    id === "harborpointe" ||
    id === "willowcreek" ||
    id === "alliant" ||
    id === "oceansideresidents"
  ) {
    return id;
  }
  return null;
}

function hostMatchesTenant(host: string, tenant: DemoTenant): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  if (!h) return false;
  if (tenant.hostHints.some((hint) => h.includes(hint))) return true;
  const configured = (process.env[tenant.envHostsKey] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return configured.some((d) => h === d || h.endsWith(`.${d}`));
}

/** Resolve locked demo tenant from Host, cookie, and/or DEMO_TENANT env. */
export function resolveDemoTenant(
  host: string | null,
  cookieTenant?: string | null,
): DemoTenant | null {
  // Cookie (and /go/[tenant] locks) win over DEMO_TENANT so one Vercel project
  // can host multiple club demos without an env var pinning a single club.
  const fromCookie = parseTenantId(cookieTenant);
  if (fromCookie) return DEMO_TENANTS[fromCookie];

  const fromEnv = parseTenantId(process.env.DEMO_TENANT);
  if (fromEnv) return DEMO_TENANTS[fromEnv];

  if (host) {
    for (const tenant of Object.values(DEMO_TENANTS)) {
      if (hostMatchesTenant(host, tenant)) return tenant;
    }
  }
  return null;
}

/** Prefer the last duplicate demo-tenant cookie on the raw Cookie header. */
export function resolveDemoTenantFromCookieHeader(
  host: string | null,
  cookieHeader: string | null | undefined,
): DemoTenant | null {
  return resolveDemoTenant(host, readCookieValue(cookieHeader, DEMO_TENANT_COOKIE));
}

export function getDemoTenantById(id: string | null | undefined): DemoTenant | null {
  const parsed = parseTenantId(id);
  return parsed ? DEMO_TENANTS[parsed] : null;
}

/** True when the signed-in user belongs to the locked demo community. */
export function userBelongsToDemoTenant(
  communityId: string | null | undefined,
  tenant: DemoTenant,
): boolean {
  return communityId === tenant.communityId;
}

export function isIronLakeCommunityUser(communityId: string | null | undefined): boolean {
  return communityId === IRONCREST_TENANT.communityId;
}

export function tenantByCommunityId(
  communityId: string | null | undefined,
): DemoTenant | null {
  if (!communityId) return null;
  return (
    Object.values(DEMO_TENANTS).find((t) => t.communityId === communityId) ?? null
  );
}

/** Tenants shown on the /go sales directory — full demo catalog. */
export function listSalesReadyTenants(): DemoTenant[] {
  return Object.values(DEMO_TENANTS);
}

export function listAllDemoTenants(): DemoTenant[] {
  return Object.values(DEMO_TENANTS);
}

export type DemoLoginRole =
  | "Member"
  | "Golf Member"
  | "National Golf"
  | "Social Member"
  | "Sports Member"
  | "Equestrian Member"
  | "Resident · Golf + HOA"
  | "Club-only · National"
  | "Resident · Social"
  | "Resident · Sports"
  | "Resident · Equestrian"
  | "Board"
  | "PM"
  | "Admin"
  | "Provider";

export type DemoLogin = {
  role: DemoLoginRole;
  email: string;
  password: string;
};

const DEMO_PASSWORD = "password";

/** Demo accounts salespeople can use after `/go/[tenant]`. */
export function demoLoginsForTenant(
  tenant: Pick<DemoTenant, "id" | "defaultLoginEmail">,
): DemoLogin[] {
  switch (tenant.id) {
    case "ironcrest":
      return [
        {
          role: "Resident · Golf + HOA",
          email: "member.golf@theclubatironlake.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Club-only · National",
          email: "member.national@theclubatironlake.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Resident · Social",
          email: "member.social@theclubatironlake.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Resident · Sports",
          email: "member.sports@theclubatironlake.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Resident · Equestrian",
          email: "member.equestrian@theclubatironlake.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Board",
          email: "board@ironcrest.com",
          password: DEMO_PASSWORD,
        },
        { role: "PM", email: "pm@ironcrest.com", password: DEMO_PASSWORD },
        {
          role: "Admin",
          email: "admin@theclubatironlake.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Provider",
          email: "lawn@ironcrest.services",
          password: "password1!",
        },
      ];
    case "goldenocala":
      return [
        {
          role: "Member",
          email: "sarah.mitchell@oceanside.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Board",
          email: "james.rodriguez@oceanside.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "PM",
          email: "michael.thompson@oceanside.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Provider",
          email: "cassiesmeticuloustouch@gmail.com",
          password: "password1!",
        },
      ];
    case "alliant":
      return [
        {
          role: "Member",
          email: "resident.demo@alliantproperty.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "Board",
          email: "board.demo@alliantproperty.com",
          password: DEMO_PASSWORD,
        },
        {
          role: "PM",
          email: "pm.demo@alliantproperty.com",
          password: DEMO_PASSWORD,
        },
      ];
    default: {
      const at = tenant.defaultLoginEmail.lastIndexOf("@");
      const domain =
        at >= 0 ? tenant.defaultLoginEmail.slice(at + 1) : "example.com";
      return [
        {
          role: "Member",
          email: `member.demo@${domain}`,
          password: DEMO_PASSWORD,
        },
        {
          role: "Board",
          email: `board.demo@${domain}`,
          password: DEMO_PASSWORD,
        },
        { role: "PM", email: `pm.demo@${domain}`, password: DEMO_PASSWORD },
      ];
    }
  }
}
