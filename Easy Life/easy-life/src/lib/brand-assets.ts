/** Figma-exported brand assets under /public/brand */
export const brandAssets = {
  logoIcon: "/brand/logo-icon.png",
  /** Default Easy Life login hero — aerial houses (not a club crest). */
  loginPhoto: "/brand/login-hero-easylife.png",
  loginPhotoLegacy: "/brand/login.png",
  /** Per-tenant circular login heroes (inside the ring graphic). */
  loginHeroEasyLife: "/brand/login-hero-easylife.png",
  loginHeroIroncrest: "/brand/login-hero-ironcrest.png",
  loginHeroGoldenOcala: "/brand/login-hero-golden-ocala.png",
  loginHeroHeritageBay: "/brand/community-heritage-bay.png",
  loginRingOuter: "/brand/login-ring-outer.svg",
  loginRingMid: "/brand/login-ring-mid.svg",
  loginRingInner: "/brand/login-ring-inner.svg",
  loginFooter: "/brand/login-footer.png",
  /** Figma Login View (9750:8570) — IronCrest header mark */
  loginIroncrestLogo: "/brand/login-ironcrest-logo.png",
  chartGrid: "/brand/chart-bars.svg",
  chartDivider: "/brand/chart-gridline.svg",
  // chart-donut-outer/inner.svg are Figma decorative partial arcs — do NOT use as chart overlays.
  chartPieDivider: "/brand/chart-pie-divider.svg",
  /** RLR lion crest — Golden Ocala only. Do not use as a generic community/hero image. */
  communityGoldenOcala: "/brand/community-golden-ocala.png",
  communityHeritageBay: "/brand/community-heritage-bay.png",
  heritageBayAquaFit: "/brand/heritage-bay-aqua-fit.png",
  communityOceanside: "/brand/community-oceanside.png",
  /** IronCrest / The Club at Iron Lake (Ocala) — official nav mark from discoverironcrest.com */
  communityIroncrest: "/brand/community-ironcrest.png",
  /** Tight wordmark for headers/sidebars (PNG has heavy padding). */
  communityIroncrestSvg: "/brand/community-ironcrest.svg",
  /** Service / vendor covers — one distinct photo per category */
  serviceCleaning: "/brand/service-cleaning.png",
  serviceCarpet: "/brand/service-carpet.png",
  serviceLandscaping: "/brand/service-landscaping.png",
  /** Iron Crest Lawn & Landscape — distinct outdoor thumbs per offering */
  serviceLawnEdging: "/brand/service-lawn-edging.jpg",
  serviceLawnHedge: "/brand/service-lawn-hedge.jpg",
  serviceLawnBrush: "/brand/service-lawn-brush.jpg",
  serviceLawnMulching: "/brand/service-lawn-mulching.jpg",
  serviceLawnDebris: "/brand/service-lawn-debris.jpg",
  /** Championship golf / tee-time booking thumbnails (flag + bunker — readable at card size) */
  serviceGolf: "/brand/service-golf-v2.png",
  amenityDrivingRange: "/brand/amenity-driving-range.png",
  amenityEvCharging: "/brand/amenity-ev-charging.png",
  amenityFitness: "/brand/amenity-fitness.png",
  amenityClubhouse: "/brand/amenity-clubhouse.png",
  amenityLockerRoom: "/brand/amenity-locker-room.png",
  amenitySpa: "/brand/amenity-spa.png",
  amenityPickleball: "/brand/amenity-pickleball.png",
  amenityLodging: "/brand/amenity-lodging.png",
  amenityEventSpace: "/brand/amenity-event-space.png",
  amenityProShop: "/brand/amenity-pro-shop.png",
  amenityTennisClay: "/brand/amenity-tennis-clay.png",
  serviceCourt: "/brand/service-court.png",
  servicePool: "/brand/service-pool.png",
  serviceYoga: "/brand/service-yoga.png",
  servicePainting: "/brand/service-painting.png",
  serviceFitness: "/brand/service-fitness.png",
  serviceHero: "/brand/service-hero.png",
  activityBike: "/brand/activity-bike.png",
  providerAvatar: "/brand/provider-avatar.png",
  onboardingHero: "/brand/onboarding-hero.png",
  foodIceCream: "/brand/food-ice-cream.png",
  bookingThumbCleaning: "/brand/booking-thumb-cleaning.png",
  bookingThumbCarpet: "/brand/booking-thumb-carpet.png",
  avatarReviewerEthan: "/brand/avatar-reviewer-ethan.png",
  /** Female portrait (despite filename) — Sarah, Caroline, and other female demo members. */
  avatarReviewerJake: "/brand/avatar-reviewer-jake.png",
  avatarReviewerNishanth: "/brand/avatar-reviewer-nishanth.png",
  avatarReviewerVicky: "/brand/avatar-reviewer-vicky.png",
  serviceCleaningSupplies: "/brand/service-cleaning-supplies.png",
  // Note: /brand/logo-wordmark.png is a misplaced GO/RLR crest — never use as Easy Life wordmark.
  /** Default member face — female portrait used for Sarah / Caroline demos. */
  memberAvatar: "/brand/avatar-reviewer-jake.png",
  featuredDining: "/brand/featured-dining.png",
  featuredTennis: "/brand/featured-tennis.png",
  featuredGolf: "/brand/service-golf-v2.png",
  foodCatchOfDay: "/brand/food-catch-of-day.png",
  foodIcedTea: "/brand/food-iced-tea.png",
  foodCaesarSalad: "/brand/food-caesar-salad.png",
  foodQuarryBurger: "/brand/food-quarry-burger.png",
  foodHouseSoup: "/brand/food-house-soup.png",
  iconStar: "/brand/icons/icon-star.svg",
  serviceDetailsHero: "/brand/service-details-hero.png",
  /** Marketplace demo listing covers — must match product titles. */
  marketplacePeloton: "/brand/marketplace-peloton.jpg",
  marketplacePatioSet: "/brand/marketplace-patio-set.jpg",
  marketplaceGolfBalls: "/brand/marketplace-golf-balls.png",
  marketplaceKidsRacquet: "/brand/marketplace-kids-racquet.png",
  gallery18thGreenDusk: "/brand/gallery-18th-green-dusk.png",
  galleryClubhouseTerrace: "/brand/gallery-clubhouse-terrace.png",
  /** Iron Lake Golf Shop apparel — crest embroidered product photos. */
  apparelClubPolo: "/brand/apparel-club-polo.png",
  apparelPerformanceCap: "/brand/apparel-performance-cap.png",
  apparelQuarterZip: "/brand/apparel-quarter-zip.png",
} as const;

