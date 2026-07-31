import { brandAssets } from "@/lib/brand-assets";
import { providerProfile } from "@/lib/provider-data";

export interface FigmaServiceOffering {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  image: string;
}

export interface FigmaServiceDetail {
  heroImage: string;
  businessName: string;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  statusLabel: string;
  about: string;
  address: string;
  hours: string;
  offerings: FigmaServiceOffering[];
  sampleReview?: { author: string; rating: number; text: string };
}

const CASSIE_ABOUT =
  "Cassie's Meticulous Touch is family owned and operated and has been in business in the Ocala Florida area since 2000. We are licensed and fully insured and bonded with 5 million in coverage. We are a member of the Chamber of Commence and are active in the surrounding communities. We are proud to provide professional cleaning services in Ocala FL, Gainesville FL, The Villages FL, Orlando FL, and the surrounding areas!";

export const CASSIE_OFFERINGS: FigmaServiceOffering[] = [
  {
    id: "full-house",
    name: "Full House Cleaning",
    description: "Includes a deep clean of your entire house up to 5000sqft",
    priceLabel: "$250",
    image: brandAssets.bookingThumbCleaning,
  },
  {
    id: "carpet",
    name: "Carpet Cleaning",
    description: "Includes entire house carpet cleaning up to 5000sqft",
    priceLabel: "Est",
    image: brandAssets.bookingThumbCarpet,
  },
];

/** Figma MVP Service Details (node 4616:17631) — map vendor to detail content. */
export function figmaServiceDetailForVendor(vendor: {
  name: string;
  category: string;
  rating?: number | null;
}): FigmaServiceDetail {
  const isCassie = vendor.name.toLowerCase().includes("cassie");

  if (isCassie) {
    return {
      heroImage: brandAssets.serviceDetailsHero,
      businessName: providerProfile.businessName,
      categoryLabel: "Home Cleaning",
      rating: vendor.rating ?? 4.6,
      reviewCount: 1,
      statusLabel: "Open",
      about: CASSIE_ABOUT,
      address: providerProfile.address,
      hours: "Mon–Sat 8AM–6PM",
      offerings: CASSIE_OFFERINGS,
      sampleReview: {
        author: "Grant",
        rating: 4,
        text: "Cassie was great! Her crew was able to clean up my house for the Fourth of July celebration. I would highly recommend her to everyone.",
      },
    };
  }

  return {
    heroImage: brandAssets.serviceHero,
    businessName: vendor.name,
    categoryLabel: vendor.category,
    rating: vendor.rating ?? 4.5,
    reviewCount: 0,
    statusLabel: "Open",
    about: `${vendor.name} provides ${vendor.category.toLowerCase()} services for your community.`,
    address: "On-site · club community",
    hours: "Hours available on request",
    offerings: [
      {
        id: "standard",
        name: vendor.category,
        description: `Professional ${vendor.category.toLowerCase()} for residents.`,
        priceLabel: "Est",
        image: brandAssets.serviceCleaningSupplies,
      },
    ],
  };
}

/** Figma activity / amenity detail (Access Aromas-style). */
export function figmaDetailForAmenity(amenity: {
  name: string;
  description: string;
  fee: number;
  schedule: string;
  kind: string;
  partnerName?: string | null;
  playable: boolean;
  surface?: string | null;
  holes?: number | null;
}): FigmaServiceDetail {
  const kindLabel =
    amenity.kind === "court"
      ? "Tennis"
      : amenity.kind === "pickleball"
        ? "Pickleball"
        : amenity.kind === "golf_course"
          ? "Golf"
          : amenity.kind === "spa"
            ? "Spa"
            : "Activity";

  return {
    heroImage: brandAssets.activityBike,
    businessName: amenity.name,
    categoryLabel: amenity.partnerName
      ? `${kindLabel} · ${amenity.partnerName}`
      : kindLabel,
    rating: 4.7,
    reviewCount: 12,
    statusLabel: amenity.playable ? "Open" : "Unavailable",
    about:
      amenity.description?.trim() ||
      `Book ${amenity.name} through the club — invite friends, pick your time, and manage your reservation from Calendar.`,
    address: amenity.partnerName || "Club amenities",
    hours: amenity.schedule || "See club hours",
    offerings: [
      {
        id: "book",
        name: `Reserve ${amenity.name}`,
        description: [
          amenity.surface ? `Surface: ${amenity.surface}` : null,
          amenity.holes ? `${amenity.holes} holes` : null,
          amenity.fee > 0 ? `Member fee from $${amenity.fee}` : "Included with membership",
        ]
          .filter(Boolean)
          .join(" · ") || "Reserve a time slot and invite members.",
        priceLabel: amenity.fee > 0 ? `$${amenity.fee}` : "Free",
        image: brandAssets.amenityClubhouse,
      },
    ],
    sampleReview: {
      author: "Jamie",
      rating: 5,
      text: "Easy to book and invite friends — showed up on my calendar right away.",
    },
  };
}
