import type {
  ComponentComposition,
  CalculatedComponents,
  MassBalance,
  FormulaLine,
  Ingredient,
  Trial,
  TargetProduct,
  Formula,
} from "./types";
import { COMPONENT_KEYS, COMPONENT_LABELS } from "./types";

// ─── Component Reconciliation ───
// Convert every ingredient line into component mass, sum them up
export function calculateFormulaComponents(
  lines: FormulaLine[],
  ingredients: Ingredient[]
): CalculatedComponents {
  const result: CalculatedComponents = {
    water_g: 0,
    fat_g: 0,
    protein_g: 0,
    sugar_g: 0,
    starch_g: 0,
    salt_g: 0,
    hydrocolloid_g: 0,
    other_g: 0,
    total_g: 0,
  };

  for (const line of lines) {
    const ing = ingredients.find((i) => i.id === line.ingredientId);
    if (!ing) continue;
    const mass = line.massG;
    result.water_g += (mass * ing.composition.water_pct) / 100;
    result.fat_g += (mass * ing.composition.fat_pct) / 100;
    result.protein_g += (mass * ing.composition.protein_pct) / 100;
    result.sugar_g += (mass * ing.composition.sugar_pct) / 100;
    result.starch_g += (mass * ing.composition.starch_pct) / 100;
    result.salt_g += (mass * ing.composition.salt_pct) / 100;
    result.hydrocolloid_g += (mass * ing.composition.hydrocolloid_pct) / 100;
    result.other_g += (mass * ing.composition.other_pct) / 100;
  }

  result.total_g =
    result.water_g +
    result.fat_g +
    result.protein_g +
    result.sugar_g +
    result.starch_g +
    result.salt_g +
    result.hydrocolloid_g +
    result.other_g;

  return result;
}

// Convert calculated components (grams) to percentages
export function componentsToPercent(
  calc: CalculatedComponents
): ComponentComposition {
  const total = calc.total_g || 1;
  return {
    water_pct: round2((calc.water_g / total) * 100),
    fat_pct: round2((calc.fat_g / total) * 100),
    protein_pct: round2((calc.protein_g / total) * 100),
    sugar_pct: round2((calc.sugar_g / total) * 100),
    starch_pct: round2((calc.starch_g / total) * 100),
    salt_pct: round2((calc.salt_g / total) * 100),
    hydrocolloid_pct: round2((calc.hydrocolloid_g / total) * 100),
    other_pct: round2((calc.other_g / total) * 100),
  };
}

// ─── Mass Balance ───
export function calculateMassBalance(
  lines: FormulaLine[],
  targetMassG: number
): MassBalance {
  const totalInput = lines.reduce((sum, l) => sum + l.massG, 0);
  const lossG = totalInput - targetMassG;
  return {
    totalInputG: round2(totalInput),
    totalOutputG: targetMassG,
    lossG: round2(lossG),
    lossPct: totalInput > 0 ? round2((lossG / totalInput) * 100) : 0,
    waterAdjustmentG: round2(-lossG),
  };
}

// ─── Ingredient Contribution Matrix ───
// For each ingredient, return its component contributions in grams
export function ingredientContributions(
  lines: FormulaLine[],
  ingredients: Ingredient[]
): { ingredientName: string; ingredientId: string; water: number; fat: number; protein: number; sugar: number; starch: number; salt: number; hydrocolloid: number; other: number; total: number }[] {
  return lines.map((line) => {
    const ing = ingredients.find((i) => i.id === line.ingredientId);
    if (!ing) {
      return {
        ingredientName: "Unknown",
        ingredientId: line.ingredientId,
        water: 0,
        fat: 0,
        protein: 0,
        sugar: 0,
        starch: 0,
        salt: 0,
        hydrocolloid: 0,
        other: 0,
        total: line.massG,
      };
    }
    const m = line.massG;
    return {
      ingredientName: ing.name,
      ingredientId: ing.id,
      water: round2((m * ing.composition.water_pct) / 100),
      fat: round2((m * ing.composition.fat_pct) / 100),
      protein: round2((m * ing.composition.protein_pct) / 100),
      sugar: round2((m * ing.composition.sugar_pct) / 100),
      starch: round2((m * ing.composition.starch_pct) / 100),
      salt: round2((m * ing.composition.salt_pct) / 100),
      hydrocolloid: round2((m * ing.composition.hydrocolloid_pct) / 100),
      other: round2((m * ing.composition.other_pct) / 100),
      total: m,
    };
  });
}