/** Figma MVP home — two category tiles (Activities / Services). */
export const homeCategoryTiles = [
  {
    key: "activities",
    label: "Activities",
    bg: "#0047ff",
    image: brandAssets.activityBike,
    href: "/member/bookings",
  },
  {
    key: "services",
    label: "Services",
    bg: "#00b3ff",
    image: brandAssets.serviceCleaningSupplies,
    href: "/member/vendors",
  },
] as const;

/** Figma MVP home — featured cards (IronCrest / Club at Iron Lake demo). */
export const homeFeaturedTiles = [
  {
    key: "dining",
    label: "Clubhouse Restaurant",
    sub: "American · Club Dining",
    rating: "4.8",
    price: "$$",
    image: brandAssets.featuredDining,
    href: "/member/dining",
  },
  {
    key: "tennis",
    label: "Tennis",
    sub: "Sports",
    rating: "4.6",
    price: "$",
    image: brandAssets.featuredTennis,
    href: "/member/bookings",
  },
] as const;

/** Heritage Bay home featured row — Cabana, Grille, Aqua Fit, golf. */
export const heritageBayFeaturedTiles = [
  {
    key: "cabana",
    label: "The Cabana",
    sub: "Poolside · Lunch & Happy Hour",
    rating: "4.9",
    price: "$$",
    image: brandAssets.featuredDining,
    href: "/member/dining",
  },
  {
    key: "grille",
    label: "The Grille Room",
    sub: "Dinner · Country Club Casual",
    rating: "4.8",
    price: "$$$",
    image: brandAssets.featuredDining,
    href: "/member/dining",
  },
  {
    key: "aqua",
    label: "Summer Aqua Fit",
    sub: "Mon · Wed · Fri · 10 AM",
    rating: "4.9",
    price: "$10",
    image: brandAssets.heritageBayAquaFit,
    href: "/member/bookings",
  },
  {
    key: "golf",
    label: "27 Holes · Pine · Cypress · Oak",
    sub: "Championship golf",
    rating: "4.8",
    price: "$$",
    image: brandAssets.featuredGolf,
    href: "/member/bookings",
  },
] as const;
/** Default logos by community id (from Figma Super Admin Communities). */
export const communityLogoById: Record<string, string> = {
  "golden-ocala": brandAssets.communityGoldenOcala,
  "heritage-bay": brandAssets.communityHeritageBay,
  "harbor-pointe": brandAssets.communityOceanside,
  "willow-creek": brandAssets.serviceCourt,
  // SVG wordmark — the square PNG has huge padding and looks tiny in nav.
  "iron-lake": brandAssets.communityIroncrestSvg,
};

