import {
  type ProjectData,
  type Ingredient,
  EMPTY_COMPOSITION,
} from "./types";
import {
  calculateFormulaComponents,
  calculateMassBalance,
  componentsToPercent,
  compositionSimilarity,
} from "./solver";

const now = () => new Date().toISOString();

// ─── Default Project Data ───
export function createDefaultProjectData(): ProjectData {
  return {
    project: {
      id: "single-project",
      name: "Recipe Reverse Engineering",
      createdAt: now(),
      updatedAt: now(),
    },
    targetProduct: {
      name: "",
      description: "",
      targetMassG: 200,
      targetVolumeMl: 0,
      observedAttributes: {
        texture: [],
        flavor: [],
        color: [],
        packaging: [],
      },
      targetComposition: { ...EMPTY_COMPOSITION },
    },
    ingredients: [],
    formulas: [],
    protocols: [],
    trials: [],
    scoringProfiles: [
      {
        id: "default",
        name: "Default Scoring",
        dimensions: [
          { name: "Viscosity", weight: 0.15 },
          { name: "Spoonability", weight: 0.1 },
          { name: "Grain Softness", weight: 0.1 },
          { name: "Creaminess", weight: 0.15 },
          { name: "Phase Separation", weight: 0.1 },
          { name: "Sweetness Balance", weight: 0.1 },
          { name: "Aroma Match", weight: 0.1 },
          { name: "Aftertaste", weight: 0.1 },
          { name: "Appearance", weight: 0.1 },
        ],
      },
    ],
    attachments: [],
    notes: [],
  };
}

