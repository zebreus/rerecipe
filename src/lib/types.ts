// ─── Core Data Types for RErecipe Suite ───

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObservedAttributes {
  texture: string[];
  flavor: string[];
  color: string[];
  packaging: string[];
}

// ─── Nutritional Values ───
// Each nutritional value is identified by its `name` (the id/key within a
// project's target). The `unit` is a short unit specifier like "kcal" or "g".
// `per100g` is the value per 100 g of the substance (the target product, or
// an ingredient).
export interface NutritionalValue {
  name: string;
  unit: string;
  per100g: number;
}

// Default target nutritional values, based on the German "Nährwertangaben"
// standard (translated to English). Used when creating a new project.
export const DEFAULT_TARGET_NUTRITION: NutritionalValue[] = [
  { name: "Energy", unit: "kcal", per100g: 0 },
  { name: "Fat", unit: "g", per100g: 0 },
  { name: "Saturated Fat", unit: "g", per100g: 0 },
  { name: "Carbohydrates", unit: "g", per100g: 0 },
  { name: "Sugar", unit: "g", per100g: 0 },
  { name: "Protein", unit: "g", per100g: 0 },
  { name: "Fibre", unit: "g", per100g: 0 },
  { name: "Salt", unit: "g", per100g: 0 },
];

// Common nutritional value names offered when adding a new entry. Chosen so
// they line up with the names used in the quick-add ingredient presets.
export const COMMON_NUTRITION_OPTIONS: { name: string; unit: string }[] = [
  { name: "Energy", unit: "kcal" },
  { name: "Fat", unit: "g" },
  { name: "Saturated Fat", unit: "g" },
  { name: "Carbohydrates", unit: "g" },
  { name: "Sugar", unit: "g" },
  { name: "Protein", unit: "g" },
  { name: "Fibre", unit: "g" },
  { name: "Salt", unit: "g" },
  { name: "Water", unit: "g" },
  { name: "Starch", unit: "g" },
  { name: "Sodium", unit: "mg" },
  { name: "Cholesterol", unit: "mg" },
];

// Common units offered when adding a new entry.
export const COMMON_NUTRITION_UNITS = ["g", "mg", "µg", "kcal", "kJ"] as const;

// Color palette for nutritional values; assigned deterministically by name
// so the same nutrient gets the same color across the app.
const NUTRITION_COLOR_PALETTE = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#6b7280", // gray
  "#ec4899", // pink
  "#a3a3a3", // neutral
  "#0ea5e9", // sky
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
];

export function nutritionColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return NUTRITION_COLOR_PALETTE[hash % NUTRITION_COLOR_PALETTE.length];
}

export interface TargetProduct {
  name: string;
  description: string;
  targetMassG: number;
  targetVolumeMl: number;
  observedAttributes: ObservedAttributes;
  // Editable list of tracked nutritional values (the project's source of
  // truth for which nutrients are relevant). Indexed by `name`.
  targetNutrition: NutritionalValue[];
}

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  density_g_ml: number;
  // Nutritional values per 100 g of the ingredient, keyed by the
  // nutritional value name. Only entries whose name is also tracked by the
  // target are considered/shown elsewhere in the app.
  nutrition: Record<string, number>;
  source: string;
  confidence: number; // 0–1
  costPerKg: number;
  substitutions: string[];
  constraints: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormulaLine {
  ingredientId: string;
  massG: number;
  locked: boolean;
  minG?: number;
  maxG?: number;
}

export interface MassBalance {
  totalInputG: number;
  totalOutputG: number;
  lossG: number;
  lossPct: number;
  waterAdjustmentG: number;
}

// Calculated nutrition for a formula, expressed per 100 g of formula mass,
// keyed by nutritional value name. Only the names tracked by the target
// are populated.
export type CalculatedNutrition = Record<string, number>;

