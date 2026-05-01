"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Lock,
  Unlock,
  TestTube,
  AlertTriangle,
  Play,
  ArrowUp,
  ArrowDown,
  Wand2,
  Settings2,
  EyeOff,
  Eye,
  Sliders,
} from "lucide-react";
import type {
  Formula,
  FormulaLine,
  Trial,
  SolverSettings,
} from "@/lib/types";
import { nutritionColor, DEFAULT_SOLVER_SETTINGS } from "@/lib/types";
import {
  calculateFormulaNutrition,
  calculateMassBalance,
  nutritionSimilarity,
  ingredientContributions,
  checkCompliance,
  checkIngredientOrderCompliance,
  totalFormulaMassG,
  runFormulaOptimizer,
} from "@/lib/solver";
import { Badge } from "@/components/ui/badge";
import { generateId, statusColor } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Thresholds used when colour-coding nutrition deviations from target.
const DEVIATION_LOW_PCT = 10; // ≤ this → green (no warning)
const DEVIATION_HIGH_PCT = 25; // > this → red (hard warning)
// Minimum denominator to avoid division-by-zero in relative-error calculations.
const MIN_DEVIATION_DENOM = 1e-3;
// Mass tolerance (g) below which the formula total is considered to match.
const MASS_TOLERANCE_G = 0.05;
// Composition match (%) below this raises a "match too low" warning.
const COMPOSITION_MATCH_WARN = 90;
// Redistribution is iterative because one bounded line can hit min/max and
// leave remaining mass to distribute over the others.
const MAX_REDISTRIBUTION_PASSES = 20;
const REDISTRIBUTION_EPS = 1e-8;

// ─── Issue / warning types for the unified Issues card ───
type Severity = "warning" | "error";
interface Issue {
  key: string;        // stable id, used for ignore list
  severity: Severity;
  text: React.ReactNode;
}

