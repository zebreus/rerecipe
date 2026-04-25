"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  ProjectData,
  Ingredient,
  Formula,
  Protocol,
  Trial,
  TargetProduct,
  Note,
  Attachment,
  ScoringProfile,
  ProjectSettings,
} from "./types";
import { DEFAULT_PROJECT_SETTINGS } from "./types";
import { createSeedData, createDefaultProjectData } from "./seed";
import {
  calculateFormulaNutrition,
  calculateMassBalance,
  totalFormulaMassG,
} from "./solver";

const STORAGE_KEY = "recipe-reverse-eng-project";

function normalizeProjectData(
  data: Omit<ProjectData, "settings"> & {
    settings?: Partial<ProjectSettings>;
  }
): ProjectData {
  return {
    ...data,
    settings: {
      ...DEFAULT_PROJECT_SETTINGS,
      ...data.settings,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidTargetNutritionEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.unit === "string" &&
    isFiniteNumber(value.per100g)
  );
}

// Returns true if `parsed` looks like the current schema (new flexible
// nutritional values model). Old pre-refactor data is rejected so we
// don't need a migration path.
function isCurrentSchema(parsed: unknown): boolean {
  if (!isRecord(parsed)) return false;
  if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.formulas)) {
    return false;
  }
  const targetProduct = parsed.targetProduct;
  if (!isRecord(targetProduct)) return false;
  const targetNutrition = targetProduct.targetNutrition;
  if (!Array.isArray(targetNutrition)) return false;
  return targetNutrition.every(isValidTargetNutritionEntry);
}

function loadData(): ProjectData {
  if (typeof window === "undefined") return createDefaultProjectData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isCurrentSchema(parsed)) {
        return normalizeProjectData(
          parsed as Omit<ProjectData, "settings"> & {
            settings?: Partial<ProjectSettings>;
          }
        );
      }
      // Old/incompatible data: drop it and start fresh (no migration path).
    }
  } catch {
    /* ignore */
  }
  const seed = createDefaultProjectData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveData(data: ProjectData) {
  if (typeof window === "undefined") return;
  const updated = normalizeProjectData({
    ...data,
    project: { ...data.project, updatedAt: new Date().toISOString() },
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.error("Storage quota exceeded. Please export your project data and use Settings → Reset to free space.");
    } else {
      console.error("Failed to save project data to localStorage:", e);
    }
  }
}

