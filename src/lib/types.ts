// ─── Core Data Types for Recipe Reverse Engineering Suite ───

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

export interface TargetProduct {
  name: string;
  description: string;
  targetMassG: number;
  targetVolumeMl: number;
  observedAttributes: ObservedAttributes;
  targetComposition: ComponentComposition;
}

export interface ComponentComposition {
  water_pct: number;
  fat_pct: number;
  protein_pct: number;
  sugar_pct: number;
  starch_pct: number;
  salt_pct: number;
  hydrocolloid_pct: number;
  other_pct: number;
}

export const EMPTY_COMPOSITION: ComponentComposition = {
  water_pct: 0,
  fat_pct: 0,
  protein_pct: 0,
  sugar_pct: 0,
  starch_pct: 0,
  salt_pct: 0,
  hydrocolloid_pct: 0,
  other_pct: 0,
};

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  density_g_ml: number;
  composition: ComponentComposition;
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

export interface CalculatedComponents {
  water_g: number;
  fat_g: number;
  protein_g: number;
  sugar_g: number;
  starch_g: number;
  salt_g: number;
  hydrocolloid_g: number;
  other_g: number;
  total_g: number;
}

export interface Formula {
  id: string;
  name: string;
  description: string;
  version: number;
  targetMassG: number;
  ingredientLines: FormulaLine[];
  calculatedComponents: CalculatedComponents;
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

export interface ProtocolStep {
  id: string;
  order: number;
  name: string;
  description: string;
  temperatureC: number | null;
  durationMin: number | null;
  agitationLevel: "none" | "low" | "medium" | "high";
  additionIngredients: string[]; // ingredient IDs
  holdConditions: string;
  expectedEffects: string[];
}

export interface Protocol {
  id: string;
  name: string;
  category: ProtocolCategory;
  description: string;
  version: number;
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
}

// ─── Component keys helper ───
export const COMPONENT_KEYS = [
  "water_pct",
  "fat_pct",
  "protein_pct",
  "sugar_pct",
  "starch_pct",
  "salt_pct",
  "hydrocolloid_pct",
  "other_pct",
] as const;

export const COMPONENT_LABELS: Record<string, string> = {
  water_pct: "Water",
  fat_pct: "Fat",
  protein_pct: "Protein",
  sugar_pct: "Sugar",
  starch_pct: "Starch",
  salt_pct: "Salt",
  hydrocolloid_pct: "Hydrocolloid",
  other_pct: "Other",
};

export const COMPONENT_COLORS: Record<string, string> = {
  water_pct: "#3b82f6",
  fat_pct: "#f59e0b",
  protein_pct: "#ef4444",
  sugar_pct: "#8b5cf6",
  starch_pct: "#10b981",
  salt_pct: "#6b7280",
  hydrocolloid_pct: "#ec4899",
  other_pct: "#a3a3a3",
};

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
