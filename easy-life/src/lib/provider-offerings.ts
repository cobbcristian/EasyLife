export interface ProviderServiceOffering {
  id: string;
  name: string;
  price: number;
  category: string;
  duration?: string;
}

/** Resident-bookable cleaning packages (Cassie's Meticulous Touch / Figma). */
/** Resident-bookable lawn & landscape packages (Iron Crest Lawn & Landscape). */
export const LAWN_SERVICE_CATALOG: ProviderServiceOffering[] = [
  {
    id: "lawn-mowing",
    name: "Weekly Lawn Mowing",
    price: 65,
    category: "Lawn Care",
    duration: "per visit",
  },
  {
    id: "lawn-hedge",
    name: "Hedge Trimming",
    price: 140,
    category: "Landscaping",
    duration: "2–3 hrs",
  },
  {
    id: "lawn-brush",
    name: "Brush Removal",
    price: 225,
    category: "Landscaping",
    duration: "half day",
  },
  {
    id: "lawn-mulch",
    name: "Forestry Mulching",
    price: 450,
    category: "Landscaping",
    duration: "per acre",
  },
  {
    id: "lawn-debris",
    name: "Debris Pick Up",
    price: 95,
    category: "Lawn Care",
    duration: "per load",
  },
  {
    id: "lawn-edging",
    name: "Edging & Line Trimming",
    price: 75,
    category: "Lawn Care",
    duration: "per visit",
  },
];

export const CLEANING_SERVICE_CATALOG: ProviderServiceOffering[] = [
  {
    id: "clean-full-house",
    name: "Full House Cleaning",
    price: 250,
    category: "Cleaning",
    duration: "up to 5000sqft",
  },
  {
    id: "clean-carpet",
    name: "Carpet Cleaning",
    price: 150,
    category: "Cleaning",
    duration: "up to 5000sqft",
  },
  { id: "clean-standard", name: "Standard Cleaning", price: 90, category: "Cleaning", duration: "2 hrs" },
  { id: "clean-deep", name: "Deep Cleaning", price: 120, category: "Cleaning", duration: "3 hrs" },
  { id: "clean-moveout", name: "Move-out Cleaning", price: 200, category: "Cleaning", duration: "4 hrs" },
];

function isLawnOrLandscapeCategory(category: string): boolean {
  const cat = category.toLowerCase();
  return (
    cat.includes("lawn") ||
    cat.includes("landscape") ||
    cat.includes("garden") ||
    cat.includes("grounds")
  );
}

export function serviceCatalogForProvider(provider: {
  category: string;
  type: string;
}): ProviderServiceOffering[] {
  const cat = provider.category.toLowerCase();
  if (cat === "cleaning") {
    return CLEANING_SERVICE_CATALOG;
  }
  if (isLawnOrLandscapeCategory(cat)) {
    return LAWN_SERVICE_CATALOG;
  }
  return [];
}

export function usesMenuAsPrimaryCatalog(provider: { category: string; type: string }): boolean {
  const cat = provider.category.toLowerCase();
  if (cat === "cleaning" || isLawnOrLandscapeCategory(cat)) {
    return false;
  }
  return cat === "dining" || cat === "food" || cat === "restaurant";
}
