"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
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
} from "./types";
import { createSeedData } from "./seed";
import {
  calculateFormulaComponents,
  calculateMassBalance,
} from "./solver";

const STORAGE_KEY = "recipe-reverse-eng-project";

function loadData(): ProjectData {
  if (typeof window === "undefined") return createSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProjectData;
  } catch {
    /* ignore */
  }
  const seed = createSeedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveData(data: ProjectData) {
  if (typeof window === "undefined") return;
  const updated = {
    ...data,
    project: { ...data.project, updatedAt: new Date().toISOString() },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
  // Utilities
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetToSeed: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProjectData>(loadData);
  const [loaded] = useState(() => typeof window !== "undefined");

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
      const recalc = recalcFormulaObj(f, data.ingredients);
      persist({ ...data, formulas: [...data.formulas, recalc] });
    },
    [data, persist]
  );
  const updateFormula = useCallback(
    (f: Formula) => {
      const recalc = recalcFormulaObj(f, data.ingredients);
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
      const recalc = recalcFormulaObj(f, data.ingredients);
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

  // ─── Import / Export ───
  const exportJSON = useCallback(() => JSON.stringify(data, null, 2), [data]);
  const importJSON = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as ProjectData;
        if (!parsed.project || !parsed.ingredients) return false;
        persist(parsed);
        return true;
      } catch {
        return false;
      }
    },
    [persist]
  );
  const resetToSeed = useCallback(() => {
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
        exportJSON,
        importJSON,
        resetToSeed,
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
function recalcFormulaObj(f: Formula, ingredients: Ingredient[]): Formula {
  const components = calculateFormulaComponents(f.ingredientLines, ingredients);
  const massBalance = calculateMassBalance(f.ingredientLines, f.targetMassG);
  return {
    ...f,
    calculatedComponents: components,
    massBalance,
    updatedAt: new Date().toISOString(),
  };
}