const reviewerAvatars = [
  brandAssets.avatarReviewerEthan,
  brandAssets.avatarReviewerJake,
  brandAssets.avatarReviewerNishanth,
  brandAssets.avatarReviewerVicky,
] as const;

/**
 * Demo names that must use the female Jake portrait.
 * Hashing alone can assign Ethan/Nishanth/Vicky (all male) to female members.
 */
const FEMALE_AVATAR_KEYS = new Set([
  "sarah",
  "sarah mitchell",
  "sarah.mitchell@oceanside.com",
  "caroline",
  "caroline whitmore",
  "member.golf@theclubatironlake.com",
  "elena",
  "elena vargas",
  "member.social@theclubatironlake.com",
  "sophia",
  "sophia langford",
  "member.equestrian@theclubatironlake.com",
  "natalie",
  "natalie brooks",
  "pm@ironcrest.com",
  "emily",
  "emily chen",
  "emily.chen@oceanside.com",
  "lisa",
  "lisa park",
  "lisa.park@oceanside.com",
  "kelly",
  "kelly anderson",
  "member.demo@golfheritagebay.com",
  "kelly jewart",
  "kellyj@golfheritagebay.com",
  "stephanie",
  "stephanie mcintosh",
  "admin@golfheritagebay.com",
]);

const FEMALE_AVATAR_PREFIXES = [
  "sarah ",
  "caroline ",
  "elena ",
  "sophia ",
  "natalie ",
  "emily ",
  "lisa ",
  "kelly ",
  "stephanie ",
] as const;

/**
 * Demo names that must use a male portrait (never land on Jake via hash).
 */
const MALE_AVATAR_KEYS = new Set([
  "marcus",
  "marcus hale",
  "member.sports@theclubatironlake.com",
  "david",
  "david chen",
  "member.national@theclubatironlake.com",
  "robert",
  "robert keene",
  "board@ironcrest.com",
  "james",
  "james rodriguez",
  "j.rodriguez@oceanside.com",
  "michael",
  "michael thompson",
  "m.thompson@oceanside.com",
]);

const MALE_AVATAR_PREFIXES = [
  "marcus ",
  "david ",
  "robert ",
  "james ",
  "michael ",
] as const;

const MALE_AVATARS = [
  brandAssets.avatarReviewerEthan,
  brandAssets.avatarReviewerNishanth,
  brandAssets.avatarReviewerVicky,
] as const;

/** Figma MVP home — three quick-access tiles. */
export const homeActivityTiles = [
  { key: "cleaning", label: "Cleaning", image: brandAssets.bookingThumbCleaning, href: "/member/vendors" },
  { key: "carpet", label: "Carpet", image: brandAssets.bookingThumbCarpet, href: "/member/local-pros" },
  { key: "activities", label: "Activities", image: brandAssets.activityBike, href: "/member/bookings" },
] as const;

/** Stable reviewer portrait from Figma service-review screens. */
export function avatarForReviewer(memberName: string): string {
  const key = memberName.trim().toLowerCase();
  if (
    FEMALE_AVATAR_KEYS.has(key) ||
    FEMALE_AVATAR_PREFIXES.some((prefix) => key.startsWith(prefix))
  ) {
    return brandAssets.avatarReviewerJake;
  }
  if (
    MALE_AVATAR_KEYS.has(key) ||
    MALE_AVATAR_PREFIXES.some((prefix) => key.startsWith(prefix))
  ) {
    let hash = 0;
    for (let i = 0; i < memberName.length; i++) {
      hash = (hash + memberName.charCodeAt(i)) % MALE_AVATARS.length;
    }
    return MALE_AVATARS[hash] ?? brandAssets.avatarReviewerEthan;
  }
  let hash = 0;
  for (let i = 0; i < memberName.length; i++) {
    hash = (hash + memberName.charCodeAt(i)) % reviewerAvatars.length;
  }
  const picked = reviewerAvatars[hash] ?? brandAssets.avatarReviewerEthan;
  // Never assign the female Jake portrait to an unlisted name that hashed onto it.
  if (picked === brandAssets.avatarReviewerJake) {
    return brandAssets.avatarReviewerEthan;
  }
  return picked;
}

/**
 * Distinct thumbnail per category/name — do not reuse Figma placeholder aliases.
 */
