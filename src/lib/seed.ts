import {
  type ProjectData,
  type Ingredient,
  DEFAULT_TARGET_NUTRITION,
  DEFAULT_PROJECT_SETTINGS,
} from "./types";
import {
  calculateFormulaNutrition,
  calculateMassBalance,
  nutritionSimilarity,
  totalFormulaMassG,
} from "./solver";

const now = () => new Date().toISOString();

// ─── Default Project Data ───
export function createDefaultProjectData(): ProjectData {
  return {
    project: {
      id: "single-project",
      name: "RErecipe",
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
      targetNutrition: DEFAULT_TARGET_NUTRITION.map((n) => ({ ...n })),
      targetIngredients: [],
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
    settings: { ...DEFAULT_PROJECT_SETTINGS },
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
    targetNutrition: [
      { name: "Energy", unit: "kcal", per100g: 110 },
      { name: "Fat", unit: "g", per100g: 3 },
      { name: "Saturated Fat", unit: "g", per100g: 1.8 },
      { name: "Carbohydrates", unit: "g", per100g: 18 },
      { name: "Sugar", unit: "g", per100g: 12 },
      { name: "Protein", unit: "g", per100g: 3.5 },
      { name: "Fibre", unit: "g", per100g: 0.3 },
      { name: "Salt", unit: "g", per100g: 0.15 },
    ],
    // Ingredient order as listed on the product label (descending by mass%).
    // Approximate percentages derived from the known formula composition.
    targetIngredients: [
      { ingredientId: "ing-1", targetPct: 65 },  // Whole Milk
      { ingredientId: "ing-2", targetPct: 17.5 }, // Short Grain Rice
      { ingredientId: "ing-3", targetPct: 7 },    // Granulated Sugar
      { ingredientId: "ing-4", targetPct: 5 },    // Heavy Cream
      { ingredientId: "ing-5", targetPct: 2 },    // Modified Starch
      { ingredientId: "ing-6" },                   // Carrageenan (trace – no exact %)
      { ingredientId: "ing-7" },                   // Vanilla Extract (trace – no exact %)
      { ingredientId: "ing-8" },                   // Salt (trace – no exact %)
    ],
  };

  data.ingredients = [
    makeIngredient("ing-1", "Whole Milk", "Dairy", 1.03, {
      Energy: 61,
      Fat: 3.5,
      "Saturated Fat": 1.9,
      Carbohydrates: 4.8,
      Sugar: 4.8,
      Protein: 3.3,
      Fibre: 0,
      Salt: 0.1,
    }, 1.2),
    makeIngredient("ing-2", "Short Grain Rice", "Grain", 0.85, {
      Energy: 358,
      Fat: 0.6,
      "Saturated Fat": 0.2,
      Carbohydrates: 79,
      Sugar: 0.1,
      Protein: 6.7,
      Fibre: 1.4,
      Salt: 0,
    }, 2.5),
    makeIngredient("ing-3", "Granulated Sugar", "Sugar & Sweetener", 1.55, {
      Energy: 387,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 99.9,
      Sugar: 99.9,
      Protein: 0,
      Fibre: 0,
      Salt: 0,
    }, 0.9),
    makeIngredient("ing-4", "Heavy Cream", "Dairy", 0.99, {
      Energy: 340,
      Fat: 36,
      "Saturated Fat": 23,
      Carbohydrates: 2.8,
      Sugar: 2.8,
      Protein: 2.1,
      Fibre: 0,
      Salt: 0.05,
    }, 6.5),
    makeIngredient("ing-5", "Modified Starch", "Starch", 0.6, {
      Energy: 354,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 88,
      Sugar: 0,
      Protein: 0.3,
      Fibre: 0,
      Salt: 0,
    }, 4.0),
    makeIngredient("ing-6", "Carrageenan", "Hydrocolloid", 0.65, {
      Energy: 0,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 0,
      Sugar: 0,
      Protein: 0,
      Fibre: 85,
      Salt: 0,
    }, 35.0),
    makeIngredient("ing-7", "Vanilla Extract", "Flavor", 0.88, {
      Energy: 288,
      Fat: 0.1,
      "Saturated Fat": 0,
      Carbohydrates: 12.7,
      Sugar: 12.7,
      Protein: 0.1,
      Fibre: 0,
      Salt: 0,
    }, 120.0),
    makeIngredient("ing-8", "Salt", "Salt", 2.16, {
      Energy: 0,
      Fat: 0,
      "Saturated Fat": 0,
      Carbohydrates: 0,
      Sugar: 0,
      Protein: 0,
      Fibre: 0,
      Salt: 100,
    }, 0.5),
  ];

  data.formulas = [
    {
      id: "formula-1",
      name: "Candidate A – Milk-heavy",
      description: "High milk ratio with cream for richness",
      version: 1,
      lockTotalMass: true,
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
      calculatedNutrition: {},
      totalMassG: 0,
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
      containers: [
        { id: "cont-1", name: "Main Pot", type: "pot" as const, capacityMl: 2000 },
      ],
      steps: [
        {
          id: "step-1",
          order: 1,
          name: "Rinse Rice",
          description: "Rinse short grain rice under cold water",
          containerId: "cont-1",
          temperatureC: 15,
          duration: { type: "fixed" as const, durationMin: 2 },
          containerAgitation: { "cont-1": "low" as const },
          additions: [{ ingredientId: "ing-2", massG: 35, containerId: "cont-1" }],
          holdConditions: "",
          expectedEffects: ["Remove surface starch"],
          requiresStartConfirmation: false,
        },
        {
          id: "step-2",
          order: 2,
          name: "Combine Milk & Rice",
          description: "Add rinsed rice to whole milk in pot",
          containerId: "cont-1",
          temperatureC: 20,
          duration: { type: "fixed" as const, durationMin: 1 },
          containerAgitation: { "cont-1": "low" as const },
          additions: [{ ingredientId: "ing-1", massG: 130, containerId: "cont-1" }],
          holdConditions: "",
          expectedEffects: ["Hydration begins"],
          requiresStartConfirmation: false,
        },
        {
          id: "step-3",
          order: 3,
          name: "Bring to Simmer",
          description: "Heat to 85°C, stirring frequently",
          containerId: "cont-1",
          temperatureC: 85,
          duration: { type: "after-event" as const, durationMin: 10, eventDescription: "Pot reaches 85°C" },
          containerAgitation: { "cont-1": "medium" as const },
          additions: [],
          holdConditions: "Maintain gentle simmer",
          expectedEffects: [
            "Starch gelatinization",
            "Grain softening",
            "Milk protein denaturation",
          ],
          requiresStartConfirmation: true,
        },
        {
          id: "step-4",
          order: 4,
          name: "Add Sugar & Starch",
          description: "Add sugar and modified starch, stir well",
          containerId: "cont-1",
          temperatureC: 85,
          duration: { type: "fixed" as const, durationMin: 2 },
          containerAgitation: { "cont-1": "high" as const },
          additions: [
            { ingredientId: "ing-3", massG: 14, containerId: "cont-1" },
            { ingredientId: "ing-5", massG: 4, containerId: "cont-1" },
          ],
          holdConditions: "",
          expectedEffects: [
            "Sweetening",
            "Thickening from modified starch",
          ],
          requiresStartConfirmation: false,
        },
        {
          id: "step-5",
          order: 5,
          name: "Cook & Hold",
          description:
            "Continue cooking at 85°C until rice is fully tender and base is thick",
          containerId: "cont-1",
          temperatureC: 85,
          duration: { type: "fixed" as const, durationMin: 20 },
          containerAgitation: { "cont-1": "medium" as const },
          additions: [],
          holdConditions: "Maintain 85°C ± 2°C",
          expectedEffects: [
            "Full starch hydration",
            "Viscosity development",
            "Grain softening complete",
          ],
          requiresStartConfirmation: false,
        },
        {
          id: "step-6",
          order: 6,
          name: "Add Cream & Hydrocolloid",
          description:
            "Off heat slightly, add cream, carrageenan, and vanilla",
          containerId: "cont-1",
          temperatureC: 75,
          duration: { type: "fixed" as const, durationMin: 3 },
          containerAgitation: { "cont-1": "medium" as const },
          additions: [
            { ingredientId: "ing-4", massG: 10, containerId: "cont-1" },
            { ingredientId: "ing-6", massG: 0.7, containerId: "cont-1" },
            { ingredientId: "ing-7", massG: 1, containerId: "cont-1" },
          ],
          holdConditions: "",
          expectedEffects: [
            "Fat enrichment",
            "Gel network formation",
            "Flavor addition",
          ],
          requiresStartConfirmation: false,
        },
        {
          id: "step-7",
          order: 7,
          name: "Cool",
          description: "Cool to 20°C in ice bath or blast chiller",
          containerId: "cont-1",
          temperatureC: 20,
          duration: { type: "fixed" as const, durationMin: 30 },
          containerAgitation: { "cont-1": "low" as const },
          additions: [],
          holdConditions: "Cool as quickly as possible",
          expectedEffects: [
            "Gel set",
            "Fat crystallization",
            "Texture firming",
          ],
          requiresStartConfirmation: false,
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
    {
      id: "protocol-2",
      name: "Pressure Cook Method",
      category: "heat-first",
      description:
        "Pressure cook rice in milk for faster starch release, then finish with cream and hydrocolloid.",
      version: 1,
      containers: [
        { id: "cont-pc-1", name: "Pressure Cooker", type: "pressure-cooker" as const, capacityMl: 3000 },
        { id: "cont-pc-2", name: "Finishing Pot", type: "pot" as const, capacityMl: 2000 },
      ],
      steps: [
        {
          id: "step-p2-1",
          order: 1,
          name: "Combine Ingredients",
          description: "Add rice, milk, and sugar to pressure cooker",
          containerId: "cont-pc-1",
          temperatureC: 20,
          duration: { type: "fixed" as const, durationMin: 2 },
          containerAgitation: { "cont-pc-1": "low" as const },
          additions: [
            { ingredientId: "ing-2", massG: 35, containerId: "cont-pc-1" },
            { ingredientId: "ing-1", massG: 130, containerId: "cont-pc-1" },
            { ingredientId: "ing-3", massG: 14, containerId: "cont-pc-1" },
          ],
          holdConditions: "",
          expectedEffects: ["Pre-mix before pressurizing"],
          requiresStartConfirmation: false,
        },
        {
          id: "step-p2-2",
          order: 2,
          name: "Pressure Cook",
          description: "Cook at high pressure (15 psi) for 8 minutes",
          containerId: "cont-pc-1",
          temperatureC: 121,
          duration: { type: "fixed" as const, durationMin: 8 },
          containerAgitation: { "cont-pc-1": "none" as const },
          additions: [],
          holdConditions: "15 psi, sealed",
          expectedEffects: [
            "Rapid starch gelatinization",
            "Complete grain softening",
            "Accelerated Maillard reaction",
          ],
          requiresStartConfirmation: true,
        },
        {
          id: "step-p2-3",
          order: 3,
          name: "Natural Release",
          description: "Allow pressure to release naturally for 10 minutes",
          containerId: "cont-pc-1",
          temperatureC: 100,
          duration: { type: "after-event" as const, durationMin: 10, eventDescription: "Pressure gauge reads zero" },
          containerAgitation: { "cont-pc-1": "none" as const },
          additions: [],
          holdConditions: "Do not open valve",
          expectedEffects: ["Gradual pressure drop", "Continued starch hydration"],
          requiresStartConfirmation: false,
        },
        {
          id: "step-p2-4",
          order: 4,
          name: "Add Starch & Hydrocolloid",
          description: "Transfer to finishing pot, add modified starch and carrageenan",
          containerId: "cont-pc-2",
          temperatureC: 85,
          duration: { type: "fixed" as const, durationMin: 3 },
          containerAgitation: { "cont-pc-2": "high" as const },
          additions: [
            { ingredientId: "ing-5", massG: 4, containerId: "cont-pc-2" },
            { ingredientId: "ing-6", massG: 0.7, containerId: "cont-pc-2" },
          ],
          holdConditions: "",
          expectedEffects: ["Thickening", "Gel network formation"],
          requiresStartConfirmation: false,
        },
        {
          id: "step-p2-5",
          order: 5,
          name: "Finish & Cool",
          description: "Add cream and vanilla, cool rapidly",
          containerId: "cont-pc-2",
          temperatureC: 20,
          duration: { type: "fixed" as const, durationMin: 25 },
          containerAgitation: { "cont-pc-2": "low" as const },
          additions: [
            { ingredientId: "ing-4", massG: 10, containerId: "cont-pc-2" },
            { ingredientId: "ing-7", massG: 1, containerId: "cont-pc-2" },
          ],
          holdConditions: "Cool to <25°C within 30 min",
          expectedEffects: ["Fat enrichment", "Flavor addition", "Gel set"],
          requiresStartConfirmation: false,
        },
      ],
      expectedEffects: [
        "Faster cook time",
        "Softer grains",
        "Slightly darker color from Maillard",
      ],
      riskFlags: [
        "Over-pressure risk",
        "May scorch on bottom",
        "Grain may be too soft / mushy",
      ],
      notes: "Alternative process for comparison with standard batch cook",
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
      stepLogs: [],
      containerStates: [],
      startedAt: now(),
      completedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    },
    // Trial 2 & 3: Replicates using Standard Batch Cook (protocol-1)
    {
      id: "trial-2",
      formulaId: "formula-1",
      protocolId: "protocol-1",
      runNumber: 2,
      status: "completed",
      actualParameters: {
        "Final temp": "85°C",
        "Cook time": "25 min",
        "Cool time": "32 min",
      },
      observations: [
        { category: "Texture", value: "Better viscosity, rice softer", timestamp: now() },
        { category: "Appearance", value: "No skin, even color", timestamp: now() },
      ],
      measurements: [
        { name: "Final viscosity", value: 3800, unit: "mPa·s" },
        { name: "pH", value: 6.3, unit: "" },
        { name: "Total solids", value: 35.1, unit: "%" },
      ],
      scores: [
        { name: "Viscosity", score: 7, weight: 0.15, notes: "Improved" },
        { name: "Spoonability", score: 7, weight: 0.1, notes: "Good" },
        { name: "Grain Softness", score: 7, weight: 0.1, notes: "Better with longer cook" },
        { name: "Creaminess", score: 6, weight: 0.15, notes: "Still needs more cream" },
        { name: "Phase Separation", score: 8, weight: 0.1, notes: "Stable" },
        { name: "Sweetness Balance", score: 7, weight: 0.1, notes: "Good" },
        { name: "Aroma Match", score: 5, weight: 0.1, notes: "Vanilla still weak" },
        { name: "Aftertaste", score: 7, weight: 0.1, notes: "Clean" },
        { name: "Appearance", score: 7, weight: 0.1, notes: "Good" },
      ],
      similarityScore: 67,
      attachmentIds: [],
      notes: "Replicate 2 of batch cook process. Longer cook time improved grain softness.",
      stepLogs: [],
      containerStates: [],
      startedAt: now(),
      completedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "trial-3",
      formulaId: "formula-1",
      protocolId: "protocol-1",
      runNumber: 3,
      status: "completed",
      actualParameters: {
        "Final temp": "85°C",
        "Cook time": "24 min",
        "Cool time": "33 min",
      },
      observations: [
        { category: "Texture", value: "Consistent with trial 2", timestamp: now() },
        { category: "Appearance", value: "Good color, smooth surface", timestamp: now() },
      ],
      measurements: [
        { name: "Final viscosity", value: 3650, unit: "mPa·s" },
        { name: "pH", value: 6.35, unit: "" },
        { name: "Total solids", value: 34.8, unit: "%" },
      ],
      scores: [
        { name: "Viscosity", score: 7, weight: 0.15, notes: "Consistent" },
        { name: "Spoonability", score: 7, weight: 0.1, notes: "Reproducible" },
        { name: "Grain Softness", score: 6, weight: 0.1, notes: "Slightly less than trial 2" },
        { name: "Creaminess", score: 6, weight: 0.15, notes: "Same as before" },
        { name: "Phase Separation", score: 8, weight: 0.1, notes: "Stable" },
        { name: "Sweetness Balance", score: 7, weight: 0.1, notes: "Good" },
        { name: "Aroma Match", score: 5, weight: 0.1, notes: "Consistent" },
        { name: "Aftertaste", score: 7, weight: 0.1, notes: "Clean" },
        { name: "Appearance", score: 7, weight: 0.1, notes: "Good" },
      ],
      similarityScore: 65,
      attachmentIds: [],
      notes: "Replicate 3 of batch cook. Good reproducibility with trials 1-2.",
      stepLogs: [],
      containerStates: [],
      startedAt: now(),
      completedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    },
    // Trials 4-6: Pressure Cook Method (protocol-2) with 3 replicates
    {
      id: "trial-4",
      formulaId: "formula-1",
      protocolId: "protocol-2",
      runNumber: 4,
      status: "completed",
      actualParameters: {
        "Pressure": "15 psi",
        "Cook time": "8 min",
        "Release time": "12 min",
        "Cool time": "28 min",
      },
      observations: [
        { category: "Texture", value: "Very soft grains, almost mushy", timestamp: now() },
        { category: "Appearance", value: "Slightly darker color than batch cook", timestamp: now() },
        { category: "Process", value: "Faster overall, less stirring needed", timestamp: now() },
      ],
      measurements: [
        { name: "Final viscosity", value: 4200, unit: "mPa·s" },
        { name: "pH", value: 6.2, unit: "" },
        { name: "Total solids", value: 36.0, unit: "%" },
      ],
      scores: [
        { name: "Viscosity", score: 8, weight: 0.15, notes: "Good thickness" },
        { name: "Spoonability", score: 8, weight: 0.1, notes: "Excellent" },
        { name: "Grain Softness", score: 9, weight: 0.1, notes: "Very soft, borderline too soft" },
        { name: "Creaminess", score: 7, weight: 0.15, notes: "Better than batch cook" },
        { name: "Phase Separation", score: 7, weight: 0.1, notes: "Slight whey separation" },
        { name: "Sweetness Balance", score: 7, weight: 0.1, notes: "Good" },
        { name: "Aroma Match", score: 4, weight: 0.1, notes: "Pressure cooking muted vanilla" },
        { name: "Aftertaste", score: 6, weight: 0.1, notes: "Slight cooked milk note" },
        { name: "Appearance", score: 5, weight: 0.1, notes: "Darker than target" },
      ],
      similarityScore: 68,
      attachmentIds: [],
      notes: "First pressure cook trial. Grains very soft. Aroma and color need work.",
      stepLogs: [],
      containerStates: [],
      startedAt: now(),
      completedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "trial-5",
      formulaId: "formula-1",
      protocolId: "protocol-2",
      runNumber: 5,
      status: "completed",
      actualParameters: {
        "Pressure": "15 psi",
        "Cook time": "7 min",
        "Release time": "10 min",
        "Cool time": "26 min",
      },
      observations: [
        { category: "Texture", value: "Better grain texture with shorter cook", timestamp: now() },
        { category: "Appearance", value: "Still slightly dark", timestamp: now() },
      ],
      measurements: [
        { name: "Final viscosity", value: 3900, unit: "mPa·s" },
        { name: "pH", value: 6.25, unit: "" },
        { name: "Total solids", value: 35.5, unit: "%" },
      ],
      scores: [
        { name: "Viscosity", score: 7, weight: 0.15, notes: "Slightly less than trial 4" },
        { name: "Spoonability", score: 8, weight: 0.1, notes: "Good" },
        { name: "Grain Softness", score: 8, weight: 0.1, notes: "Better balance" },
        { name: "Creaminess", score: 7, weight: 0.15, notes: "Good" },
        { name: "Phase Separation", score: 7, weight: 0.1, notes: "Slight separation" },
        { name: "Sweetness Balance", score: 7, weight: 0.1, notes: "OK" },
        { name: "Aroma Match", score: 5, weight: 0.1, notes: "Slightly better" },
        { name: "Aftertaste", score: 6, weight: 0.1, notes: "Cooked note reduced" },
        { name: "Appearance", score: 6, weight: 0.1, notes: "Improved" },
      ],
      similarityScore: 67,
      attachmentIds: [],
      notes: "Replicate 2 of pressure cook. Reduced cook time by 1 min improved grain texture.",
      stepLogs: [],
      containerStates: [],
      startedAt: now(),
      completedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "trial-6",
      formulaId: "formula-1",
      protocolId: "protocol-2",
      runNumber: 6,
      status: "completed",
      actualParameters: {
        "Pressure": "15 psi",
        "Cook time": "7 min",
        "Release time": "11 min",
        "Cool time": "27 min",
      },
      observations: [
        { category: "Texture", value: "Good consistency with trial 5", timestamp: now() },
        { category: "Appearance", value: "Acceptable color", timestamp: now() },
      ],
      measurements: [
        { name: "Final viscosity", value: 4000, unit: "mPa·s" },
        { name: "pH", value: 6.22, unit: "" },
        { name: "Total solids", value: 35.7, unit: "%" },
      ],
      scores: [
        { name: "Viscosity", score: 8, weight: 0.15, notes: "Good" },
        { name: "Spoonability", score: 8, weight: 0.1, notes: "Good" },
        { name: "Grain Softness", score: 8, weight: 0.1, notes: "Consistent" },
        { name: "Creaminess", score: 7, weight: 0.15, notes: "Good" },
        { name: "Phase Separation", score: 7, weight: 0.1, notes: "Same slight separation" },
        { name: "Sweetness Balance", score: 7, weight: 0.1, notes: "Good" },
        { name: "Aroma Match", score: 5, weight: 0.1, notes: "Consistent with trial 5" },
        { name: "Aftertaste", score: 6, weight: 0.1, notes: "Slight cooked note" },
        { name: "Appearance", score: 6, weight: 0.1, notes: "Acceptable" },
      ],
      similarityScore: 68,
      attachmentIds: [],
      notes: "Replicate 3 of pressure cook. Good reproducibility within this process.",
      stepLogs: [],
      containerStates: [],
      startedAt: now(),
      completedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  // Recalculate formula nutrition from ingredients
  for (const formula of data.formulas) {
    formula.totalMassG = totalFormulaMassG(formula.ingredientLines);
    formula.calculatedNutrition = calculateFormulaNutrition(
      formula.ingredientLines,
      data.ingredients,
      data.targetProduct.targetNutrition
    );
    formula.massBalance = calculateMassBalance(
      formula.ingredientLines,
      data.targetProduct.targetMassG
    );
    formula.confidence =
      nutritionSimilarity(
        formula.calculatedNutrition,
        data.targetProduct.targetNutrition
      ) / 100;
  }

  return data;
}

function makeIngredient(
  id: string,
  name: string,
  category: string,
  density: number,
  nutrition: Ingredient["nutrition"],
  costPerKg: number = 0
): Ingredient {
  return {
    id,
    name,
    category,
    density_g_ml: density,
    nutrition,
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