// ─── Seed Data for Demo ───
export function createSeedData(): ProjectData {
  const data = createDefaultProjectData();

  data.project.name = "Müller Clone Reverse Engineering";

  data.targetProduct = {
    name: "Müller Rice – Original",
    description:
      "Creamy rice pudding dessert. Thick, spoonable texture with soft rice grains in a smooth, sweet dairy base.",
    targetMassG: 200,
    targetVolumeMl: 190,
    observedAttributes: {
      texture: ["Creamy", "Thick", "Spoonable", "Soft grains"],
      flavor: ["Sweet", "Milky", "Vanilla hint"],
      color: ["Off-white", "Creamy"],
      packaging: ["Plastic pot", "Foil sealed", "Chilled"],
    },
    targetComposition: {
      water_pct: 62,
      fat_pct: 3,
      protein_pct: 3.5,
      sugar_pct: 12,
      starch_pct: 15,
      salt_pct: 0.15,
      hydrocolloid_pct: 0.35,
      other_pct: 4,
    },
  };

  data.ingredients = [
    makeIngredient("ing-1", "Whole Milk", "Dairy", 1.03, {
      water_pct: 87,
      fat_pct: 3.5,
      protein_pct: 3.3,
      sugar_pct: 4.8,
      starch_pct: 0,
      salt_pct: 0.1,
      hydrocolloid_pct: 0,
      other_pct: 1.3,
    }, 1.2),
    makeIngredient("ing-2", "Short Grain Rice", "Grain", 0.85, {
      water_pct: 12,
      fat_pct: 0.6,
      protein_pct: 6.7,
      sugar_pct: 0.1,
      starch_pct: 78,
      salt_pct: 0,
      hydrocolloid_pct: 0,
      other_pct: 2.6,
    }, 2.5),
    makeIngredient("ing-3", "Granulated Sugar", "Sugar & Sweetener", 1.55, {
      water_pct: 0.1,
      fat_pct: 0,
      protein_pct: 0,
      sugar_pct: 99.9,
      starch_pct: 0,
      salt_pct: 0,
      hydrocolloid_pct: 0,
      other_pct: 0,
    }, 0.9),
    makeIngredient("ing-4", "Heavy Cream", "Dairy", 0.99, {
      water_pct: 58,
      fat_pct: 36,
      protein_pct: 2.1,
      sugar_pct: 2.8,
      starch_pct: 0,
      salt_pct: 0.05,
      hydrocolloid_pct: 0,
      other_pct: 1.05,
    }, 6.5),
    makeIngredient("ing-5", "Modified Starch", "Starch", 0.6, {
      water_pct: 10,
      fat_pct: 0,
      protein_pct: 0.3,
      sugar_pct: 0,
      starch_pct: 88,
      salt_pct: 0,
      hydrocolloid_pct: 0,
      other_pct: 1.7,
    }, 4.0),
    makeIngredient("ing-6", "Carrageenan", "Hydrocolloid", 0.65, {
      water_pct: 10,
      fat_pct: 0,
      protein_pct: 0,
      sugar_pct: 0,
      starch_pct: 0,
      salt_pct: 0,
      hydrocolloid_pct: 85,
      other_pct: 5,
    }, 35.0),
    makeIngredient("ing-7", "Vanilla Extract", "Flavor", 0.88, {
      water_pct: 52,
      fat_pct: 0,
      protein_pct: 0,
      sugar_pct: 12,
      starch_pct: 0,
      salt_pct: 0,
      hydrocolloid_pct: 0,
      other_pct: 36,
    }, 120.0),
    makeIngredient("ing-8", "Salt", "Salt", 2.16, {
      water_pct: 0,
      fat_pct: 0,
      protein_pct: 0,
      sugar_pct: 0,
      starch_pct: 0,
      salt_pct: 100,
      hydrocolloid_pct: 0,
      other_pct: 0,
    }, 0.5),
  ];

  data.formulas = [
    {
      id: "formula-1",
      name: "Candidate A – Milk-heavy",
      description: "High milk ratio with cream for richness",
      version: 1,
      targetMassG: 200,
      ingredientLines: [
        { ingredientId: "ing-1", massG: 130, locked: false },
        { ingredientId: "ing-2", massG: 35, locked: false },
        { ingredientId: "ing-3", massG: 14, locked: false },
        { ingredientId: "ing-4", massG: 10, locked: false },
        { ingredientId: "ing-5", massG: 4, locked: false },
        { ingredientId: "ing-6", massG: 0.7, locked: false },
        { ingredientId: "ing-7", massG: 1, locked: false },
        { ingredientId: "ing-8", massG: 0.3, locked: false },
      ],
      calculatedComponents: {
        water_g: 0,
        fat_g: 0,
        protein_g: 0,
        sugar_g: 0,
        starch_g: 0,
        salt_g: 0,
        hydrocolloid_g: 0,
        other_g: 0,
        total_g: 0,
      },
      massBalance: {
        totalInputG: 195,
        totalOutputG: 200,
        lossG: -5,
        lossPct: -2.56,
        waterAdjustmentG: 5,
      },
      confidence: 0.72,
      notes: "Initial milk-heavy formulation",
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  data.protocols = [
    {
      id: "protocol-1",
      name: "Standard Batch Cook",
      category: "batch-cook",
      description:
        "Traditional rice pudding method: simmer rice in milk, add sugar/cream, cool.",
      version: 1,
      steps: [
        {
          id: "step-1",
          order: 1,
          name: "Rinse Rice",
          description: "Rinse short grain rice under cold water",
          temperatureC: 15,
          durationMin: 2,
          agitationLevel: "low",
          additionIngredients: ["ing-2"],
          holdConditions: "",
          expectedEffects: ["Remove surface starch"],
        },
        {
          id: "step-2",
          order: 2,
          name: "Combine Milk & Rice",
          description: "Add rinsed rice to whole milk in pot",
          temperatureC: 20,
          durationMin: 1,
          agitationLevel: "low",
          additionIngredients: ["ing-1"],
          holdConditions: "",
          expectedEffects: ["Hydration begins"],
        },
        {
          id: "step-3",
          order: 3,
          name: "Bring to Simmer",
          description: "Heat to 85°C, stirring frequently",
          temperatureC: 85,
          durationMin: 10,
          agitationLevel: "medium",
          additionIngredients: [],
          holdConditions: "Maintain gentle simmer",
          expectedEffects: [
            "Starch gelatinization",
            "Grain softening",
            "Milk protein denaturation",
          ],
        },
        {
          id: "step-4",
          order: 4,
          name: "Add Sugar & Starch",
          description: "Add sugar and modified starch, stir well",
          temperatureC: 85,
          durationMin: 2,
          agitationLevel: "high",
          additionIngredients: ["ing-3", "ing-5"],
          holdConditions: "",
          expectedEffects: [
            "Sweetening",
            "Thickening from modified starch",
          ],
        },
        {
          id: "step-5",
          order: 5,
          name: "Cook & Hold",
          description:
            "Continue cooking at 85°C until rice is fully tender and base is thick",
          temperatureC: 85,
          durationMin: 20,
          agitationLevel: "medium",
          additionIngredients: [],
          holdConditions: "Maintain 85°C ± 2°C",
          expectedEffects: [
            "Full starch hydration",
            "Viscosity development",
            "Grain softening complete",
          ],
        },
        {
          id: "step-6",
          order: 6,
          name: "Add Cream & Hydrocolloid",
          description:
            "Off heat slightly, add cream, carrageenan, and vanilla",
          temperatureC: 75,
          durationMin: 3,
          agitationLevel: "medium",
          additionIngredients: ["ing-4", "ing-6", "ing-7"],
          holdConditions: "",
          expectedEffects: [
            "Fat enrichment",
            "Gel network formation",
            "Flavor addition",
          ],
        },
        {
          id: "step-7",
          order: 7,
          name: "Cool",
          description: "Cool to 20°C in ice bath or blast chiller",
          temperatureC: 20,
          durationMin: 30,
          agitationLevel: "low",
          additionIngredients: [],
          holdConditions: "Cool as quickly as possible",
          expectedEffects: [
            "Gel set",
            "Fat crystallization",
            "Texture firming",
          ],
        },
      ],
      expectedEffects: [
        "Creamy pudding texture",
        "Soft rice grains",
        "Stable gel",
      ],
      riskFlags: ["Overcooking dries out", "Hydrocolloid must dissolve fully"],
      notes: "",
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  data.trials = [
    {
      id: "trial-1",
      formulaId: "formula-1",
      protocolId: "protocol-1",
      runNumber: 1,
      status: "completed",
      actualParameters: {
        "Final temp": "84°C",
        "Cook time": "22 min",
        "Cool time": "35 min",
      },
      observations: [
        {
          category: "Texture",
          value: "Slightly thin, rice grains a bit firm",
          timestamp: now(),
        },
        {
          category: "Appearance",
          value: "Good color, slight skin on top",
          timestamp: now(),
        },
      ],
      measurements: [
        { name: "Final viscosity", value: 3200, unit: "mPa·s" },
        { name: "pH", value: 6.4, unit: "" },
        { name: "Total solids", value: 34.5, unit: "%" },
      ],
      scores: [
        { name: "Viscosity", score: 6, weight: 0.15, notes: "A bit thin" },
        {
          name: "Spoonability",
          score: 7,
          weight: 0.1,
          notes: "Reasonable",
        },
        {
          name: "Grain Softness",
          score: 5,
          weight: 0.1,
          notes: "Needs longer cook",
        },
        {
          name: "Creaminess",
          score: 6,
          weight: 0.15,
          notes: "Needs more cream",
        },
        {
          name: "Phase Separation",
          score: 8,
          weight: 0.1,
          notes: "Stable",
        },
        {
          name: "Sweetness Balance",
          score: 7,
          weight: 0.1,
          notes: "Slightly under",
        },
        { name: "Aroma Match", score: 5, weight: 0.1, notes: "Weak vanilla" },
        { name: "Aftertaste", score: 7, weight: 0.1, notes: "Clean" },
        {
          name: "Appearance",
          score: 6,
          weight: 0.1,
          notes: "Slight skin",
        },
      ],
      similarityScore: 63,
      attachmentIds: [],
      notes: "First attempt. Promising but needs iteration on cook time and cream ratio.",
      startedAt: now(),
      completedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  // Recalculate formula components from ingredients
  for (const formula of data.formulas) {
    formula.calculatedComponents = calculateFormulaComponents(
      formula.ingredientLines,
      data.ingredients
    );
    formula.massBalance = calculateMassBalance(
      formula.ingredientLines,
      formula.targetMassG
    );
    const pct = componentsToPercent(formula.calculatedComponents);
    formula.confidence =
      compositionSimilarity(pct, data.targetProduct.targetComposition) / 100;
  }

  return data;
}

function makeIngredient(
  id: string,
  name: string,
  category: string,
  density: number,
  composition: Ingredient["composition"],
  costPerKg: number = 0
): Ingredient {
  return {
    id,
    name,
    category,
    density_g_ml: density,
    composition,
    source: "",
    confidence: 0.9,
    costPerKg,
    substitutions: [],
    constraints: [],
    notes: "",
    createdAt: now(),
    updatedAt: now(),
  };
}