export function imageForProviderCategory(
  category: string,
  type?: string,
  name?: string,
): string {
  const c = category.toLowerCase();
  const n = (name ?? "").toLowerCase();

  // Lawn / landscape work — check before any cleaning defaults.
  if (
    c.includes("garden") ||
    c.includes("landscape") ||
    c.includes("lawn") ||
    c.includes("grounds") ||
    n.includes("greenscape") ||
    n.includes("iron crest") ||
    n.includes("oak canopy") ||
    n.includes("hedge") ||
    n.includes("brush") ||
    n.includes("mulch") ||
    n.includes("mow") ||
    n.includes("debris") ||
    n.includes("edging") ||
    n.includes("forestry") ||
    n.includes("landscap") ||
    (n.includes("trim") && !n.includes("hair"))
  ) {
    if (n.includes("edging") || n.includes("line trim")) return brandAssets.serviceLawnEdging;
    if (n.includes("hedge")) return brandAssets.serviceLawnHedge;
    if (n.includes("brush")) return brandAssets.serviceLawnBrush;
    if (n.includes("forestry") || n.includes("mulch")) return brandAssets.serviceLawnMulching;
    if (n.includes("debris") || n.includes("storm")) return brandAssets.serviceLawnDebris;
    return brandAssets.serviceLandscaping;
  }

  if (n.includes("cassie") || c.includes("clean")) return brandAssets.serviceCleaningSupplies;
  if (c.includes("carpet") || n.includes("carpet")) return brandAssets.serviceCarpet;
  if (c.includes("paint")) return brandAssets.servicePainting;
  if (c.includes("pool") || c.includes("swim") || n.includes("pool") || n.includes("swim") || n.includes("aquafit") || n.includes("aqua")) {
    return brandAssets.servicePool;
  }
  if (c.includes("hvac") || c.includes("air") || n.includes("hvac") || n.includes("climate")) {
    // No dedicated HVAC photo yet — use clubhouse mechanical/utility feel, never painting.
    return brandAssets.amenityClubhouse;
  }
  if (c.includes("pickleball") || n.includes("pickleball") || n.includes("pickle")) {
    return brandAssets.amenityPickleball;
  }
  if (c.includes("tennis") || (c.includes("court") && !n.includes("pickle"))) {
    return brandAssets.serviceCourt;
  }
  if (c.includes("golf") || n.includes("golf") || n.includes("tee")) {
    return brandAssets.serviceGolf;
  }
  if (c.includes("yoga") || n.includes("yoga")) {
    return brandAssets.serviceYoga;
  }
  if (c.includes("wellness") || n.includes("wellness") || n.includes("spa")) {
    return brandAssets.amenitySpa;
  }
  if (n.includes("sunset") && !n.includes("golf") && !n.includes("tee")) {
    return brandAssets.serviceYoga;
  }
  if (c.includes("sport")) {
    return brandAssets.serviceCourt;
  }
  if (c.includes("fitness") || n.includes("fit")) return brandAssets.serviceFitness;
  if (n.includes("bike") || n.includes("cycling")) return brandAssets.activityBike;
  if (type === "activity") return brandAssets.activityBike;
  if (c.includes("food") || c.includes("dining") || c.includes("restaurant")) {
    return brandAssets.foodIceCream;
  }
  // Neutral clubhouse — never default lawn/outdoor work to a kitchen cleaning shot.
  return brandAssets.amenityClubhouse;
}

/** Marketplace card fallback when a listing has no uploaded imageUrl. */
export function imageForMarketplaceListing(title: string, category: string): string {
  const t = title.toLowerCase();
  if (t.includes("peloton") || t.includes("spin bike") || t.includes("exercise bike")) {
    return brandAssets.marketplacePeloton;
  }
  if (t.includes("patio") && (t.includes("dining") || t.includes("chair") || t.includes("table"))) {
    return brandAssets.marketplacePatioSet;
  }
  if (
    t.includes("pro v1") ||
    t.includes("golf ball") ||
    (t.includes("titleist") && (t.includes("dozen") || t.includes("ball")))
  ) {
    return brandAssets.marketplaceGolfBalls;
  }
  if (t.includes("racquet") || t.includes("racket")) {
    return brandAssets.marketplaceKidsRacquet;
  }
  if (t.includes("golf")) return brandAssets.serviceGolf;
  if (t.includes("bike") || t.includes("bicycle") || t.includes("cycling")) {
    return brandAssets.activityBike;
  }
  return imageForProviderCategory(category, undefined, title);
}