export default function FormulaDetailClient({ id }: { id: string }) {
  const { data, updateFormula, addTrial } = useStore();
  const router = useRouter();

  const formula = data.formulas.find((f) => f.id === id);
  const [local, setLocal] = useState<Formula | null>(formula ? { ...formula } : null);
  const [dirty, setDirty] = useState(false);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [newTrialProtocolId, setNewTrialProtocolId] = useState("");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [constraintLineIdx, setConstraintLineIdx] = useState<number | null>(null);

  const relatedTrials = data.trials.filter((t) => t.formulaId === id);
  const hasTrials = relatedTrials.length > 0;
  const showCostColumn = data.settings.showCostColumn;

  if (!local || !formula) {
    return (
      <div className="space-y-4">
        <Link href="/formulas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <p className="text-gray-500 dark:text-gray-400">Formula not found.</p>
      </div>
    );
  }

  const ingredients = data.ingredients;
  // Target mass is now a target-product setting, not a per-formula setting.
  const targetMassG = data.targetProduct.targetMassG;
  const trackedNutrients = data.targetProduct.targetNutrition;
  const targetIngredients = data.targetProduct.targetIngredients ?? [];
  const solverSettings: SolverSettings = {
    ...DEFAULT_SOLVER_SETTINGS,
    ...(local.solverSettings ?? {}),
  };
  const ignoredWarnings = local.ignoredWarnings ?? [];

  function handleSaveClick() {
    if (hasTrials) setConfirmSaveOpen(true);
    else save();
  }
  function save() {
    if (!local) return;
    updateFormula({ ...local, version: local.version + 1 });
    setLocal({ ...local, version: local.version + 1 });
    setDirty(false);
    setConfirmSaveOpen(false);
  }

  function createTrialAndNavigate(mode?: "run") {
    if (!newTrialProtocolId || !local) return;
    const now = new Date().toISOString();
    const runNumber = data.trials.filter((t) => t.formulaId === local.id).length + 1;
    const t: Trial = {
      id: generateId(),
      formulaId: local.id,
      protocolId: newTrialProtocolId,
      runNumber,
      status: "planned",
      actualParameters: {},
      observations: [],
      measurements: [],
      scores: data.scoringProfiles[0]?.dimensions.map((d) => ({
        name: d.name, score: 0, weight: d.weight, notes: "",
      })) || [],
      similarityScore: 0,
      attachmentIds: [],
      notes: "",
      startedAt: "",
      completedAt: "",
      createdAt: now,
      updatedAt: now,
      stepLogs: [],
      containerStates: [],
    };
    addTrial(t);
    setTrialDialogOpen(false);
    setNewTrialProtocolId("");
    router.push(mode === "run" ? `/trials?id=${t.id}&mode=run` : `/trials?id=${t.id}`);
  }

  function update(partial: Partial<Formula>) {
    if (!local) return;
    setLocal({ ...local, ...partial });
    setDirty(true);
  }

  function addLine() {
    if (ingredients.length === 0) return;
    const used = new Set(local!.ingredientLines.map((l) => l.ingredientId));
    const available = ingredients.find((i) => !used.has(i.id));
    if (!available) return;
    update({
      ingredientLines: [
        ...local!.ingredientLines,
        { ingredientId: available.id, massG: 10, locked: false },
      ],
    });
  }

  function lineBounds(line: FormulaLine): { min: number; max: number } {
    const min = Math.max(0, line.minG ?? 0);
    const rawMax = line.maxG ?? Infinity;
    // Keep malformed persisted or edited ranges usable: if maxG < minG,
    // treat max as equal to min so controls and redistribution never receive
    // an invalid range.
    return { min, max: Math.max(min, rawMax) };
  }

  function clampLineMass(line: FormulaLine, mass: number): number {
    const { min, max } = lineBounds(line);
    return Math.max(min, Math.min(max, Number.isFinite(mass) ? mass : min));
  }

  /**
   * Applies `remainingChange` across `adjustableIndexes` while respecting each
   * line's min/max bounds. Positive values grow the adjustable lines; negative
   * values shrink them. The loop repeats because a line may hit a bound and
   * leave the rest of the change to distribute over the remaining slack.
   */
  function distributeAcrossBoundedLines(
    masses: number[],
    adjustableIndexes: number[],
    remainingChange: number
  ): number[] {
    const next = [...masses];
    let remaining = remainingChange;

    for (let pass = 0; pass < MAX_REDISTRIBUTION_PASSES && Math.abs(remaining) > REDISTRIBUTION_EPS; pass++) {
      const candidates = adjustableIndexes.filter((i) => {
        const { min, max } = lineBounds(local!.ingredientLines[i]);
        return remaining > 0 ? next[i] < max - REDISTRIBUTION_EPS : next[i] > min + REDISTRIBUTION_EPS;
      });
      // Early exit: no remaining line has capacity to accept the change.
      if (candidates.length === 0) break;

      const weights = candidates.map((i) => Math.max(next[i], 1));
      const totalWeight = weights.reduce((s, w) => s + w, 0);
      let applied = 0;

      candidates.forEach((i, idx) => {
        const { min, max } = lineBounds(local!.ingredientLines[i]);
        const desired = remaining * (weights[idx] / totalWeight);
        const actual = remaining > 0
          ? Math.min(desired, max - next[i])
          : Math.max(desired, min - next[i]);
        next[i] += actual;
        applied += actual;
      });

      // Early exit: numerical precision left us unable to make progress.
      if (Math.abs(applied) < REDISTRIBUTION_EPS) break;
      remaining -= applied;
    }

    return next;
  }

  // Mass-preserving slider behaviour. When `local.lockTotalMass` is true,
  // changing one line's mass proportionally rescales the other unlocked
  // lines so the overall total stays constant. The line being changed and
  // any locked line is excluded from rescaling.
  function setLineMass(index: number, newMass: number) {
    const lines = local!.ingredientLines;
    const oldMass = lines[index].massG;
    const requestedMass = clampLineMass(lines[index], newMass);

    if (!local!.lockTotalMass) {
      const updated = lines.map((l, i) =>
        i === index ? { ...l, massG: requestedMass } : l
      );
      update({ ingredientLines: updated });
      return;
    }

    const otherIndexes = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => i !== index && !l.locked)
      .map(({ i }) => i);
    const delta = requestedMass - oldMass;

    if (otherIndexes.length === 0 || Math.abs(delta) < 1e-8) {
      // Nothing to rescale against — just set the value.
      const updated = lines.map((l, i) =>
        i === index ? { ...l, massG: requestedMass } : l
      );
      update({ ingredientLines: updated });
      return;
    }

    const shrinkCapacity = otherIndexes.reduce((sum, i) => {
      const { min } = lineBounds(lines[i]);
      return sum + Math.max(0, lines[i].massG - min);
    }, 0);
    const growCapacity = otherIndexes.reduce((sum, i) => {
      const { max } = lineBounds(lines[i]);
      return sum + Math.max(0, max - lines[i].massG);
    }, 0);

    // If the edited line grows, other lines must shrink; if it shrinks, other
    // lines must grow. Bound the edited delta by the remaining capacity of the
    // other unlocked lines so the total can stay fixed without violating ranges.
    const safeDelta = delta > 0
      ? Math.min(delta, shrinkCapacity)
      : Math.max(delta, -growCapacity);
    const masses = lines.map((l) => l.massG);
    masses[index] = oldMass + safeDelta;
    const redistributed = distributeAcrossBoundedLines(masses, otherIndexes, -safeDelta);

    const updated = lines.map((l, i) => ({ ...l, massG: redistributed[i] }));
    update({ ingredientLines: updated });
  }

  function updateLine(index: number, partial: Partial<FormulaLine>) {
    const lines = local!.ingredientLines.map((l, i) =>
      i === index ? { ...l, ...partial } : l
    );
    update({ ingredientLines: lines });
  }

  function removeLine(index: number) {
    update({
      ingredientLines: local!.ingredientLines.filter((_, i) => i !== index),
    });
  }

  function moveLine(index: number, direction: "up" | "down") {
    const lines = [...local!.ingredientLines];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= lines.length) return;
    [lines[index], lines[swapIdx]] = [lines[swapIdx], lines[index]];
    update({ ingredientLines: lines });
  }

  // ─── Derived data ───
  const calc = calculateFormulaNutrition(local.ingredientLines, ingredients, trackedNutrients);
  const mb = calculateMassBalance(local.ingredientLines, targetMassG);
  const sim = nutritionSimilarity(calc, trackedNutrients);
  const contributions = ingredientContributions(local.ingredientLines, ingredients, trackedNutrients);
  const compliance = checkCompliance(calc, trackedNutrients);
  const orderCompliance = checkIngredientOrderCompliance(
    local.ingredientLines, targetIngredients, ingredients
  );

  const totalMass = local.ingredientLines.reduce((s, l) => s + l.massG, 0);

  // ─── Build the unified issues list (#5) ───
  // Computed inline (cheap; runs on every render) so this stays after the
  // early-return for "formula not found" without violating Hook ordering.
  const issues: Issue[] = (() => {
    const out: Issue[] = [];

    // Nutrition deviations above threshold.
    for (const d of compliance.deviations) {
      const sev: Severity = d.relDiffPct > DEVIATION_HIGH_PCT ? "error" : "warning";
      out.push({
        key: `nutrition:${d.name}`,
        severity: sev,
        text: (
          <span>
            <strong>{d.name}</strong>: {d.formulaVal.toFixed(2)} {d.unit} vs target{" "}
            {d.targetVal.toFixed(2)} {d.unit} (Δ {d.relDiffPct.toFixed(1)}%).
          </span>
        ),
      });
    }

    // Composition match too low.
    if (trackedNutrients.length > 0 && sim < COMPOSITION_MATCH_WARN) {
      out.push({
        key: "composition-match",
        severity: sim < 75 ? "error" : "warning",
        text: (
          <span>
            Composition match is <strong>{sim.toFixed(0)}%</strong>, below the {COMPOSITION_MATCH_WARN}% threshold.
          </span>
        ),
      });
    }

    // Mass deviation vs target.
    if (targetMassG > 0 && Math.abs(mb.lossG) > MASS_TOLERANCE_G) {
      out.push({
        key: "mass-deviation",
        severity: Math.abs(mb.lossPct) > 10 ? "error" : "warning",
        text: (
          <span>
            Total mass <strong>{totalMass.toFixed(1)} g</strong> deviates from
            target <strong>{targetMassG} g</strong> by {mb.lossG > 0 ? "+" : ""}
            {mb.lossG.toFixed(1)} g.
          </span>
        ),
      });
    }

    // Ingredient mass ordering vs ingredientLines order on this formula.
    for (let i = 0; i < local.ingredientLines.length - 1; i++) {
      const a = local.ingredientLines[i];
      const b = local.ingredientLines[i + 1];
      if (b.massG > a.massG + 1e-6) {
        const aName = ingredients.find((x) => x.id === a.ingredientId)?.name ?? "?";
        const bName = ingredients.find((x) => x.id === b.ingredientId)?.name ?? "?";
        out.push({
          key: `line-order:${a.ingredientId}:${b.ingredientId}`,
          severity: "warning",
          text: (
            <span>
              <strong>{bName}</strong> ({b.massG.toFixed(1)} g) is heavier than
              the line above it, <strong>{aName}</strong> ({a.massG.toFixed(1)} g).
              Either reorder the lines or rerun the solver.
            </span>
          ),
        });
      }
    }

    // Target-vs-formula ingredient list compliance (missing/extra/order).
    for (const iss of orderCompliance.issues) {
      if (iss.kind === "missing") {
        out.push({
          key: `target-missing:${iss.ingredientId}`,
          severity: "warning",
          text: (
            <span>
              <strong>{iss.ingredientName}</strong> is in the target ingredient list but missing from this formula.
            </span>
          ),
        });
      } else if (iss.kind === "order-mismatch") {
        out.push({
          key: `target-order:${iss.ingredientId}`,
          severity: "warning",
          text: (
            <span>
              <strong>{iss.ingredientName}</strong> is at rank #{iss.actualRank} by mass but the target expects it at rank #{iss.expectedRank}.
            </span>
          ),
        });
      } else if (iss.kind === "pct-deviation") {
        out.push({
          key: `target-pct:${iss.ingredientId}`,
          severity: "warning",
          text: (
            <span>
              <strong>{iss.ingredientName}</strong>: target {iss.targetPct?.toFixed(1)}% vs formula {iss.formulaPct?.toFixed(1)}%.
            </span>
          ),
        });
      }
    }

    // Extra ingredients in formula that aren't part of the target list.
    if (targetIngredients.length > 0) {
      const targetIds = new Set(targetIngredients.map((t) => t.ingredientId));
      for (const line of local.ingredientLines) {
        if (!targetIds.has(line.ingredientId)) {
          const name = ingredients.find((i) => i.id === line.ingredientId)?.name ?? "?";
          out.push({
            key: `target-extra:${line.ingredientId}`,
            severity: "warning",
            text: (
              <span>
                <strong>{name}</strong> is in this formula but not in the target ingredient list.
              </span>
            ),
          });
        }
      }
    }

    return out;
  })();

  const visibleIssues = issues.filter((i) => !ignoredWarnings.includes(i.key));
  const hiddenIssues = issues.filter((i) => ignoredWarnings.includes(i.key));

  function ignoreIssue(key: string) {
    update({
      ignoredWarnings: ignoredWarnings.includes(key)
        ? ignoredWarnings
        : [...ignoredWarnings, key],
    });
  }
  function unignoreIssue(key: string) {
    update({ ignoredWarnings: ignoredWarnings.filter((k) => k !== key) });
  }

  // ─── Derived viz data ───
  const heatmapData = contributions.map((c) => {
    const row: Record<string, number | string> = { name: c.ingredientName };
    for (const n of trackedNutrients) row[n.name] = c.values[n.name] ?? 0;
    return row;
  });

  function runSolver() {
    if (!local) return;
    const optimized = runFormulaOptimizer(
      local.ingredientLines,
      ingredients,
      trackedNutrients,
      targetMassG,
      {
        restarts: solverSettings.restarts,
        orderingWeight: solverSettings.orderingWeight,
        honorTotalMass: solverSettings.honorTotalMass,
      }
    );
    update({ ingredientLines: optimized });
  }

  function setSolverSetting<K extends keyof SolverSettings>(k: K, v: SolverSettings[K]) {
    update({ solverSettings: { ...solverSettings, [k]: v } });
  }

  // Slider max: prefer target mass when set, otherwise fall back to total or 100.
  const sliderMax = Math.max(targetMassG > 0 ? targetMassG : totalMass, totalMass, 100);

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/formulas">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to formulas">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{local.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              v{local.version} · {sim.toFixed(0)}% match
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setNewTrialProtocolId(""); setTrialDialogOpen(true); }}
          >
            <TestTube className="h-4 w-4 mr-1" /> Create Trial
          </Button>
          <Button onClick={handleSaveClick} disabled={!dirty}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{local.name}</h1>
        <p className="text-xs">v{local.version} · {sim.toFixed(0)}% match · target {targetMassG} g</p>
      </div>

      {/* Trial-reference banner */}
      {hasTrials && (
        <div className="rounded-md px-4 py-3 text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-2 print:hidden">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This formula is referenced by {relatedTrials.length} trial{relatedTrials.length !== 1 ? "s" : ""}. Editing it may affect trial data integrity.
          </span>
        </div>
      )}

      {/* Unified issues card (#5) */}
      <IssuesCard
        compliance={compliance}
        visibleIssues={visibleIssues}
        hiddenIssues={hiddenIssues}
        showHidden={showHidden}
        setShowHidden={setShowHidden}
        ignoreIssue={ignoreIssue}
        unignoreIssue={unignoreIssue}
      />

      {/* Builder grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Ingredient Lines</CardTitle>
              <div className="flex gap-2 print:hidden">
                <SolverButtonGroup
                  onRun={runSolver}
                  disabled={local.ingredientLines.length === 0}
                  trackedNutrientNames={trackedNutrients.map((n) => n.name)}
                  settings={solverSettings}
                  setSetting={setSolverSetting}
                />
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {local.ingredientLines.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No ingredients added yet.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Add ingredients, then click <strong>Run Solver</strong> to fit the target nutrition.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                        <th className="pb-2 font-medium">Ingredient</th>
                        <th className="pb-2 font-medium">Mass (g)</th>
                        {showCostColumn && <th className="pb-2 font-medium w-24">Cost ($)</th>}
                        <th className="pb-2 font-medium w-16 print:hidden">Lock</th>
                        <th className="pb-2 font-medium w-16 print:hidden">Order</th>
                        <th className="pb-2 font-medium w-12 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {local.ingredientLines.map((line, idx) => {
                        const ing = ingredients.find((i) => i.id === line.ingredientId);
                        const lineCost = ing ? (line.massG * ing.costPerKg) / 1000 : 0;
                        const hasConstraint = line.minG !== undefined || line.maxG !== undefined;
                        // Effective slider/input bounds — driven by per-line constraints
                        // when present, otherwise by the table's overall slider max.
                        const { min: effectiveMin, max: boundMax } = lineBounds(line);
                        const effectiveMax = Math.max(effectiveMin, Math.min(sliderMax, boundMax));
                        const sliderValue = Math.max(effectiveMin, Math.min(effectiveMax, line.massG));
                        return (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2 pr-2 w-40">
                              <Select
                                value={line.ingredientId}
                                onValueChange={(val) => updateLine(idx, { ingredientId: val })}
                              >
                                <SelectTrigger className="h-8 print:hidden">
                                  <SelectValue />
                                </SelectTrigger>
                                <span className="hidden print:block">
                                  {ing?.name ?? line.ingredientId}
                                </span>
                                <SelectContent>
                                  {ingredients.map((i) => (
                                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2">
                                <Slider
                                  min={effectiveMin}
                                  max={effectiveMax}
                                  step={0.1}
                                  value={[sliderValue]}
                                  onValueChange={([val]) => setLineMass(idx, val)}
                                  className="w-24 shrink-0 print:hidden"
                                  disabled={line.locked}
                                  thumbAriaLabel={`${ing?.name ?? "ingredient"} mass in grams`}
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  min={line.minG ?? 0}
                                  max={Number.isFinite(boundMax) ? boundMax : undefined}
                                  className="h-8 w-20 shrink-0 print:hidden"
                                  value={line.massG}
                                  onChange={(e) => setLineMass(idx, Number(e.target.value))}
                                  disabled={line.locked}
                                />
                                <span className="hidden print:block tabular-nums">
                                  {line.massG.toFixed(1)}
                                </span>
                                {hasConstraint && (
                                  <span
                                    className="text-[10px] text-gray-500 dark:text-gray-400 print:hidden"
                                    title={`Range: ${line.minG ?? 0}–${line.maxG ?? "∞"} g`}
                                  >
                                    {line.minG ?? 0}–{line.maxG ?? "∞"}
                                  </span>
                                )}
                              </div>
                            </td>
                            {showCostColumn && (
                              <td className="py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                                ${lineCost.toFixed(2)}
                              </td>
                            )}
                            <td className="py-2 print:hidden">
                              <div className="flex items-center justify-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label={line.locked ? `Unlock ${ing?.name ?? "ingredient"}` : `Lock ${ing?.name ?? "ingredient"}`}
                                  onClick={() => updateLine(idx, { locked: !line.locked })}
                                >
                                  {line.locked
                                    ? <Lock className="h-3.5 w-3.5 text-amber-600" />
                                    : <Unlock className="h-3.5 w-3.5 text-gray-400" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label={`Constrain ${ing?.name ?? "ingredient"} range`}
                                  title="Set min/max range"
                                  onClick={() => setConstraintLineIdx(idx)}
                                >
                                  <Sliders className={`h-3.5 w-3.5 ${hasConstraint ? "text-indigo-500" : "text-gray-400"}`} />
                                </Button>
                              </div>
                            </td>
                            <td className="py-2 print:hidden">
                              <div className="flex gap-0.5">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  aria-label="Move up" disabled={idx === 0}
                                  onClick={() => moveLine(idx, "up")}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  aria-label="Move down"
                                  disabled={idx === local.ingredientLines.length - 1}
                                  onClick={() => moveLine(idx, "down")}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                            <td className="py-2 print:hidden">
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-red-500 dark:text-red-400"
                                aria-label={`Remove ${ing?.name ?? "ingredient"}`}
                                onClick={() => removeLine(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2">
                            <span>Total</span>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 print:hidden"
                              aria-label={local.lockTotalMass ? "Unlock total mass" : "Lock total mass"}
                              title={local.lockTotalMass
                                ? "Total mass is locked: changing one slider rescales the others to preserve the total."
                                : "Lock total mass: when sliding, other unlocked ingredients are rescaled to preserve the total."}
                              onClick={() => update({ lockTotalMass: !local.lockTotalMass })}
                            >
                              {local.lockTotalMass
                                ? <Lock className="h-3.5 w-3.5 text-amber-600" />
                                : <Unlock className="h-3.5 w-3.5 text-gray-400" />}
                            </Button>
                          </div>
                        </td>
                        <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                          <span className={`${Math.abs(mb.lossG) > MASS_TOLERANCE_G ? (mb.lossG > 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400") : ""}`}>
                            {totalMass.toFixed(1)} g
                          </span>
                          {targetMassG > 0 && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {mb.lossG > MASS_TOLERANCE_G
                                ? `(+${mb.lossG.toFixed(1)} g vs target)`
                                : mb.lossG < -MASS_TOLERANCE_G
                                ? `(${mb.lossG.toFixed(1)} g vs target)`
                                : "(matches target)"}
                            </span>
                          )}
                        </td>
                        {showCostColumn && (
                          <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                            ${local.ingredientLines.reduce((sum, l) => {
                              const ing = ingredients.find((i) => i.id === l.ingredientId);
                              return sum + (ing ? (l.massG * ing.costPerKg) / 1000 : 0);
                            }, 0).toFixed(2)}
                          </td>
                        )}
                        <td className="print:hidden"></td>
                        <td className="print:hidden"></td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Heatmap moved below the ingredient lines (#6). */}
          {heatmapData.length > 0 && (
            <Card className="print:hidden">
              <CardHeader>
                <CardTitle className="text-base">Ingredient Contribution Heatmap (grams)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, heatmapData.length * 40 + 60)}>
                  <BarChart data={heatmapData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    {trackedNutrients.map((n) => (
                      <Bar key={n.name} dataKey={n.name} stackId="a" fill={nutritionColor(n.name)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Ingredient declaration (label-style); merged from former Label tab (#9). */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ingredient Declaration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {[...local.ingredientLines]
                  .sort((a, b) => b.massG - a.massG)
                  .map((line) => {
                    const ing = ingredients.find((i) => i.id === line.ingredientId);
                    return `${ing?.name ?? line.ingredientId} (${line.massG.toFixed(1)}g)`;
                  })
                  .join(", ") || "No ingredients added."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column: nutrition summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Calculated Nutrition (per 100&nbsp;g)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {trackedNutrients.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No nutritional values tracked. Configure them on the Target page.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    <span>Nutrient</span>
                    <span className="text-right">Value</span>
                    <span className="text-right">vs Target</span>
                  </div>
                  {trackedNutrients.map((n) => {
                    const formulaVal = calc[n.name] ?? 0;
                    const targetVal = n.per100g;
                    const diff = formulaVal - targetVal;
                    const denom = Math.max(Math.abs(targetVal), Math.abs(formulaVal), MIN_DEVIATION_DENOM);
                    const relPct = (Math.abs(diff) / denom) * 100;
                    const diffColor =
                      relPct <= DEVIATION_LOW_PCT ? "text-green-600 dark:text-green-400"
                      : relPct <= DEVIATION_HIGH_PCT ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400";
                    const diffSign = diff >= 0 ? "+" : "";
                    const pctSign = diff >= 0 ? "+" : "-";
                    return (
                      <div key={n.name} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nutritionColor(n.name) }} />
                          {n.name}
                        </span>
                        <span className="text-right tabular-nums">
                          {formulaVal.toFixed(2)}&nbsp;{n.unit}
                        </span>
                        <span className={`text-right tabular-nums text-xs ${diffColor}`}>
                          {targetVal === 0 && formulaVal === 0
                            ? "—"
                            : `${diffSign}${diff.toFixed(1)} (${pctSign}${relPct.toFixed(0)}%)`}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
              {/* Total mass row with deviation (#4) */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center border-t pt-1 font-medium">
                <span>Total Mass</span>
                <span className="text-right tabular-nums">
                  {totalFormulaMassG(local.ingredientLines).toFixed(1)} g
                </span>
                {targetMassG > 0 ? (
                  (() => {
                    const diff = totalMass - targetMassG;
                    const pct = (diff / targetMassG) * 100;
                    const sign = diff >= 0 ? "+" : "";
                    const color =
                      Math.abs(pct) <= 1 ? "text-green-600 dark:text-green-400"
                      : Math.abs(pct) <= 5 ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400";
                    return (
                      <span className={`text-right tabular-nums text-xs ${color}`}>
                        {Math.abs(diff) <= MASS_TOLERANCE_G
                          ? "—"
                          : `${sign}${diff.toFixed(1)} (${sign}${pct.toFixed(1)}%)`}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-right text-xs text-gray-400">no target</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {sim.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Composition Match</p>
              </div>
            </CardContent>
          </Card>

          {showCostColumn && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estimated Cost</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500 dark:text-gray-400">Total</span>
                  <span>
                    ${local.ingredientLines
                      .reduce((sum, line) => {
                        const ing = ingredients.find((i) => i.id === line.ingredientId);
                        return sum + (ing?.costPerKg ?? 0) * (line.massG / 1000);
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info section (no longer in a tab — was just metadata). */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Formula Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={local.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input type="number" value={local.version} readOnly />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={local.description} onChange={(e) => update({ description: e.target.value })} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={local.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Target mass is configured per project on the <Link href="/target" className="underline">Target</Link> page.
          </p>
        </CardContent>
      </Card>

      {/* Related Trials */}
      {relatedTrials.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">Related Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedTrials.map((trial) => {
                const trialProtocol = data.protocols.find((p) => p.id === trial.protocolId);
                return (
                  <div key={trial.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Link href={`/trials?id=${trial.id}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        Trial #{trial.runNumber}
                      </Link>
                      <Badge className={statusColor(trial.status)} variant="outline">
                        {trial.status}
                      </Badge>
                      {trialProtocol && (
                        <Link href={`/protocols?id=${trialProtocol.id}`}>
                          <Badge variant="secondary" className="text-xs hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                            {trialProtocol.name}
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {(trial.similarityScore || 0).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Constraint dialog (#3); keyed so internal form state resets per line */}
      <ConstraintDialog
        key={constraintLineIdx ?? "none"}
        line={constraintLineIdx !== null ? local.ingredientLines[constraintLineIdx] : null}
        ingredientName={
          constraintLineIdx !== null
            ? ingredients.find((i) => i.id === local.ingredientLines[constraintLineIdx].ingredientId)?.name ?? ""
            : ""
        }
        sliderMax={sliderMax}
        onClose={() => setConstraintLineIdx(null)}
        onSave={(min, max) => {
          if (constraintLineIdx === null) return;
          updateLine(constraintLineIdx, { minG: min, maxG: max });
          setConstraintLineIdx(null);
        }}
      />

      {/* Create Trial Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trial</DialogTitle>
            <DialogDescription>
              Create a new trial for &quot;{local.name}&quot;. Select a protocol to test with.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={newTrialProtocolId} onValueChange={setNewTrialProtocolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol..." />
                </SelectTrigger>
                <SelectContent>
                  {data.protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createTrialAndNavigate()} disabled={!newTrialProtocolId}>
              Create Trial
            </Button>
            <Button onClick={() => createTrialAndNavigate("run")} disabled={!newTrialProtocolId}>
              <Play className="h-4 w-4 mr-1" /> Create &amp; Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Save Dialog */}
      <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              This formula is referenced by {relatedTrials.length} trial{relatedTrials.length !== 1 ? "s" : ""}.
              Saving will update the formula and trials that reference it may reflect the updated values.
              The formula version will be incremented.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSaveOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───

function IssuesCard({
  compliance, visibleIssues, hiddenIssues, showHidden, setShowHidden,
  ignoreIssue, unignoreIssue,
}: {
  compliance: ReturnType<typeof checkCompliance>;
  visibleIssues: Issue[];
  hiddenIssues: Issue[];
  showHidden: boolean;
  setShowHidden: (v: boolean) => void;
  ignoreIssue: (k: string) => void;
  unignoreIssue: (k: string) => void;
}) {
  const status: "ok" | "warning" | "error" =
    visibleIssues.some((i) => i.severity === "error") ? "error"
    : visibleIssues.length > 0 ? "warning"
    : "ok";

  const palette = status === "error"
    ? { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" }
    : status === "warning"
    ? { bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" }
    : { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" };

  return (
    <div className={`rounded-md px-4 py-3 text-sm ${palette.bg} ${palette.text} border ${palette.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            {status === "ok"
              ? "All constraints satisfied"
              : `${visibleIssues.length} issue${visibleIssues.length !== 1 ? "s" : ""} to address`}
          </span>
          <span className="text-xs opacity-80">
            (max nutrition deviation {compliance.maxRelDeviationPct.toFixed(1)}%)
          </span>
        </div>
        {hiddenIssues.length > 0 && (
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs print:hidden"
            onClick={() => setShowHidden(!showHidden)}
          >
            {showHidden
              ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide ignored</>
              : <><Eye className="h-3.5 w-3.5 mr-1" /> Show {hiddenIssues.length} ignored</>}
          </Button>
        )}
      </div>
      {visibleIssues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {visibleIssues.map((iss) => (
            <li key={iss.key} className="flex items-start gap-2 text-xs">
              <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: iss.severity === "error" ? "#dc2626" : "#f59e0b" }} />
              <span className="flex-1">{iss.text}</span>
              <button
                type="button"
                onClick={() => ignoreIssue(iss.key)}
                className="opacity-60 hover:opacity-100 print:hidden"
                title="Ignore this warning"
                aria-label="Ignore warning"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {showHidden && hiddenIssues.length > 0 && (
        <div className="mt-3 pt-2 border-t border-current/20">
          <p className="text-xs uppercase tracking-wide opacity-70 mb-1">Ignored</p>
          <ul className="space-y-1">
            {hiddenIssues.map((iss) => (
              <li key={iss.key} className="flex items-start gap-2 text-xs opacity-70">
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                <span className="flex-1">{iss.text}</span>
                <button
                  type="button"
                  onClick={() => unignoreIssue(iss.key)}
                  className="opacity-60 hover:opacity-100"
                  title="Unhide this warning"
                  aria-label="Unhide warning"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SolverButtonGroup({
  onRun, disabled, trackedNutrientNames, settings, setSetting,
}: {
  onRun: () => void;
  disabled: boolean;
  trackedNutrientNames: string[];
  settings: SolverSettings;
  setSetting: <K extends keyof SolverSettings>(k: K, v: SolverSettings[K]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-flex">
      <Button
        size="sm" variant="outline"
        onClick={onRun}
        disabled={disabled}
        title="Run the solver. Use the chevron to configure search aggressiveness and what is being optimised."
        className="rounded-r-none border-r-0"
      >
        <Wand2 className="h-3.5 w-3.5 mr-1" /> Run Solver
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm" variant="outline"
            className="rounded-l-none px-2"
            aria-label="Solver settings"
            title="Solver settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solver settings</DialogTitle>
            <DialogDescription>
              Adjust how aggressively the solver searches and what it optimises for. Click <strong>Run Solver</strong> to apply.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Optimising for
              </p>
              <ul className="text-xs space-y-0.5 list-disc list-inside">
                {trackedNutrientNames.length === 0
                  ? <li>No tracked nutrients (configure on Target page)</li>
                  : trackedNutrientNames.map((n) => <li key={n}>{n}</li>)}
                {settings.honorTotalMass && <li>Total mass equal to target</li>}
                {settings.orderingWeight > 0 && <li>Ingredient masses descending in line order</li>}
                <li>Per-ingredient min/max ranges and locks</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                Restarts: {settings.restarts} (more restarts → more aggressive)
              </Label>
              <Slider
                min={1} max={32} step={1}
                value={[settings.restarts]}
                onValueChange={([v]) => setSetting("restarts", Math.round(v))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                Ordering preference weight: {settings.orderingWeight.toFixed(2)}
              </Label>
              <Slider
                min={0} max={5} step={0.1}
                value={[settings.orderingWeight]}
                onValueChange={([v]) => setSetting("orderingWeight", Math.round(v * 100) / 100)}
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                0 = ignore line order; higher values strongly prefer solutions where each line is heavier than the line below it.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={settings.honorTotalMass}
                onChange={(e) => setSetting("honorTotalMass", e.target.checked)}
              />
              Constrain unlocked total to the target mass
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={() => { setOpen(false); onRun(); }} disabled={disabled}>
              <Wand2 className="h-3.5 w-3.5 mr-1" /> Run with these settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConstraintDialog({
  line, ingredientName, sliderMax, onClose, onSave,
}: {
  line: FormulaLine | null;
  ingredientName: string;
  sliderMax: number;
  onClose: () => void;
  onSave: (min: number | undefined, max: number | undefined) => void;
}) {
  const [minStr, setMinStr] = useState(line?.minG !== undefined ? String(line.minG) : "");
  const [maxStr, setMaxStr] = useState(line?.maxG !== undefined ? String(line.maxG) : "");

  const open = line !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Constrain {ingredientName || "ingredient"}</DialogTitle>
          <DialogDescription>
            Set an allowed range (in grams) for this ingredient. The solver and slider will respect these bounds.
            Leave a field empty to remove that bound. Slider goes up to {sliderMax.toFixed(0)} g.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Min (g)</Label>
            <Input
              type="number" min="0" step="0.1"
              value={minStr}
              placeholder="0"
              onChange={(e) => setMinStr(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max (g)</Label>
            <Input
              type="number" min="0" step="0.1"
              value={maxStr}
              placeholder="∞"
              onChange={(e) => setMaxStr(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { onSave(undefined, undefined); }}
          >
            Clear constraints
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              const min = minStr.trim() === "" ? undefined : Math.max(0, Number(minStr));
              const rawMax = maxStr.trim() === "" ? undefined : Math.max(0, Number(maxStr));
              const max = min !== undefined && rawMax !== undefined && rawMax < min ? min : rawMax;
              onSave(min, max);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