export interface Formula {
  id: string;
  name: string;
  description: string;
  version: number;
  targetMassG: number;
  ingredientLines: FormulaLine[];
  // Per-100g nutritional values for the formula, keyed by nutrient name.
  calculatedNutrition: CalculatedNutrition;
  totalMassG: number;
  massBalance: MassBalance;
  confidence: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProtocolCategory =
  | "hot-fill"
  | "batch-cook"
  | "prehydrate-cook"
  | "inline-hydrocolloid"
  | "staged-sugar"
  | "staged-dairy"
  | "shear-first"
  | "heat-first"
  | "custom";

export type ContainerType = "pot" | "bowl" | "jar" | "pitcher" | "pressure-cooker" | "pan" | "other";

export interface ProtocolContainer {
  id: string;
  name: string;
  type: ContainerType;
  capacityMl?: number;
  notes?: string;
}

export interface IngredientAddition {
  ingredientId: string;
  massG: number;
  containerId?: string;
}

export type StepDurationType = "fixed" | "after-event" | "user-confirm";

export interface StepDuration {
  type: StepDurationType;
  durationMin?: number;       // for "fixed": total duration; for "after-event": duration AFTER the event
  eventDescription?: string;  // for "after-event": e.g. "pot reaches 85°C"
}

export interface TrialStepLog {
  stepId: string;
  startedAt: string | null;   // ISO timestamp when step actually started
  completedAt: string | null; // ISO timestamp when step was completed
  durationActualSec: number | null;
  notes: string;
}

export interface ContainerState {
  containerId: string;
  temperatureC: number | null;
  agitation: "none" | "low" | "medium" | "high";
  contents: string[];  // ingredient IDs currently in this container
  notes: string;
}

export interface ProtocolStep {
  id: string;
  order: number;
  name: string;
  description: string;
  // Primary container for this step
  containerId: string | null;
  temperatureC: number | null;
  // Structured duration (replaces durationMin)
  duration: StepDuration;
  // Per-container agitation (containerId -> level)
  containerAgitation: Record<string, "none" | "low" | "medium" | "high">;
  // Ingredient additions with amount and target container
  additions: IngredientAddition[];
  holdConditions: string;
  expectedEffects: string[];
  requiresStartConfirmation: boolean;
  // Backward-compat with old saved data (optional):
  durationMin?: number | null;
  agitationLevel?: "none" | "low" | "medium" | "high";
  additionIngredients?: string[];
}

export interface Protocol {
  id: string;
  name: string;
  category: ProtocolCategory;
  description: string;
  version: number;
  containers: ProtocolContainer[];
  steps: ProtocolStep[];
  expectedEffects: string[];
  riskFlags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrialObservation {
  category: string;
  value: string;
  timestamp: string;
  stepId?: string; // optional: links observation to a specific protocol step
}

export interface TrialMeasurement {
  name: string;
  value: number;
  unit: string;
}

export interface ScoringDimension {
  name: string;
  score: number; // 0–10
  weight: number; // 0–1
  notes: string;
}

export interface Trial {
  id: string;
  formulaId: string;
  protocolId: string;
  runNumber: number;
  status: "planned" | "in-progress" | "completed" | "failed" | "abandoned";
  actualParameters: Record<string, string>;
  observations: TrialObservation[];
  measurements: TrialMeasurement[];
  scores: ScoringDimension[];
  similarityScore: number; // 0–100
  attachmentIds: string[];
  notes: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  stepLogs: TrialStepLog[];      // per-step timing log
  containerStates: ContainerState[]; // current container states during trial
}

export interface ScoringProfile {
  id: string;
  name: string;
  dimensions: { name: string; weight: number }[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  linkedTo: { entityType: string; entityId: string }[];
  notes: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  linkedTo: { entityType: string; entityId: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  showDensityColumn: boolean;
  showCostColumn: boolean;
  showCategoryColumn: boolean;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  showDensityColumn: false,
  showCostColumn: false,
  showCategoryColumn: false,
};

export interface ProjectData {
  project: Project;
  targetProduct: TargetProduct;
  ingredients: Ingredient[];
  formulas: Formula[];
  protocols: Protocol[];
  trials: Trial[];
  scoringProfiles: ScoringProfile[];
  attachments: Attachment[];
  notes: Note[];
  settings: ProjectSettings;
}

export const SCORING_DIMENSION_DEFAULTS = [
  "Viscosity",
  "Spoonability",
  "Grain Softness",
  "Creaminess",
  "Phase Separation",
  "Sweetness Balance",
  "Aroma Match",
  "Aftertaste",
  "Appearance",
];

export const INGREDIENT_CATEGORIES = [
  "Dairy",
  "Sugar & Sweetener",
  "Fat & Oil",
  "Starch",
  "Hydrocolloid",
  "Protein",
  "Flavor",
  "Color",
  "Preservative",
  "Acid",
  "Salt",
  "Water",
  "Grain",
  "Fruit",
  "Other",
];