/** Prefer product cover for known listings; never keep amenity/course fallbacks. */
export function resolveMarketplaceListingImage(
  title: string,
  category: string,
  imageUrl?: string | null,
): string {
  const productCover = imageForMarketplaceListing(title, category);
  const t = title.toLowerCase();
  const isKnownProduct =
    t.includes("pro v1") ||
    t.includes("golf ball") ||
    (t.includes("titleist") && (t.includes("dozen") || t.includes("ball"))) ||
    t.includes("racquet") ||
    t.includes("racket") ||
    t.includes("peloton") ||
    (t.includes("patio") && (t.includes("dining") || t.includes("set")));

  if (isKnownProduct) {
    // Always show the product photo for seeded catalog items, even if an older
    // deploy stored a course/court amenity URL on the listing row.
    if (
      productCover === brandAssets.marketplaceGolfBalls ||
      productCover === brandAssets.marketplaceKidsRacquet ||
      productCover === brandAssets.marketplacePeloton ||
      productCover === brandAssets.marketplacePatioSet
    ) {
      return productCover;
    }
  }

  const uploaded = imageUrl?.trim();
  if (uploaded && isMarketplaceProductCover(uploaded)) return uploaded;
  if (uploaded && !looksLikeAmenityFallback(uploaded)) return uploaded;
  return productCover;
}

function looksLikeAmenityFallback(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("/brand/service-") ||
    u.includes("/brand/amenity-") ||
    u.includes("/brand/featured-") ||
    u.includes("community-ironcrest") ||
    u.includes("service-yoga") ||
    u.includes("service-golf") ||
    u.includes("amenity-tennis") ||
    u.includes("amenity-pickle")
  );
}

/** True when the cover is a seeded product photo (not a generic category fallback). */
export function isMarketplaceProductCover(coverUrl: string): boolean {
  const productCovers = new Set<string>([
    brandAssets.marketplacePeloton,
    brandAssets.marketplacePatioSet,
    brandAssets.marketplaceGolfBalls,
    brandAssets.marketplaceKidsRacquet,
  ]);
  return productCovers.has(coverUrl);
}

/** Tournament list thumbnails by sport. */
export function imageForTournament(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("golf")) return brandAssets.serviceGolf;
  if (s.includes("pickle")) return brandAssets.amenityPickleball;
  if (s.includes("swim") || s.includes("pool")) return brandAssets.servicePool;
  if (s.includes("yoga") || s.includes("wellness") || s.includes("spa")) {
    return brandAssets.amenitySpa;
  }
  if (s.includes("fitness") || s.includes("gym")) return brandAssets.amenityFitness;
  if (s.includes("tennis")) return brandAssets.amenityTennisClay;
  return brandAssets.serviceCourt;
}

/** Court / facility picker thumbnails — match picture to facility purpose. */
export function imageForAmenity(kind: string, name?: string): string {
  const k = kind.toLowerCase();
  const n = (name ?? "").toLowerCase();

  if (n.includes("summer aqua fit")) return brandAssets.heritageBayAquaFit;
  if (n.includes("pickle")) return brandAssets.amenityPickleball;
  if (
    n.includes("tennis") ||
    n.includes("har-tru") ||
    /^court\s*\d+$/i.test(n) ||
    (k.includes("court") && n.includes("clay")) ||
    (k.includes("court") && n.includes("tennis"))
  ) {
    return brandAssets.amenityTennisClay;
  }
  if (k.includes("court") && !n.includes("pickle")) {
    // Generic courts → hard/clay tennis look
    return brandAssets.amenityTennisClay;
  }

  if (n.includes("driving range") || n.includes("putting") || k.includes("driving_range")) {
    return brandAssets.amenityDrivingRange;
  }
  if (k.includes("golf") || n.includes("golf") || n.includes("tee")) {
    return brandAssets.serviceGolf;
  }

  if (n.includes("ev") || n.includes("charg")) return brandAssets.amenityEvCharging;
  if (n.includes("locker")) return brandAssets.amenityLockerRoom;
  if (k.includes("spa") || n.includes("spa") || n.includes("wellness")) {
    return brandAssets.amenitySpa;
  }
  if (
    n.includes("cycling") ||
    n.includes("spin") ||
    (n.includes("bike") && !n.includes("peloton"))
  ) {
    return brandAssets.activityBike;
  }
  if (
    k.includes("fitness_class") ||
    n.includes("zumba") ||
    n.includes("pilates") ||
    n.includes("yoga") ||
    n.includes("barre") ||
    n.includes("water aerobic") ||
    n.includes("aqua")
  ) {
    if (n.includes("water") || n.includes("aqua")) return brandAssets.servicePool;
    return brandAssets.serviceYoga;
  }
  if (n.includes("strength") || n.includes("circuit") || n.includes("hiit")) {
    return brandAssets.serviceFitness;
  }
  if (k.includes("gym") || n.includes("fitness") || n.includes("gym")) {
    return brandAssets.amenityFitness;
  }
  if (k.includes("clubhouse") || n.includes("clubhouse")) {
    return brandAssets.amenityClubhouse;
  }
  if (n.includes("pool") || n.includes("swim") || k.includes("pool")) {
    return brandAssets.servicePool;
  }
  if (k.includes("restaurant") || n.includes("restaurant") || n.includes("dining")) {
    return brandAssets.featuredDining;
  }
  if (k.includes("store") || n.includes("pro shop") || n.includes("shop")) {
    return brandAssets.amenityProShop;
  }
  if (k.includes("lodging") || n.includes("suite") || n.includes("bedroom") || n.includes("sky suite")) {
    return brandAssets.amenityLodging;
  }
  if (k.includes("event") || n.includes("event space")) {
    return brandAssets.amenityEventSpace;
  }
  if (k.includes("yoga") || n.includes("yoga")) return brandAssets.serviceYoga;

  return brandAssets.amenityClubhouse;
}

