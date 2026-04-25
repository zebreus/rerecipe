import type { Ingredient } from "./types";

export interface CommonIngredient {
  name: string;
  category: string;
  density_g_ml: number;
  // Per-100g nutritional values, keyed by name. Uses the same nutrient
  // names as the German Nährwertangaben defaults so they line up with the
  // target product's tracked nutrition.
  nutrition: Record<string, number>;
  costPerKg: number;
}

export const COMMON_INGREDIENTS: CommonIngredient[] = [
  {
    name: "Water",
    category: "Water",
    density_g_ml: 1.0,
    nutrition: {
      Energy: 0,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 0,
      Sugar: 0,
      Protein: 0,
      Fibre: 0,
      Salt: 0,
    },
    costPerKg: 0,
  },
  {
    name: "Flour (All-Purpose)",
    category: "Grain",
    density_g_ml: 0.59,
    nutrition: {
      Energy: 364,
      Fat: 1.2,
      "Saturated Fat": 0.2,
      Carbohydrates: 76.3,
      Sugar: 0.3,
      Protein: 10.3,
      Fibre: 2.7,
      Salt: 0,
    },
    costPerKg: 1.5,
  },
  {
    name: "Butter",
    category: "Fat & Oil",
    density_g_ml: 0.91,
    nutrition: {
      Energy: 717,
      Fat: 81.1,
      "Saturated Fat": 51.4,
      Carbohydrates: 0.1,
      Sugar: 0.1,
      Protein: 0.9,
      Fibre: 0,
      Salt: 0.03,
    },
    costPerKg: 8.0,
  },
  {
    name: "Eggs (Whole)",
    category: "Protein",
    density_g_ml: 1.03,
    nutrition: {
      Energy: 143,
      Fat: 9.5,
      "Saturated Fat": 3.1,
      Carbohydrates: 0.7,
      Sugar: 0.7,
      Protein: 12.6,
      Fibre: 0,
      Salt: 0.36,
    },
    costPerKg: 4.0,
  },
  {
    name: "Olive Oil",
    category: "Fat & Oil",
    density_g_ml: 0.92,
    nutrition: {
      Energy: 884,
      Fat: 100,
      "Saturated Fat": 13.8,
      Carbohydrates: 0,
      Sugar: 0,
      Protein: 0,
      Fibre: 0,
      Salt: 0,
    },
    costPerKg: 10.0,
  },
  {
    name: "Whole Milk",
    category: "Dairy",
    density_g_ml: 1.03,
    nutrition: {
      Energy: 61,
      Fat: 3.3,
      "Saturated Fat": 1.9,
      Carbohydrates: 4.8,
      Sugar: 5.1,
      Protein: 3.2,
      Fibre: 0,
      Salt: 0.1,
    },
    costPerKg: 1.2,
  },
  {
    name: "Granulated Sugar",
    category: "Sugar & Sweetener",
    density_g_ml: 0.85,
    nutrition: {
      Energy: 387,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 99.9,
      Sugar: 99.9,
      Protein: 0,
      Fibre: 0,
      Salt: 0,
    },
    costPerKg: 1.0,
  },
  {
    name: "Salt",
    category: "Salt",
    density_g_ml: 1.2,
    nutrition: {
      Energy: 0,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 0,
      Sugar: 0,
      Protein: 0,
      Fibre: 0,
      Salt: 99.8,
    },
    costPerKg: 0.5,
  },
  {
    name: "Cocoa Powder",
    category: "Flavor",
    density_g_ml: 0.64,
    nutrition: {
      Energy: 228,
      Fat: 13.7,
      "Saturated Fat": 8.1,
      Carbohydrates: 12.8,
      Sugar: 1.8,
      Protein: 19.6,
      Fibre: 33.2,
      Salt: 0.05,
    },
    costPerKg: 12.0,
  },
  {
    name: "Cream Cheese",
    category: "Dairy",
    density_g_ml: 1.05,
    nutrition: {
      Energy: 342,
      Fat: 34.4,
      "Saturated Fat": 19.5,
      Carbohydrates: 3.2,
      Sugar: 3.2,
      Protein: 5.9,
      Fibre: 0,
      Salt: 0.78,
    },
    costPerKg: 9.0,
  },
  {
    name: "Honey",
    category: "Sugar & Sweetener",
    density_g_ml: 1.42,
    nutrition: {
      Energy: 304,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 82.4,
      Sugar: 82.1,
      Protein: 0.3,
      Fibre: 0.2,
      Salt: 0.01,
    },
    costPerKg: 15.0,
  },
  {
    name: "Cornstarch",
    category: "Starch",
    density_g_ml: 0.56,
    nutrition: {
      Energy: 381,
      Fat: 0.1,
      "Saturated Fat": 0,
      Carbohydrates: 91,
      Sugar: 0,
      Protein: 0.3,
      Fibre: 0.9,
      Salt: 0.02,
    },
    costPerKg: 3.0,
  },
  {
    name: "Baking Powder",
    category: "Other",
    density_g_ml: 0.9,
    nutrition: {
      Energy: 53,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 28,
      Sugar: 0,
      Protein: 0,
      Fibre: 0.2,
      Salt: 26,
    },
    costPerKg: 6.0,
  },
  {
    name: "Garlic",
    category: "Flavor",
    density_g_ml: 1.05,
    nutrition: {
      Energy: 149,
      Fat: 0.5,
      "Saturated Fat": 0.1,
      Carbohydrates: 33,
      Sugar: 1,
      Protein: 6.4,
      Fibre: 2.1,
      Salt: 0.04,
    },
    costPerKg: 8.0,
  },
  {
    name: "Onion",
    category: "Flavor",
    density_g_ml: 0.96,
    nutrition: {
      Energy: 40,
      Fat: 0.1,
      "Saturated Fat": 0,
      Carbohydrates: 9.3,
      Sugar: 4.2,
      Protein: 1.1,
      Fibre: 1.7,
      Salt: 0.01,
    },
    costPerKg: 2.0,
  },
];

/** Returns true if `ing` exactly matches a COMMON_INGREDIENTS entry (unmodified quick-add). */
export function isUnmodifiedCommonIngredient(ing: {
  name: string;
  category: string;
  density_g_ml: number;
  nutrition: Record<string, number>;
  costPerKg: number;
}): boolean {
  const match = COMMON_INGREDIENTS.find(
    (c) => c.name.toLowerCase() === ing.name.toLowerCase()
  );
  if (!match) return false;
  if (match.category !== ing.category) return false;
  if (match.density_g_ml !== ing.density_g_ml) return false;
  if (match.costPerKg !== ing.costPerKg) return false;
  const matchKeys = Object.keys(match.nutrition);
  // Only compare the preset's own keys. Extra keys on the ingredient are
  // acceptable if they were added by the target editor and hold their zero
  // default — that doesn't count as the user having modified the ingredient.
  for (const key of matchKeys) {
    if (match.nutrition[key] !== (ing.nutrition?.[key] ?? 0)) return false;
  }
  return true;
}

/** Build a fresh Ingredient.nutrition record from a quick-add preset. */
export function presetNutrition(item: CommonIngredient): Record<string, number> {
  return { ...item.nutrition };
}

/** Fresh, blank ingredient nutrition record matching the given names. */
export function emptyNutrition(names: string[]): Ingredient["nutrition"] {
  const nutrition: Record<string, number> = {};
  for (const name of names) nutrition[name] = 0;
  return nutrition;
}
