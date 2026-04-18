"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, Lock, Unlock } from "lucide-react";
import type { Formula, FormulaLine } from "@/lib/types";
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
} from "@/lib/solver";
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

export default function FormulaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, updateFormula } = useStore();

  const formula = data.formulas.find((f) => f.id === id);
  const [local, setLocal] = useState<Formula | null>(formula ? { ...formula } : null);
  const [dirty, setDirty] = useState(false);
  const [sensitivityIngId, setSensitivityIngId] = useState<string>("");
  const [sensitivityDelta, setSensitivityDelta] = useState(10);

  if (!local || !formula) {
    return (
      <div className="space-y-4">
        <Link href="/formulas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <p className="text-gray-500">Formula not found.</p>
      </div>
    );
  }

  const ingredients = data.ingredients;

  function save() {
    if (!local) return;
    updateFormula(local);
    setDirty(false);
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{local.name}</h1>
            <p className="text-xs text-gray-500">
              v{local.version} · {sim.toFixed(0)}% match
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={!dirty}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Formula Builder</TabsTrigger>
          <TabsTrigger value="heatmap">Contribution Heatmap</TabsTrigger>
          <TabsTrigger value="comparison">vs Target</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
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
                    <p className="text-sm text-gray-400 text-center py-6">
                      No ingredients added yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-2 font-medium">Ingredient</th>
                            <th className="pb-2 font-medium w-28">Mass (g)</th>
                            <th className="pb-2 font-medium w-16">Lock</th>
                            <th className="pb-2 font-medium w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {local.ingredientLines.map((line, idx) => {
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
                                    className="h-8"
                                    value={line.massG}
                                    onChange={(e) =>
                                      updateLine(idx, {
                                        massG: Number(e.target.value),
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
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
                                    className="h-7 w-7 text-red-500"
                                    onClick={() => removeLine(idx)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
            </div>

            {/* Mass balance & summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mass Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Input</span>
                    <span className="font-medium">
                      {mb.totalInputG.toFixed(1)} g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Target Output</span>
                    <span className="font-medium">
                      {mb.totalOutputG.toFixed(1)} g
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-500">Loss / Gain</span>
                    <span
                      className={`font-medium ${
                        mb.lossG > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {mb.lossG > 0 ? "+" : ""}
                      {mb.lossG.toFixed(1)} g ({mb.lossPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Water Adjustment</span>
                    <span>{mb.waterAdjustmentG.toFixed(1)} g</span>
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
                    <p className="text-3xl font-bold text-indigo-600">
                      {sim.toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">
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
                      width={100}
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
                <p className="text-sm text-gray-400 text-center py-8">
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
              <p className="text-sm text-gray-500">
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
                    className="w-24"
                    value={sensitivityDelta}
                    onChange={(e) =>
                      setSensitivityDelta(Number(e.target.value))
                    }
                  />
                </div>
              </div>

              {sensResult && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
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
                                  ? "text-green-600"
                                  : delta < 0
                                  ? "text-red-600"
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
                    value={local.targetMassG}
                    onChange={(e) =>
                      update({ targetMassG: Number(e.target.value) })
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
    </div>
  );
}