/** Member home / booking row thumbnails from Figma MVP home. */
export function imageForBookingRow(amenityOrService: string): string {
  const label = amenityOrService.toLowerCase().trim();
  if (label.includes("carpet")) return brandAssets.bookingThumbCarpet;
  if (label.includes("clean")) return brandAssets.bookingThumbCleaning;
  if (/^court\s*\d+$/i.test(label) || /^court\s*#?\s*\d+$/i.test(label)) {
    return brandAssets.amenityTennisClay;
  }
  if (label.includes("pickle")) return brandAssets.amenityPickleball;
  if (label.includes("tennis") || label.includes("har-tru") || label.includes("racquet")) {
    return brandAssets.amenityTennisClay;
  }
  if (
    label.includes("cycling") ||
    label.includes("spin") ||
    label.includes("bike")
  ) {
    return brandAssets.activityBike;
  }
  if (
    label.includes("zumba") ||
    label.includes("pilates") ||
    label.includes("yoga") ||
    label.includes("barre")
  ) {
    return brandAssets.serviceYoga;
  }
  if (label.includes("water aerobic") || label.includes("aqua")) {
    return brandAssets.servicePool;
  }
  if (label.includes("strength") || label.includes("circuit") || label.includes("hiit")) {
    return brandAssets.serviceFitness;
  }
  // Prefer amenity-specific photos when the row is a club facility
  return imageForAmenity("", amenityOrService);
}

/**
 * Dish-specific photos checked in order — more specific patterns must come
 * before generic ones (e.g. "tuna nachos" before "nachos").
 */
const FOOD_PHOTO_RULES: Array<[patterns: string[], image: string]> = [
  [["tuna nachos"], "/brand/food/food-tuna-nachos.png"],
  [["nachos"], "/brand/food/food-nachos.png"],
  [["chili"], "/brand/food/food-chili.png"],
  [["wings"], "/brand/food/food-wings.png"],
  [["coconut shrimp"], "/brand/food/food-coconut-shrimp.png"],
  [["calamari"], "/brand/food/food-calamari.png"],
  [["quesadilla"], "/brand/food/food-quesadilla.png"],
  [["fried green tomato"], "/brand/food/food-fried-green-tomatoes.png"],
  [["slider"], "/brand/food/food-sliders.png"],
  [["cauliflower"], "/brand/food/food-cauliflower.png"],
  [["bao"], "/brand/food/food-bao-buns.png"],
  [["wedge salad", "wedge"], "/brand/food/food-wedge-salad.png"],
  [["garden salad"], "/brand/food/food-garden-salad.png"],
  [["strawberry"], "/brand/food/food-strawberry-salad.png"],
  [["oriental chicken", "asian chicken", "chicken salad"], "/brand/food/food-asian-chicken-salad.png"],
  [["club sandwich"], "/brand/food/food-club-sandwich.png"],
  [["korean chicken"], "/brand/food/food-korean-chicken.png"],
  [["grouper sandwich"], "/brand/food/food-grouper-sandwich.png"],
  [["grouper"], "/brand/food/food-crusted-grouper.png"],
  [["hibachi"], "/brand/food/food-hibachi-bowl.png"],
  [["poke"], "/brand/food/food-poke-bowl.png"],
  [["cheesecake"], "/brand/food/food-cheesecake.png"],
  [["pizza"], "/brand/food/food-cheese-pizza.png"],
  [["flatbread"], "/brand/food/food-flatbread.png"],
  [["short rib"], "/brand/food/food-short-ribs.png"],
  [["salmon"], "/brand/food/food-salmon.png"],
  [["steak frites"], "/brand/food/food-steak-frites.png"],
  [["filet"], "/brand/food/food-filet.png"],
  [["gnocchi"], "/brand/food/food-gnocchi.png"],
  [["marsala"], "/brand/food/food-chicken-marsala.png"],
  [["pork chop"], "/brand/food/food-pork-chop.png"],
  [["lamb"], "/brand/food/food-lamb-chops.png"],
  [["cioppino"], "/brand/food/food-cioppino.png"],
  [["panna cotta"], "/brand/food/food-panna-cotta.png"],
  [["lava cake", "lava"], "/brand/food/food-lava-cake.png"],
  [["key lime"], "/brand/food/food-key-lime.png"],
  [["brownie"], "/brand/food/food-brownie-sundae.png"],
];

