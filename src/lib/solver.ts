import type {
  CalculatedNutrition,
  FormulaLine,
  Ingredient,
  MassBalance,
  Trial,
  TargetProduct,
  TargetIngredient,
  Formula,
  NutritionalValue,
} from "./types";

// ─── Helpers ───
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function trackedNames(target: NutritionalValue[]): string[] {
  return target.map((n) => n.name);
}

// Get the value for a nutrient in an ingredient (per 100 g of ingredient).
// Missing entries are treated as 0.
function ingValue(ing: Ingredient, name: string): number {
  const v = ing.nutrition?.[name];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// ─── Total formula mass ───
export function totalFormulaMassG(lines: FormulaLine[]): number {
  return lines.reduce((sum, l) => sum + (l.massG || 0), 0);
}

// ─── Calculated Nutrition (per 100 g of formula) ───
// Sums each tracked nutrient as mass-weighted contribution from each
// ingredient and normalizes to per-100g of total formula mass.
export function calculateFormulaNutrition(
  lines: FormulaLine[],
  ingredients: Ingredient[],
  target: NutritionalValue[]
): CalculatedNutrition {
  const result: CalculatedNutrition = {};
  const names = trackedNames(target);
  for (const name of names) result[name] = 0;

  const totalG = totalFormulaMassG(lines);
  if (totalG <= 0) return result;

  // Build a lookup map once to avoid O(n) find() per line.
  const ingById = new Map<string, Ingredient>(ingredients.map((i) => [i.id, i]));

  for (const line of lines) {
    const ing = ingById.get(line.ingredientId);
    if (!ing) continue;
    for (const name of names) {
      // (mass / 100) * value-per-100g = absolute amount of nutrient
      result[name] += (line.massG / 100) * ingValue(ing, name);
    }
  }

  // Normalize to per 100 g of formula mass
  for (const name of names) {
    result[name] = round2((result[name] * 100) / totalG);
  }

  return result;
}

// ─── Mass Balance ───
export function calculateMassBalance(
  lines: FormulaLine[],
  targetMassG: number
): MassBalance {
  const totalInput = totalFormulaMassG(lines);
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
// For each ingredient line, return the absolute amount of each tracked
// nutrient it contributes to the formula (in the nutrient's unit).
export interface IngredientContribution {
  ingredientName: string;
  ingredientId: string;
  totalG: number;
  // Absolute nutrient amounts contributed (e.g. "Fat" -> 1.2 g, "Energy" -> 25 kcal).
  values: Record<string, number>;
}

export function ingredientContributions(
  lines: FormulaLine[],
  ingredients: Ingredient[],
  target: NutritionalValue[]
): IngredientContribution[] {
  const names = trackedNames(target);
  const ingById = new Map<string, Ingredient>(ingredients.map((i) => [i.id, i]));
  return lines.map((line) => {
    const ing = ingById.get(line.ingredientId);
    const values: Record<string, number> = {};
    for (const name of names) {
      values[name] = ing
        ? round2((line.massG / 100) * ingValue(ing, name))
        : 0;
    }
    return {
      ingredientName: ing?.name ?? "Unknown",
      ingredientId: line.ingredientId,
      totalG: line.massG,
      values,
    };
  });
}

// ─── Nutrition Similarity Scoring ───
// Compare two per-100g nutrition snapshots. Returns 0-100 (100 = perfect
// match). Uses a relative error so that nutrients with different magnitudes
// (e.g. Energy in kcal vs Salt in g) contribute fairly.
export function nutritionSimilarity(
  formula: CalculatedNutrition,
  target: NutritionalValue[]
): number {
  if (target.length === 0) return 100;
  let totalRelErr = 0;
  let count = 0;
  for (const t of target) {
    const targetVal = t.per100g;
    const formulaVal = formula[t.name] ?? 0;
    const denom = Math.max(Math.abs(targetVal), Math.abs(formulaVal), 1e-3);
    const relErr = Math.min(1, Math.abs(formulaVal - targetVal) / denom);
    totalRelErr += relErr;
    count++;
  }
  if (count === 0) return 100;
  const meanRelErr = totalRelErr / count;
  return round2(Math.max(0, 100 - meanRelErr * 100));
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
// What happens if we change one ingredient's mass by deltaPct.
// Returns the original and modified per-100g nutrition snapshots, plus
// per-nutrient deltas.
export function sensitivityAnalysis(
  formula: Formula,
  ingredients: Ingredient[],
  target: NutritionalValue[],
  ingredientId: string,
  deltaPct: number
): {
  original: CalculatedNutrition;
  modified: CalculatedNutrition;
  deltas: Record<string, number>;
} {
  const original = calculateFormulaNutrition(
    formula.ingredientLines,
    ingredients,
    target
  );

  const modifiedLines = formula.ingredientLines.map((l) => {
    if (l.ingredientId === ingredientId) {
      return { ...l, massG: l.massG * (1 + deltaPct / 100) };
    }
    return l;
  });

  const modified = calculateFormulaNutrition(modifiedLines, ingredients, target);

  const deltas: Record<string, number> = {};
  for (const t of target) {
    deltas[t.name] = round2((modified[t.name] ?? 0) - (original[t.name] ?? 0));
  }

  return { original, modified, deltas };
}

// ─── Compliance Checker ───
// Compares a per-100g formula snapshot to the target. Uses relative
// deviation thresholds so that mixed-unit nutrients are handled fairly.
export interface ComplianceDeviation {
  name: string;
  unit: string;
  formulaVal: number;
  targetVal: number;
  diff: number; // formula - target, in nutrient unit
  relDiffPct: number; // |diff| / max(|target|, ...) * 100
}

export function checkCompliance(
  formula: CalculatedNutrition,
  target: NutritionalValue[]
): {
  status: "compliant" | "warning" | "non-compliant";
  maxRelDeviationPct: number;
  deviations: ComplianceDeviation[];
} {
  const deviations: ComplianceDeviation[] = [];
  let maxRelDeviationPct = 0;
  const WARN_PCT = 10;
  const FAIL_PCT = 25;
  for (const t of target) {
    const formulaVal = formula[t.name] ?? 0;
    const targetVal = t.per100g;
    const diff = formulaVal - targetVal;
    const denom = Math.max(Math.abs(targetVal), Math.abs(formulaVal), 1e-3);
    const relDiffPct = (Math.abs(diff) / denom) * 100;
    if (relDiffPct > WARN_PCT) {
      deviations.push({
        name: t.name,
        unit: t.unit,
        formulaVal: round2(formulaVal),
        targetVal: round2(targetVal),
        diff: round2(diff),
        relDiffPct: round2(relDiffPct),
      });
    }
    if (relDiffPct > maxRelDeviationPct) maxRelDeviationPct = relDiffPct;
  }
  const status =
    maxRelDeviationPct <= WARN_PCT
      ? "compliant"
      : maxRelDeviationPct <= FAIL_PCT
      ? "warning"
      : "non-compliant";
  return {
    status,
    maxRelDeviationPct: round2(maxRelDeviationPct),
    deviations,
  };
}

// ─── Ingredient Order Compliance ───
// Checks how well a formula's ingredient composition matches the target
// ingredient order and percentages.
//
// Warnings are emitted when:
//  - A target ingredient is missing from the formula entirely.
//  - An ingredient has a targetPct and the formula's actual mass% deviates
//    by more than PCT_WARN_DIFF percentage points.
//  - The ingredient ranking by mass% in the formula does not match the
//    expected target order.

export interface IngredientOrderIssue {
  kind: "missing" | "pct-deviation" | "order-mismatch";
  ingredientId: string;
  ingredientName: string;
  // For pct-deviation:
  targetPct?: number;
  formulaPct?: number;
  // For order-mismatch: expected rank (1-based) vs actual rank
  expectedRank?: number;
  actualRank?: number;
}

export function checkIngredientOrderCompliance(
  lines: FormulaLine[],
  targetIngredients: TargetIngredient[],
  ingredients: Ingredient[]
): {
  status: "ok" | "warning";
  issues: IngredientOrderIssue[];
} {
  if (targetIngredients.length === 0) {
    return { status: "ok", issues: [] };
  }

  const PCT_WARN_DIFF = 5; // percentage-point deviation threshold

  const totalG = lines.reduce((s, l) => s + l.massG, 0);
  const ingById = new Map<string, Ingredient>(ingredients.map((i) => [i.id, i]));

  // Map formulaLine by ingredientId for quick lookup.
  const lineByIngId = new Map<string, FormulaLine>(
    lines.map((l) => [l.ingredientId, l])
  );

  const issues: IngredientOrderIssue[] = [];

  // ── 1. Missing / percentage deviation ──
  for (const ti of targetIngredients) {
    const ing = ingById.get(ti.ingredientId);
    const name = ing?.name ?? ti.ingredientId;
    const line = lineByIngId.get(ti.ingredientId);

    if (!line) {
      issues.push({ kind: "missing", ingredientId: ti.ingredientId, ingredientName: name });
      continue;
    }

    if (ti.targetPct !== undefined && totalG > 0) {
      const formulaPct = round2((line.massG / totalG) * 100);
      const diff = Math.abs(formulaPct - ti.targetPct);
      if (diff > PCT_WARN_DIFF) {
        issues.push({
          kind: "pct-deviation",
          ingredientId: ti.ingredientId,
          ingredientName: name,
          targetPct: ti.targetPct,
          formulaPct,
        });
      }
    }
  }

  // ── 2. Order mismatch ──
  // Sort formula lines by descending mass (as on a label) and compare
  // against the target ingredient order.
  if (totalG > 0 && targetIngredients.length > 1) {
    // Only consider target ingredients that are present in the formula.
    const presentTargetIds = targetIngredients
      .map((ti) => ti.ingredientId)
      .filter((id) => lineByIngId.has(id));

    // Actual order: target ingredient IDs sorted by descending mass in formula.
    const actualOrder = [...presentTargetIds].sort((a, b) => {
      const mA = lineByIngId.get(a)?.massG ?? 0;
      const mB = lineByIngId.get(b)?.massG ?? 0;
      return mB - mA;
    });

    for (let i = 0; i < presentTargetIds.length; i++) {
      if (actualOrder[i] !== presentTargetIds[i]) {
        const actualId = actualOrder[i];
        const actualName = ingById.get(actualId)?.name ?? actualId;
        // Report order mismatch for the ingredient that is out of place.
        // To avoid duplicate reports, only report the first mismatch.
        const alreadyReported = issues.some(
          (iss) => iss.kind === "order-mismatch" && iss.ingredientId === actualId
        );
        if (!alreadyReported) {
          issues.push({
            kind: "order-mismatch",
            ingredientId: actualId,
            ingredientName: actualName,
            expectedRank: presentTargetIds.indexOf(actualId) + 1,
            actualRank: i + 1,
          });
        }
        break; // report first mismatch only to keep noise low
      }
    }
  }

  return {
    status: issues.length === 0 ? "ok" : "warning",
    issues,
  };
}
export function rankTrials(
  trials: Trial[],
  formulas: Formula[],
  ingredients: Ingredient[],
  target: TargetProduct
): {
  trialId: string;
  compositionScore: number;
  outcomeScore: number;
  combinedScore: number;
}[] {
  return trials
    .filter((t) => t.status === "completed")
    .map((t) => {
      const formula = formulas.find((f) => f.id === t.formulaId);
      let compositionScore = 0;
      if (formula) {
        const calc = calculateFormulaNutrition(
          formula.ingredientLines,
          ingredients,
          target.targetNutrition
        );
        compositionScore = nutritionSimilarity(calc, target.targetNutrition);
      }
      const outcomeScore = calculateSimilarityScore(t);
      const combinedScore = round2(compositionScore * 0.4 + outcomeScore * 0.6);
      return { trialId: t.id, compositionScore, outcomeScore, combinedScore };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}