interface StoreContextValue {
  data: ProjectData;
  // Project
  updateProject: (name: string) => void;
  // Target
  updateTarget: (target: TargetProduct) => void;
  // Ingredients
  addIngredient: (ing: Ingredient) => void;
  updateIngredient: (ing: Ingredient) => void;
  deleteIngredient: (id: string) => void;
  // Formulas
  addFormula: (f: Formula) => void;
  addFormulas: (formulas: Formula[]) => void;
  updateFormula: (f: Formula) => void;
  deleteFormula: (id: string) => void;
  recalcFormula: (id: string) => void;
  // Protocols
  addProtocol: (p: Protocol) => void;
  updateProtocol: (p: Protocol) => void;
  deleteProtocol: (id: string) => void;
  // Trials
  addTrial: (t: Trial) => void;
  updateTrial: (t: Trial) => void;
  deleteTrial: (id: string) => void;
  // Notes
  addNote: (n: Note) => void;
  updateNote: (n: Note) => void;
  deleteNote: (id: string) => void;
  // Attachments
  addAttachment: (a: Attachment) => void;
  deleteAttachment: (id: string) => void;
  // Scoring Profiles
  updateScoringProfiles: (profiles: ScoringProfile[]) => void;
  // Project Settings
  updateSettings: (settings: ProjectSettings) => void;
  // Utilities
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetToEmptyProject: () => void;
  loadExampleData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProjectData>(() => createDefaultProjectData());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = loadData();
    setData(stored);
    setLoaded(true);
  }, []);

  const persist = useCallback((next: ProjectData) => {
    setData(next);
    saveData(next);
  }, []);

  const updateProject = useCallback(
    (name: string) => {
      persist({ ...data, project: { ...data.project, name } });
    },
    [data, persist]
  );

  const updateTarget = useCallback(
    (target: TargetProduct) => {
      persist({ ...data, targetProduct: target });
    },
    [data, persist]
  );

  // ─── Ingredients ───
  const addIngredient = useCallback(
    (ing: Ingredient) => {
      persist({ ...data, ingredients: [...data.ingredients, ing] });
    },
    [data, persist]
  );
  const updateIngredient = useCallback(
    (ing: Ingredient) => {
      persist({
        ...data,
        ingredients: data.ingredients.map((i) => (i.id === ing.id ? ing : i)),
      });
    },
    [data, persist]
  );
  const deleteIngredient = useCallback(
    (id: string) => {
      persist({
        ...data,
        ingredients: data.ingredients.filter((i) => i.id !== id),
      });
    },
    [data, persist]
  );

  // ─── Formulas ───
  const addFormula = useCallback(
    (f: Formula) => {
      const recalc = recalcFormulaObj(f, data.ingredients, data.targetProduct);
      persist({ ...data, formulas: [...data.formulas, recalc] });
    },
    [data, persist]
  );
  const addFormulas = useCallback(
    (formulas: Formula[]) => {
      const recalced = formulas.map((f) => recalcFormulaObj(f, data.ingredients, data.targetProduct));
      persist({ ...data, formulas: [...data.formulas, ...recalced] });
    },
    [data, persist]
  );
  const updateFormula = useCallback(
    (f: Formula) => {
      const recalc = recalcFormulaObj(f, data.ingredients, data.targetProduct);
      persist({
        ...data,
        formulas: data.formulas.map((x) => (x.id === recalc.id ? recalc : x)),
      });
    },
    [data, persist]
  );
  const deleteFormula = useCallback(
    (id: string) => {
      persist({ ...data, formulas: data.formulas.filter((f) => f.id !== id) });
    },
    [data, persist]
  );
  const recalcFormula = useCallback(
    (id: string) => {
      const f = data.formulas.find((x) => x.id === id);
      if (!f) return;
      const recalc = recalcFormulaObj(f, data.ingredients, data.targetProduct);
      persist({
        ...data,
        formulas: data.formulas.map((x) => (x.id === id ? recalc : x)),
      });
    },
    [data, persist]
  );

  // ─── Protocols ───
  const addProtocol = useCallback(
    (p: Protocol) => {
      persist({ ...data, protocols: [...data.protocols, p] });
    },
    [data, persist]
  );
  const updateProtocol = useCallback(
    (p: Protocol) => {
      persist({
        ...data,
        protocols: data.protocols.map((x) => (x.id === p.id ? p : x)),
      });
    },
    [data, persist]
  );
  const deleteProtocol = useCallback(
    (id: string) => {
      persist({
        ...data,
        protocols: data.protocols.filter((p) => p.id !== id),
      });
    },
    [data, persist]
  );

  // ─── Trials ───
  const addTrial = useCallback(
    (t: Trial) => {
      persist({ ...data, trials: [...data.trials, t] });
    },
    [data, persist]
  );
  const updateTrial = useCallback(
    (t: Trial) => {
      persist({
        ...data,
        trials: data.trials.map((x) => (x.id === t.id ? t : x)),
      });
    },
    [data, persist]
  );
  const deleteTrial = useCallback(
    (id: string) => {
      persist({ ...data, trials: data.trials.filter((t) => t.id !== id) });
    },
    [data, persist]
  );

  // ─── Notes ───
  const addNote = useCallback(
    (n: Note) => {
      persist({ ...data, notes: [...data.notes, n] });
    },
    [data, persist]
  );
  const updateNote = useCallback(
    (n: Note) => {
      persist({
        ...data,
        notes: data.notes.map((x) => (x.id === n.id ? n : x)),
      });
    },
    [data, persist]
  );
  const deleteNote = useCallback(
    (id: string) => {
      persist({ ...data, notes: data.notes.filter((n) => n.id !== id) });
    },
    [data, persist]
  );

  // ─── Attachments ───
  const addAttachment = useCallback(
    (a: Attachment) => {
      persist({ ...data, attachments: [...data.attachments, a] });
    },
    [data, persist]
  );
  const deleteAttachment = useCallback(
    (id: string) => {
      persist({
        ...data,
        attachments: data.attachments.filter((a) => a.id !== id),
      });
    },
    [data, persist]
  );

  // ─── Scoring Profiles ───
  const updateScoringProfiles = useCallback(
    (profiles: ScoringProfile[]) => {
      persist({ ...data, scoringProfiles: profiles });
    },
    [data, persist]
  );

  // ─── Project Settings ───
  const updateSettings = useCallback(
    (settings: ProjectSettings) => {
      persist({ ...data, settings });
    },
    [data, persist]
  );

  // ─── Import / Export ───
  const exportJSON = useCallback(() => JSON.stringify(data, null, 2), [data]);
  const importJSON = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json);
        if (!isCurrentSchema(parsed)) return false;
        const typed = parsed as Omit<ProjectData, "settings"> & {
          settings?: Partial<ProjectSettings>;
        };
        if (!typed.project || !typed.ingredients) return false;
        persist(normalizeProjectData(typed));
        return true;
      } catch {
        return false;
      }
    },
    [persist]
  );
  const resetToEmptyProject = useCallback(() => {
    persist(createDefaultProjectData());
  }, [persist]);
  const loadExampleData = useCallback(() => {
    persist(createSeedData());
  }, [persist]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading project…</p>
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        data,
        updateProject,
        updateTarget,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        addFormula,
        addFormulas,
        updateFormula,
        deleteFormula,
        recalcFormula,
        addProtocol,
        updateProtocol,
        deleteProtocol,
        addTrial,
        updateTrial,
        deleteTrial,
        addNote,
        updateNote,
        deleteNote,
        addAttachment,
        deleteAttachment,
        updateScoringProfiles,
        updateSettings,
        exportJSON,
        importJSON,
        resetToEmptyProject,
        loadExampleData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ─── Internal helpers ───
function recalcFormulaObj(
  f: Formula,
  ingredients: Ingredient[],
  target: ProjectData["targetProduct"]
): Formula {
  const calculatedNutrition = calculateFormulaNutrition(
    f.ingredientLines,
    ingredients,
    target.targetNutrition
  );
  const massBalance = calculateMassBalance(f.ingredientLines, f.targetMassG);
  return {
    ...f,
    calculatedNutrition,
    totalMassG: totalFormulaMassG(f.ingredientLines),
    massBalance,
    updatedAt: new Date().toISOString(),
  };
}