export function imageForFoodItem(name: string, category?: string): string {
  const label = `${name} ${category ?? ""}`.toLowerCase();
  if (
    label.includes("aromas") ||
    label.includes("peru") ||
    label.includes("fine dining") ||
    label.includes("clubhouse restaurant") ||
    label.includes("club dining")
  ) {
    return brandAssets.featuredDining;
  }
  for (const [patterns, image] of FOOD_PHOTO_RULES) {
    if (patterns.some((p) => label.includes(p))) return image;
  }
  if (label.includes("burger") || label.includes("quarry burger")) {
    return brandAssets.foodQuarryBurger;
  }
  if (label.includes("soup") || label.includes("bisque") || label.includes("chowder")) {
    return brandAssets.foodHouseSoup;
  }
  if (label.includes("caesar") || (label.includes("salad") && !label.includes("fruit"))) {
    return brandAssets.foodCaesarSalad;
  }
  if (
    label.includes("catch of the day") ||
    label.includes("catch of day") ||
    label.includes("fish") ||
    label.includes("salmon") ||
    label.includes("seafood")
  ) {
    return brandAssets.foodCatchOfDay;
  }
  if (
    label.includes("iced tea") ||
    label.includes("ice tea") ||
    (label.includes("tea") && label.includes("beverage"))
  ) {
    return brandAssets.foodIcedTea;
  }
  if (label.includes("tennis") || label.includes("sport")) {
    return brandAssets.featuredTennis;
  }
  // Ice cream / dessert only — do not match "iced tea"
  if (
    label.includes("ice cream") ||
    label.includes("gelato") ||
    label.includes("dessert") ||
    label.includes("ceviche")
  ) {
    return brandAssets.foodIceCream;
  }
  if (label.includes("entree") || label.includes("entrée")) {
    return brandAssets.foodCatchOfDay;
  }
  if (label.includes("beverage") || label.includes("drink")) {
    return brandAssets.foodIcedTea;
  }
  return brandAssets.featuredDining;
}

/** Calendar event list thumbnails by category/title. */
export function imageForEvent(category: string, title?: string): string {
  const c = category.toLowerCase();
  const t = (title ?? "").toLowerCase();
  const label = `${c} ${t}`;

  if (label.includes("summer aqua fit")) return brandAssets.heritageBayAquaFit;
  // Amenity bookings land on the calendar with category "booking" and the
  // facility name as title — route through amenity matching, never yoga.
  if (c === "booking" || c.includes("booking")) {
    return imageForBookingRow(title ?? "");
  }

  if (label.includes("pickle")) return brandAssets.amenityPickleball;
  if (
    label.includes("golf") ||
    label.includes("tee") ||
    label.includes("driving range") ||
    label.includes("putting")
  ) {
    return brandAssets.serviceGolf;
  }
  if (label.includes("tennis") || label.includes("clay")) {
    return brandAssets.amenityTennisClay;
  }
  if (label.includes("court") || label.includes("sport") || label.includes("tournament")) {
    return brandAssets.serviceCourt;
  }
  if (label.includes("board") || label.includes("meeting") || label.includes("hoa")) {
    return brandAssets.communityOceanside;
  }
  if (label.includes("social") || label.includes("party") || label.includes("dining")) {
    return brandAssets.foodIceCream;
  }
  if (label.includes("maintenance") || label.includes("repair")) {
    return brandAssets.servicePainting;
  }
  if (label.includes("pool") || label.includes("swim") || label.includes("aqua")) {
    return brandAssets.servicePool;
  }
  if (label.includes("fitness") || label.includes("gym")) {
    return brandAssets.amenityFitness;
  }
  if (label.includes("spa")) return brandAssets.amenitySpa;
  // Wellness without spa → fitness/spa facility, never the yoga silhouette.
  if (label.includes("wellness")) return brandAssets.amenitySpa;
  if (label.includes("yoga")) {
    return brandAssets.serviceYoga;
  }

  // Title may still be a facility name (e.g. community event at a court)
  if (title?.trim()) {
    return imageForAmenity("", title);
  }
  return brandAssets.amenityClubhouse;
}

