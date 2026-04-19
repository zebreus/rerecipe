"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, Lock, Unlock, Printer, TestTube, AlertTriangle } from "lucide-react";
import type { Formula, FormulaLine, Trial } from "@/lib/types";
import {
  COMPONENT_KEYS,
  COMPONENT_LABELS,
  COMPONENT_COLORS,
} from "@/lib/types";
import {
  calculateFormulaComponents,
  calculateMassBalance,
  componentsToPercent,
  compositionSimilarity,
  ingredientContributions,
  sensitivityAnalysis,
  checkCompliance,
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

export default function FormulaDetailClient({ id }: { id: string }) {
  const { data, updateFormula, addTrial } = useStore();
  const router = useRouter();

  const formula = data.formulas.find((f) => f.id === id);
  const [local, setLocal] = useState<Formula | null>(formula ? { ...formula } : null);
  const [dirty, setDirty] = useState(false);
  const [sensitivityIngId, setSensitivityIngId] = useState<string>("");
  const [sensitivityDelta, setSensitivityDelta] = useState(10);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [newTrialProtocolId, setNewTrialProtocolId] = useState("");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const relatedTrials = data.trials.filter((t) => t.formulaId === id);
  const hasTrials = relatedTrials.length > 0;

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

  function handleSaveClick() {
    if (hasTrials) {
      setConfirmSaveOpen(true);
    } else {
      save();
    }
  }

  function save() {
    if (!local) return;
    updateFormula({ ...local, version: local.version + 1 });
    setLocal({ ...local, version: local.version + 1 });
    setDirty(false);
    setConfirmSaveOpen(false);
  }

  function handleCreateTrial() {
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
        name: d.name,
        score: 0,
        weight: d.weight,
        notes: "",
      })) || [],
      similarityScore: 0,
      attachmentIds: [],
      notes: "",
      startedAt: "",
      completedAt: "",
      createdAt: now,
      updatedAt: now,
    };
    addTrial(t);
    setTrialDialogOpen(false);
    setNewTrialProtocolId("");
    router.push(`/trials?id=${t.id}`);
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
    const lines = [
      ...local!.ingredientLines,
      { ingredientId: available.id, massG: 10, locked: false },
    ];
    update({ ingredientLines: lines });
  }

  function updateLine(index: number, partial: Partial<FormulaLine>) {
    if (partial.massG !== undefined) {
      partial.massG = Math.max(0, partial.massG);
    }
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

  const comps = calculateFormulaComponents(local.ingredientLines, ingredients);
  const mb = calculateMassBalance(local.ingredientLines, local.targetMassG);
  const pct = componentsToPercent(comps);
  const sim = compositionSimilarity(
    pct,
    data.targetProduct.targetComposition
  );
  const contributions = ingredientContributions(
    local.ingredientLines,
    ingredients
  );

  // Heatmap data
  const heatmapData = contributions.map((c) => ({
    name: c.ingredientName,
    Water: c.water,
    Fat: c.fat,
    Protein: c.protein,
    Sugar: c.sugar,
    Starch: c.starch,
    Salt: c.salt,
    Hydrocolloid: c.hydrocolloid,
    Other: c.other,
  }));

  // Composition comparison
  const compCompare = COMPONENT_KEYS.map((key) => ({
    name: COMPONENT_LABELS[key],
    Target: data.targetProduct.targetComposition[key],
    Formula: pct[key],
  }));

  // Sensitivity
  const sensResult =
    sensitivityIngId && local
      ? sensitivityAnalysis(
          local,
          ingredients,
          sensitivityIngId,
          sensitivityDelta
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
            onClick={() => {
              setNewTrialProtocolId("");
              setTrialDialogOpen(true);
            }}
          >
            <TestTube className="h-4 w-4 mr-1" /> Create Trial
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button onClick={handleSaveClick} disabled={!dirty}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Warning banner for formulas with trials */}
      {hasTrials && (
        <div className="rounded-md px-4 py-3 text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This formula is referenced by {relatedTrials.length} trial{relatedTrials.length !== 1 ? "s" : ""}. Editing it may affect trial data integrity.
          </span>
        </div>
      )}

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Formula Builder</TabsTrigger>
          <TabsTrigger value="heatmap">Contribution Heatmap</TabsTrigger>
          <TabsTrigger value="comparison">vs Target</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          <TabsTrigger value="label">Label</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Ingredient Lines</CardTitle>
                  <Button size="sm" variant="outline" onClick={addLine}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </CardHeader>
                <CardContent>
                  {local.ingredientLines.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                      No ingredients added yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                            <th className="pb-2 font-medium">Ingredient</th>
                            <th className="pb-2 font-medium w-28">Mass (g)</th>
                            <th className="pb-2 font-medium w-24">Cost ($)</th>
                            <th className="pb-2 font-medium w-16">Lock</th>
                            <th className="pb-2 font-medium w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {local.ingredientLines.map((line, idx) => {
                            const ing = ingredients.find(
                              (i) => i.id === line.ingredientId
                            );
                            const lineCost = ing
                              ? (line.massG * ing.costPerKg) / 1000
                              : 0;
                            return (
                              <tr
                                key={idx}
                                className="border-b last:border-0"
                              >
                                <td className="py-2">
                                  <Select
                                    value={line.ingredientId}
                                    onValueChange={(val) =>
                                      updateLine(idx, {
                                        ingredientId: val,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ingredients.map((i) => (
                                        <SelectItem
                                          key={i.id}
                                          value={i.id}
                                        >
                                          {i.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-2">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    className="h-8"
                                    value={line.massG}
                                    onChange={(e) =>
                                      updateLine(idx, {
                                        massG: Number(e.target.value),
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                                  ${lineCost.toFixed(2)}
                                </td>
                                <td className="py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    aria-label={line.locked ? `Unlock ${ing?.name ?? "ingredient"}` : `Lock ${ing?.name ?? "ingredient"}`}
                                    onClick={() =>
                                      updateLine(idx, {
                                        locked: !line.locked,
                                      })
                                    }
                                  >
                                    {line.locked ? (
                                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                                    ) : (
                                      <Unlock className="h-3.5 w-3.5 text-gray-400" />
                                    )}
                                  </Button>
                                </td>
                                <td className="py-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
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
                            <td className="py-2 font-medium text-gray-900 dark:text-gray-100">Total</td>
                            <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                              {local.ingredientLines.reduce((sum, l) => sum + l.massG, 0).toFixed(1)} g
                            </td>
                            <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                              ${local.ingredientLines.reduce((sum, l) => {
                                const ing = ingredients.find((i) => i.id === l.ingredientId);
                                return sum + (ing ? (l.massG * ing.costPerKg) / 1000 : 0);
                              }, 0).toFixed(2)}
                            </td>
                            <td></td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Mass balance & summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mass Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Input</span>
                    <span className="font-medium">
                      {mb.totalInputG.toFixed(1)} g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Target Output</span>
                    <span className="font-medium">
                      {mb.totalOutputG.toFixed(1)} g
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-500 dark:text-gray-400">Loss / Gain</span>
                    <span
                      className={`font-medium ${
                        mb.lossG > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {mb.lossG > 0 ? "+" : ""}
                      {mb.lossG.toFixed(1)} g ({mb.lossPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Water Adjustment</span>
                    <span>{mb.waterAdjustmentG.toFixed(1)} g</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-500 dark:text-gray-400">Estimated Cost</span>
                    <span className="font-medium">
                      ${local.ingredientLines
                        .reduce((sum, line) => {
                          const ing = ingredients.find(
                            (i) => i.id === line.ingredientId
                          );
                          return (
                            sum +
                            (ing?.costPerKg ?? 0) * (line.massG / 1000)
                          );
                        }, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Calculated Components
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {COMPONENT_KEYS.map((key) => {
                    const gKey = key.replace("_pct", "_g") as keyof typeof comps;
                    const grams = comps[gKey] as number;
                    return (
                      <div key={key} className="flex justify-between">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: COMPONENT_COLORS[key],
                            }}
                          />
                          {COMPONENT_LABELS[key]}
                        </span>
                        <span>
                          {grams.toFixed(1)} g ({pct[key].toFixed(1)}%)
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between border-t pt-1 font-medium">
                    <span>Total</span>
                    <span>{comps.total_g.toFixed(1)} g</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {sim.toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Composition Match
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ingredient Contribution Heatmap (grams)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, heatmapData.length * 40 + 60)}>
                  <BarChart data={heatmapData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Water" stackId="a" fill={COMPONENT_COLORS.water_pct} />
                    <Bar dataKey="Fat" stackId="a" fill={COMPONENT_COLORS.fat_pct} />
                    <Bar dataKey="Protein" stackId="a" fill={COMPONENT_COLORS.protein_pct} />
                    <Bar dataKey="Sugar" stackId="a" fill={COMPONENT_COLORS.sugar_pct} />
                    <Bar dataKey="Starch" stackId="a" fill={COMPONENT_COLORS.starch_pct} />
                    <Bar dataKey="Salt" stackId="a" fill={COMPONENT_COLORS.salt_pct} />
                    <Bar dataKey="Hydrocolloid" stackId="a" fill={COMPONENT_COLORS.hydrocolloid_pct} />
                    <Bar dataKey="Other" stackId="a" fill={COMPONENT_COLORS.other_pct} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  Add ingredients to see contributions.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Formula vs Target Composition (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={compCompare}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Target" fill="#94a3b8" />
                  <Bar dataKey="Formula" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensitivity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sensitivity Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See what happens if you change one ingredient&apos;s mass.
              </p>
              <div className="flex gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Ingredient</Label>
                  <Select
                    value={sensitivityIngId}
                    onValueChange={setSensitivityIngId}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {local.ingredientLines.map((l) => {
                        const ing = ingredients.find(
                          (i) => i.id === l.ingredientId
                        );
                        return (
                          <SelectItem key={l.ingredientId} value={l.ingredientId}>
                            {ing?.name || l.ingredientId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Change (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    className="w-24"
                    value={sensitivityDelta}
                    onChange={(e) =>
                      setSensitivityDelta(Math.max(1, Math.min(100, Number(e.target.value))))
                    }
                  />
                </div>
              </div>

              {sensResult && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                        <th className="pb-2 font-medium">Component</th>
                        <th className="pb-2 font-medium">Original (g)</th>
                        <th className="pb-2 font-medium">Modified (g)</th>
                        <th className="pb-2 font-medium">Delta (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sensResult.deltas).map(([key, delta]) => {
                        const origKey =
                          key as keyof typeof sensResult.original;
                        return (
                          <tr key={key} className="border-b last:border-0">
                            <td className="py-1.5">
                              {key.replace("_g", "")}
                            </td>
                            <td className="py-1.5">
                              {(
                                sensResult.original[origKey] as number
                              ).toFixed(2)}
                            </td>
                            <td className="py-1.5">
                              {(
                                sensResult.modified[origKey] as number
                              ).toFixed(2)}
                            </td>
                            <td
                              className={`py-1.5 font-medium ${
                                delta > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : delta < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="label">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section A: Ingredient Declaration */}
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

            {/* Section B: Nutrition Facts per 100g */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nutrition Facts (per 100g)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {COMPONENT_KEYS.map((key) => (
                    <div key={key} className="flex justify-between py-2 text-sm">
                      <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COMPONENT_COLORS[key] }}
                        />
                        {COMPONENT_LABELS[key]}
                      </span>
                      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                        {pct[key].toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section C: Compliance Status */}
            {(() => {
              const compliance = checkCompliance(pct, data.targetProduct.targetComposition);
              const statusColor =
                compliance.status === "compliant"
                  ? { bg: "#16a34a", text: "#ffffff" }
                  : compliance.status === "warning"
                  ? { bg: "#eab308", text: "#000000" }
                  : { bg: "#dc2626", text: "#ffffff" };
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Compliance Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        style={{ backgroundColor: statusColor.bg, color: statusColor.text, borderColor: statusColor.bg }}
                      >
                        {compliance.status.replace("-", " ").toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Max deviation: {compliance.maxDeviation.toFixed(2)}%
                      </span>
                    </div>
                    {compliance.deviations.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Deviations (&gt;2%)
                        </p>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {compliance.deviations.map((d) => (
                            <div key={d.key} className="flex justify-between py-1.5 text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{d.label}</span>
                              <span className="text-red-600 dark:text-red-400 font-medium tabular-nums">
                                {pct[d.key as keyof typeof pct].toFixed(1)}% vs{" "}
                                {data.targetProduct.targetComposition[d.key as keyof typeof pct].toFixed(1)}%
                                {" "}(Δ {d.diff.toFixed(2)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Section D: Target Deviations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deviations from Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {COMPONENT_KEYS.map((key) => {
                    const formulaVal = pct[key];
                    const targetVal = data.targetProduct.targetComposition[key];
                    const diff = formulaVal - targetVal;
                    const absDiff = Math.abs(diff);
                    const colorClass =
                      absDiff <= 2
                        ? "text-green-600 dark:text-green-400"
                        : absDiff <= 5
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400";
                    return (
                      <div key={key} className="flex justify-between py-2 text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{COMPONENT_LABELS[key]}</span>
                        <div className="flex gap-4 tabular-nums">
                          <span className="text-gray-900 dark:text-gray-100">{formulaVal.toFixed(1)}%</span>
                          <span className="text-gray-500 dark:text-gray-400">vs {targetVal.toFixed(1)}%</span>
                          <span className={`font-medium ${colorClass}`}>
                            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={local.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={local.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Mass (g)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={local.targetMassG}
                    onChange={(e) =>
                      update({ targetMassG: Math.max(0, Number(e.target.value)) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input type="number" value={local.version} readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={local.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Related Trials */}
      {(() => {
        const relatedTrials = data.trials.filter((t) => t.formulaId === local.id);
        if (relatedTrials.length === 0) return null;
        return (
          <Card>
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
        );
      })()}
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
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTrial} disabled={!newTrialProtocolId}>
              Create Trial
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
              Saving changes will update the formula but existing trial results will remain as they were.
              The formula version will be incremented.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