// ─── Composition Similarity Scoring ───
// Compare two compositions; returns 0-100 (100 = perfect match)
export function compositionSimilarity(
  a: ComponentComposition,
  b: ComponentComposition
): number {
  let weightedError = 0;
  let totalWeight = 0;
  for (const key of COMPONENT_KEYS) {
    const diff = Math.abs(a[key] - b[key]);
    // Floor at 0.1 so trace components (e.g. salt at 0%) still get a small
    // but nonzero weight in the weighted error sum
    const weight = Math.max(a[key], b[key], 0.1);
    weightedError += diff * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 100;
  const normalizedError = weightedError / totalWeight;
  return round2(Math.max(0, 100 - normalizedError * 10));
}

// ─── Trial Similarity Score ───
export function calculateSimilarityScore(trial: Trial): number {
  if (!trial.scores || trial.scores.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of trial.scores) {
    weightedSum += s.score * s.weight;
    totalWeight += s.weight;
  }
  if (totalWeight === 0) return 0;
  return round2((weightedSum / totalWeight) * 10); // scale to 0-100
}

// ─── Sensitivity Analysis ───
// What happens if we change one ingredient's mass by deltaPct
export function sensitivityAnalysis(
  formula: Formula,
  ingredients: Ingredient[],
  ingredientId: string,
  deltaPct: number
): {
  original: CalculatedComponents;
  modified: CalculatedComponents;
  deltas: Record<string, number>;
} {
  const original = calculateFormulaComponents(
    formula.ingredientLines,
    ingredients
  );

  const modifiedLines = formula.ingredientLines.map((l) => {
    if (l.ingredientId === ingredientId) {
      return { ...l, massG: l.massG * (1 + deltaPct / 100) };
    }
    return l;
  });

  const modified = calculateFormulaComponents(modifiedLines, ingredients);

  const keys = [
    "water_g",
    "fat_g",
    "protein_g",
    "sugar_g",
    "starch_g",
    "salt_g",
    "hydrocolloid_g",
    "other_g",
  ] as const;

  const deltas: Record<string, number> = {};
  for (const k of keys) {
    deltas[k] = round2(modified[k] - original[k]);
  }

  return { original, modified, deltas };
}

// ─── Simple Constraint Solver ───
// Given a target composition and available ingredients, find a feasible formula
export function solveFormula(
  targetMassG: number,
  targetComposition: ComponentComposition,
  ingredients: Ingredient[],
  constraints?: { ingredientId: string; minG?: number; maxG?: number }[]
): FormulaLine[] {
  // Simple heuristic solver (not LP, but practical)
  // Strategy: proportional allocation based on dominant component

  const lines: FormulaLine[] = [];

  // Target component masses
  const targetWater = (targetMassG * targetComposition.water_pct) / 100;
  const targetFat = (targetMassG * targetComposition.fat_pct) / 100;
  const targetProtein = (targetMassG * targetComposition.protein_pct) / 100;
  const targetSugar = (targetMassG * targetComposition.sugar_pct) / 100;
  const targetStarch = (targetMassG * targetComposition.starch_pct) / 100;
  const targetSalt = (targetMassG * targetComposition.salt_pct) / 100;
  const targetHydrocolloid =
    (targetMassG * targetComposition.hydrocolloid_pct) / 100;

  // Sort ingredients by their dominant component for greedy allocation
  const remaining = {
    water: targetWater,
    fat: targetFat,
    protein: targetProtein,
    sugar: targetSugar,
    starch: targetStarch,
    salt: targetSalt,
    hydrocolloid: targetHydrocolloid,
  };

  // Process specialized ingredients first (hydrocolloid, salt, sugar, starch)
  const specializedOrder = ["hydrocolloid_pct", "salt_pct", "sugar_pct", "starch_pct", "fat_pct", "protein_pct", "water_pct"] as const;

  const used = new Set<string>();

  for (const compKey of specializedOrder) {
    const shortKey = compKey.replace("_pct", "") as keyof typeof remaining;
    if (remaining[shortKey] <= 0) continue;

    // Find best ingredient for this component
    const candidates = ingredients
      .filter((i) => !used.has(i.id) && i.composition[compKey] > 20)
      .sort((a, b) => b.composition[compKey] - a.composition[compKey]);

    if (candidates.length === 0) continue;

    const best = candidates[0];
    const componentFraction = best.composition[compKey] / 100;
    if (componentFraction <= 0) continue;

    let massNeeded = remaining[shortKey] / componentFraction;

    // Apply constraints
    const constraint = constraints?.find(
      (c) => c.ingredientId === best.id
    );
    if (constraint?.maxG && massNeeded > constraint.maxG) {
      massNeeded = constraint.maxG;
    }
    if (constraint?.minG && massNeeded < constraint.minG) {
      massNeeded = constraint.minG;
    }

    massNeeded = Math.max(0, round2(massNeeded));

    lines.push({
      ingredientId: best.id,
      massG: massNeeded,
      locked: false,
      minG: constraint?.minG,
      maxG: constraint?.maxG,
    });

    used.add(best.id);

    // Subtract this ingredient's contributions from remaining
    remaining.water -= (massNeeded * best.composition.water_pct) / 100;
    remaining.fat -= (massNeeded * best.composition.fat_pct) / 100;
    remaining.protein -= (massNeeded * best.composition.protein_pct) / 100;
    remaining.sugar -= (massNeeded * best.composition.sugar_pct) / 100;
    remaining.starch -= (massNeeded * best.composition.starch_pct) / 100;
    remaining.salt -= (massNeeded * best.composition.salt_pct) / 100;
    remaining.hydrocolloid -=
      (massNeeded * best.composition.hydrocolloid_pct) / 100;
  }

  // If there's still remaining mass, add water-dominant ingredient
  const totalUsed = lines.reduce((s, l) => s + l.massG, 0);
  if (totalUsed < targetMassG) {
    const waterIng = ingredients.find(
      (i) => !used.has(i.id) && i.composition.water_pct > 70
    );
    if (waterIng) {
      lines.push({
        ingredientId: waterIng.id,
        massG: round2(targetMassG - totalUsed),
        locked: false,
      });
    }
  }

  return lines;
}

// ─── Ranking Engine ───
export function rankTrials(
  trials: Trial[],
  formulas: Formula[],
  ingredients: Ingredient[],
  target: TargetProduct
): { trialId: string; compositionScore: number; outcomeScore: number; combinedScore: number }[] {
  return trials
    .filter((t) => t.status === "completed")
    .map((t) => {
      const formula = formulas.find((f) => f.id === t.formulaId);
      let compositionScore = 0;
      if (formula) {
        const calcPct = componentsToPercent(
          calculateFormulaComponents(formula.ingredientLines, ingredients)
        );
        compositionScore = compositionSimilarity(
          calcPct,
          target.targetComposition
        );
      }
      const outcomeScore = calculateSimilarityScore(t);
      const combinedScore = round2(compositionScore * 0.4 + outcomeScore * 0.6);
      return { trialId: t.id, compositionScore, outcomeScore, combinedScore };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

// ─── Compliance Checker ───
export function checkCompliance(
  formulaComposition: ComponentComposition,
  targetComposition: ComponentComposition
): { status: "compliant" | "warning" | "non-compliant"; maxDeviation: number; deviations: { key: string; label: string; diff: number }[] } {
  const deviations: { key: string; label: string; diff: number }[] = [];
  let maxDeviation = 0;
  for (const key of COMPONENT_KEYS) {
    const diff = Math.abs(formulaComposition[key] - targetComposition[key]);
    if (diff > 2) {
      deviations.push({ key, label: COMPONENT_LABELS[key] || key, diff: round2(diff) });
    }
    if (diff > maxDeviation) maxDeviation = diff;
  }
  const status = maxDeviation <= 2 ? "compliant" : maxDeviation <= 5 ? "warning" : "non-compliant";
  return { status, maxDeviation: round2(maxDeviation), deviations };
}

// ─── Helpers ───
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