/** Header avatar — Figma provider portrait when no user photo uploaded. */
export function defaultAvatarForRole(
  role: string,
  avatarUrl?: string | null,
  name?: string | null,
  email?: string | null,
): string | undefined {
  if (avatarUrl) return avatarUrl;
  if (role === "provider") {
    const key = `${name ?? ""} ${email ?? ""}`.trim().toLowerCase();
    if (
      key.includes("lawn@ironcrest") ||
      key.includes("iron crest") ||
      key.includes("oak canopy") ||
      key.includes("lawn") ||
      key.includes("landscape") ||
      key.includes("greenscape")
    ) {
      return brandAssets.serviceLandscaping;
    }
    if (
      key.includes("dining@") ||
      key.includes("clubhouse dining") ||
      key.includes("restaurant")
    ) {
      return brandAssets.featuredDining;
    }
    return brandAssets.providerAvatar;
  }
  if (role === "member" || role === "board" || role === "pm" || role === "admin") {
    if (name) return avatarForReviewer(name);
    return brandAssets.memberAvatar;
  }
  return undefined;
}

/** Community identity mark. The RLR crest is returned only for `golden-ocala`. */
export function logoForCommunity(id: string, logoUrl?: string | null): string {
  const mapped = communityLogoById[id];
  if (id === "golden-ocala") {
    return mapped ?? brandAssets.communityGoldenOcala;
  }
  // Prefer the tight SVG wordmark over the padded square PNG for IronCrest.
  if (id === "iron-lake") {
    return brandAssets.communityIroncrestSvg;
  }
  // Never serve Golden Ocala / RLR crest (or the mislabeled wordmark file) for other clubs.
  if (
    logoUrl &&
    logoUrl !== brandAssets.communityGoldenOcala &&
    !logoUrl.includes("community-golden-ocala") &&
    !logoUrl.includes("logo-wordmark")
  ) {
    return logoUrl;
  }
  return mapped ?? brandAssets.communityOceanside;
}

/** Figma hero image per member portal section. */
export type MemberSection =
  | "home"
  | "favorites"
  | "announcements"
  | "bookings"
  | "dining"
  | "calendar"
  | "tournaments"
  | "apparel"
  | "rentals"
  | "groups"
  | "messages"
  | "directory"
  | "vendors"
  | "local-pros"
  | "documents"
  | "payments"
  | "rewards"
  | "service-requests"
  | "marketplace"
  | "blog"
  | "newsletter"
  | "gallery"
  | "properties"
  | "real-estate"
  | "contact"
  | "profile";

export function heroForMemberSection(section: MemberSection): string {
  switch (section) {
    case "home":
      return brandAssets.onboardingHero;
    case "favorites":
    case "directory":
    case "gallery":
      return brandAssets.communityOceanside;
    case "announcements":
    case "groups":
    case "payments":
    case "real-estate":
      return brandAssets.communityOceanside;
    case "bookings":
      return brandAssets.bookingThumbCleaning;
    case "dining":
    case "rewards":
      return brandAssets.foodIceCream;
    case "calendar":
      return brandAssets.serviceGolf;
    case "tournaments":
      return brandAssets.serviceCourt;
    case "rentals":
      return brandAssets.activityBike;
    case "local-pros":
    case "properties":
      return brandAssets.serviceLandscaping;
    case "documents":
      return brandAssets.servicePainting;
    case "service-requests":
      return brandAssets.serviceCleaningSupplies;
    case "marketplace":
      return brandAssets.bookingThumbCarpet;
    case "contact":
      return brandAssets.loginPhoto;
    case "profile":
      return brandAssets.onboardingHero;
    case "messages":
    case "apparel":
    case "vendors":
    case "blog":
    case "newsletter":
      return brandAssets.serviceHero;
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}
