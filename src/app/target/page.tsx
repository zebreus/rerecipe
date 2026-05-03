"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type TargetProduct,
  type NutritionalValue,
  type TargetIngredient,
  COMMON_NUTRITION_OPTIONS,
  COMMON_NUTRITION_UNITS,
  DEFAULT_DISPLAY_SCALE,
  nutritionColor,
} from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Save, Plus, X, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { NumberInput } from "@/components/ui/number-input";

export default function TargetPage() {
  const { data, updateTarget } = useStore();
  const [target, setTarget] = useState<TargetProduct>(data.targetProduct);
  const [dirty, setDirty] = useState(false);

  const [newAttrValues, setNewAttrValues] = useState<
    Record<keyof TargetProduct["observedAttributes"], string>
  >({ texture: "", flavor: "", color: "", packaging: "" });

  // Add-nutrient form state
  const [newNutrName, setNewNutrName] = useState("");
  const [newNutrUnit, setNewNutrUnit] = useState("g");

  // Ingredient order tab: ingredient to add
  const [newIngId, setNewIngId] = useState("");

  function handleSave() {
    updateTarget(target);
    setDirty(false);
  }

  function updateField<K extends keyof TargetProduct>(
    key: K,
    val: TargetProduct[K]
  ) {
    setTarget({ ...target, [key]: val });
    setDirty(true);
  }

  function updateNutritionValue(name: string, val: number) {
    setTarget({
      ...target,
      targetNutrition: target.targetNutrition.map((n) =>
        n.name === name ? { ...n, per100g: val } : n
      ),
    });
    setDirty(true);
  }

  function updateNutritionDisplayScale(name: string, val: number) {
    // Clamp to a sensible range so a 0 or negative scale can't make the
    // chart-axis maximum collapse to 0 (which would blow up the radar).
    const safe = Number.isFinite(val) && val > 0 ? val : DEFAULT_DISPLAY_SCALE;
    setTarget({
      ...target,
      targetNutrition: target.targetNutrition.map((n) =>
        n.name === name ? { ...n, displayScale: safe } : n
      ),
    });
    setDirty(true);
  }

  function addNutrition(name: string, unit: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (
      target.targetNutrition.some(
        (n) => n.name.toLowerCase() === trimmed.toLowerCase()
      )
    )
      return;
    const entry: NutritionalValue = { name: trimmed, unit, per100g: 0 };
    setTarget({
      ...target,
      targetNutrition: [...target.targetNutrition, entry],
    });
    setDirty(true);
    setNewNutrName("");
    setNewNutrUnit("g");
  }

  function removeNutrition(name: string) {
    setTarget({
      ...target,
      targetNutrition: target.targetNutrition.filter((n) => n.name !== name),
    });
    setDirty(true);
  }

  // ─── Target Ingredient Order ───

  function addTargetIngredient(ingredientId: string) {
    if (!ingredientId) return;
    if (target.targetIngredients.some((ti) => ti.ingredientId === ingredientId))
      return;
    setTarget({
      ...target,
      targetIngredients: [
        ...target.targetIngredients,
        { ingredientId },
      ],
    });
    setDirty(true);
    setNewIngId("");
  }

  function removeTargetIngredient(ingredientId: string) {
    setTarget({
      ...target,
      targetIngredients: target.targetIngredients.filter(
        (ti) => ti.ingredientId !== ingredientId
      ),
    });
    setDirty(true);
  }

  function moveTargetIngredient(index: number, direction: "up" | "down") {
    const list = [...target.targetIngredients];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    [list[index], list[swapIdx]] = [list[swapIdx], list[index]];
    setTarget({ ...target, targetIngredients: list });
    setDirty(true);
  }

  function updateTargetIngredientPct(
    ingredientId: string,
    pct: string
  ) {
    const num = Number(pct);
    const val = pct.trim() === "" || !isFinite(num) ? undefined : Math.max(0, Math.min(100, num));
    setTarget({
      ...target,
      targetIngredients: target.targetIngredients.map((ti) =>
        ti.ingredientId === ingredientId
          ? ({ ...ti, targetPct: val } as TargetIngredient)
          : ti
      ),
    });
    setDirty(true);
  }

  function addAttribute(
    category: keyof TargetProduct["observedAttributes"],
    value: string
  ) {
    if (!value.trim()) return;
    const attrs = { ...target.observedAttributes };
    attrs[category] = [...attrs[category], value.trim()];
    setTarget({ ...target, observedAttributes: attrs });
    setDirty(true);
    setNewAttrValues((prev) => ({ ...prev, [category]: "" }));
  }

  function removeAttribute(
    category: keyof TargetProduct["observedAttributes"],
    index: number
  ) {
    const attrs = { ...target.observedAttributes };
    attrs[category] = attrs[category].filter((_, i) => i !== index);
    setTarget({ ...target, observedAttributes: attrs });
    setDirty(true);
  }

  // Available common-options that are not already added
  const availableOptions = COMMON_NUTRITION_OPTIONS.filter(
    (opt) =>
      !target.targetNutrition.some(
        (n) => n.name.toLowerCase() === opt.name.toLowerCase()
      )
  );

  const compositionData = target.targetNutrition.map((n) => ({
    name: n.name,
    value: n.per100g,
    color: nutritionColor(n.name),
  }));

  // Ingredients not yet added to the target ingredient order list
  const availableIngredients = data.ingredients.filter(
    (ing) =>
      !target.targetIngredients.some((ti) => ti.ingredientId === ing.id)
  );

  // Compute a feasibility check for the target percentages. Targets do *not*
  // need to sum to 100% — most of the time the user only knows percentages
  // for a few ingredients. We flag the case where it is *impossible* to
  // satisfy the known percentages while honouring the ingredient label
  // order (each entry has ≤ the previous entry's mass percentage).
  //
  // Example: with two ingredients where the first is locked to 10%, the
  // second is bounded above by 10% — so the maximum total is 20% and the
  // formula can never reach 100% no matter what the second ingredient does.
  const feasibility = computeFeasibility(target.targetIngredients);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Product"
        subtitle="Define the product you are reverse-engineering"
      >
        <Button onClick={handleSave} disabled={!dirty}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </PageHeader>

      <Tabs defaultValue="basics">
        <TabsList>
          <TabsTrigger value="basics">Basic Info</TabsTrigger>
          <TabsTrigger value="nutrition">Nutritional Values</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredient Order</TabsTrigger>
          <TabsTrigger value="attributes">Observed Attributes</TabsTrigger>
        </TabsList>

        <TabsContent value="basics">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-name">Product Name</Label>
                  <Input
                    id="target-name"
                    value={target.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Müller Rice – Original"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document
                          .getElementById("target-mass-g")
                          ?.focus();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-mass-g">Target Mass (g)</Label>
                  <NumberInput
                    id="target-mass-g"
                    value={target.targetMassG}
                    min={0}
                    onCommit={(v) =>
                      updateField("targetMassG", Math.max(0, v))
                    }
                    onEnter={() => {
                      document
                        .getElementById("target-volume-ml")
                        ?.focus();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-volume-ml">Target Volume (mL)</Label>
                  <NumberInput
                    id="target-volume-ml"
                    value={target.targetVolumeMl}
                    min={0}
                    onCommit={(v) =>
                      updateField("targetVolumeMl", Math.max(0, v))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={target.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe the target product..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutrition">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Target Nutritional Values (per 100&nbsp;g)
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The <em>scale</em> column controls how much of the formula
                  charts each nutrient occupies — the chart axis maxes out at
                  <code className="mx-1">target × scale</code>. Defaults to
                  {" "}{DEFAULT_DISPLAY_SCALE.toFixed(1)}.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {target.targetNutrition.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    No nutritional values tracked yet. Add some below.
                  </p>
                )}
                {target.targetNutrition.map((n) => (
                  <div key={n.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: nutritionColor(n.name) }}
                    />
                    <Label className="flex-1 text-xs truncate" title={n.name}>
                      {n.name}
                    </Label>
                    <NumberInput
                      step={0.1}
                      min={0}
                      className="w-24"
                      value={n.per100g}
                      onCommit={(v) =>
                        updateNutritionValue(n.name, Math.max(0, v))
                      }
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-8">
                      {n.unit}
                    </span>
                    <NumberInput
                      step={0.1}
                      min={0.1}
                      className="w-16"
                      title={`Chart axis maximum = target × this scale (default ${DEFAULT_DISPLAY_SCALE.toFixed(1)})`}
                      ariaLabel={`${n.name} display scale`}
                      value={n.displayScale ?? DEFAULT_DISPLAY_SCALE}
                      onCommit={(v) => updateNutritionDisplayScale(n.name, v)}
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-8">
                      ×
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500"
                      onClick={() => removeNutrition(n.name)}
                      aria-label={`Remove ${n.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Add nutritional value
                  </Label>
                  {availableOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {availableOptions.map((opt) => (
                        <Button
                          key={opt.name}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addNutrition(opt.name, opt.unit)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {opt.name} ({opt.unit})
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Custom name"
                      className="flex-1"
                      value={newNutrName}
                      onChange={(e) => setNewNutrName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addNutrition(newNutrName, newNutrUnit);
                        }
                      }}
                    />
                    <Select value={newNutrUnit} onValueChange={setNewNutrUnit}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_NUTRITION_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addNutrition(newNutrName, newNutrUnit)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nutrition Chart</CardTitle>
              </CardHeader>
              <CardContent>
                {compositionData.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                    Add nutritional values to see the chart.
                  </p>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(220, compositionData.length * 30 + 40)}
                  >
                    <BarChart data={compositionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar dataKey="value" name="per 100 g" radius={[0, 4, 4, 0]}>
                        {compositionData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expected Ingredient Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                List ingredients in the order they appear on the product label (highest mass
                percentage first). Optionally set target mass percentages. This list is used
                to pre-populate new formulas and to warn you when a formula deviates from the
                expected composition.
              </p>

              {/* Warning: target percentages can't add up to 100% no matter
                  what the unspecified ingredients are set to (e.g. a fixed
                  percentage on an early ingredient caps the maximum mass of
                  every later ingredient via the label-order constraint). */}
              {!feasibility.feasible && (
                <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{feasibility.message}</span>
                </div>
              )}

              {target.targetIngredients.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                  No target ingredients yet. Add them from your ingredient library below.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                        <th className="pb-2 font-medium w-8">#</th>
                        <th className="pb-2 font-medium">Ingredient</th>
                        <th className="pb-2 font-medium w-36">Target % (mass)</th>
                        <th className="pb-2 font-medium w-20">Order</th>
                        <th className="pb-2 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {target.targetIngredients.map((ti, idx) => {
                        const ing = data.ingredients.find(
                          (i) => i.id === ti.ingredientId
                        );
                        return (
                          <tr key={ti.ingredientId} className="border-b last:border-0">
                            <td className="py-2 text-gray-400 dark:text-gray-500 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                              {ing?.name ?? (
                                <span className="text-red-500 dark:text-red-400">
                                  Unknown ({ti.ingredientId})
                                </span>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  className="h-7 w-24 text-xs"
                                  placeholder="—"
                                  value={ti.targetPct ?? ""}
                                  onChange={(e) =>
                                    updateTargetIngredientPct(
                                      ti.ingredientId,
                                      e.target.value
                                    )
                                  }
                                />
                                <span className="text-xs text-gray-400 dark:text-gray-500">%</span>
                              </div>
                            </td>
                            <td className="py-2">
                              <div className="flex gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="Move up"
                                  disabled={idx === 0}
                                  onClick={() =>
                                    moveTargetIngredient(idx, "up")
                                  }
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="Move down"
                                  disabled={
                                    idx === target.targetIngredients.length - 1
                                  }
                                  onClick={() =>
                                    moveTargetIngredient(idx, "down")
                                  }
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                            <td className="py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 dark:text-red-400"
                                aria-label={`Remove ${ing?.name ?? ti.ingredientId}`}
                                onClick={() =>
                                  removeTargetIngredient(ti.ingredientId)
                                }
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add ingredient */}
              {availableIngredients.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Add ingredient
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={newIngId}
                      onValueChange={setNewIngId}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select ingredient…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIngredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!newIngId}
                      onClick={() => addTargetIngredient(newIngId)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {data.ingredients.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No ingredients in library yet.{" "}
                  <Link href="/ingredients" className="underline">
                    Add ingredients
                  </Link>{" "}
                  first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attributes">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {(["texture", "flavor", "color", "packaging"] as const).map(
                (category) => (
                  <div key={category} className="space-y-2">
                    <Label className="capitalize text-sm font-medium">
                      {category}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {target.observedAttributes[category].map((attr, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="gap-1"
                        >
                          {attr}
                          <button
                            onClick={() => removeAttribute(category, idx)}
                            className="ml-0.5 hover:text-red-600 dark:hover:text-red-400"
                            aria-label={`Remove ${attr}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add ${category}...`}
                        className="max-w-xs"
                        value={newAttrValues[category] || ""}
                        onChange={(e) =>
                          setNewAttrValues((prev) => ({
                            ...prev,
                            [category]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addAttribute(
                              category,
                              newAttrValues[category] || ""
                            );
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Add ${category} attribute`}
                        onClick={() =>
                          addAttribute(category, newAttrValues[category] || "")
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Decide whether the configured target percentages can possibly be satisfied.
// Targets are listed in label order — each entry's mass must be ≤ the
// previous entry's mass. Combined with the constraint that mass percentages
// total 100%, fixed `targetPct` values can make the system infeasible in two
// opposite ways:
//
//   * A fixed percentage on an early entry caps every later entry's maximum
//     percentage (via the descending-order requirement), so the *maximum*
//     reachable total can fall below 100%.  Example: only two ingredients,
//     first at 10% → second is bounded by 10%, max total = 20%.
//   * An unspecified early entry that is preceded by a later fixed percentage
//     must be at *least* as large as that later fixed value (because the list
//     is in descending order), which raises the *minimum* reachable total
//     above 100%.  Example: [unset, 90%] → the first must be ≥ 90%, so the
//     minimum total is 90 + 90 = 180% > 100%.
//
// Returns `feasible: true` when at least one assignment of the unspecified
// percentages can sum to 100%, `false` (with a human-readable `message`)
// otherwise.
export function computeFeasibility(
  targetIngredients: TargetIngredient[]
): { feasible: true } | { feasible: false; message: string } {
  if (targetIngredients.length === 0) return { feasible: true };

  // Direct order violations: a fixed pct that exceeds an earlier fixed pct.
  let prevFixed = Infinity;
  for (const ti of targetIngredients) {
    if (ti.targetPct !== undefined) {
      if (ti.targetPct > prevFixed + 1e-6) {
        return {
          feasible: false,
          message:
            "A target percentage is larger than an earlier ingredient's percentage. Ingredients are listed in descending mass order, so each entry must have ≤ the previous entry's percentage.",
        };
      }
      prevFixed = ti.targetPct;
    }
  }

  // ─── Maximum reachable total ─────────────────────────────────────────────
  // Walk forward: each entry can be at most min(previous entry's value, 100).
  // If even the best-case assignment can't reach 100%, it's infeasible.
  let maxTotal = 0;
  let prevMaxPct = 100;
  let usedFixed = 0;
  for (const ti of targetIngredients) {
    if (ti.targetPct !== undefined) {
      maxTotal += ti.targetPct;
      usedFixed += ti.targetPct;
      prevMaxPct = ti.targetPct;
    } else {
      const fill = Math.max(0, prevMaxPct);
      maxTotal += fill;
      prevMaxPct = fill;
    }
  }

  if (usedFixed > 100 + 1e-6) {
    return {
      feasible: false,
      message: `Fixed target percentages already total ${usedFixed.toFixed(1)}%, which is more than 100%.`,
    };
  }

  if (maxTotal < 100 - 1e-6) {
    return {
      feasible: false,
      message: `These target percentages can never sum to 100%. Even at the maximum allowed by the ingredient order, the total can only reach ${maxTotal.toFixed(1)}%.`,
    };
  }

  // ─── Minimum reachable total ─────────────────────────────────────────────
  // Walk backward: each unspecified entry must be at least as large as the
  // next entry's implied minimum (because the list is in descending order).
  // Build per-entry minimums from the tail, then check if their sum already
  // exceeds 100%.
  const n = targetIngredients.length;
  const minPct = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const ti = targetIngredients[i];
    if (ti.targetPct !== undefined) {
      minPct[i] = ti.targetPct;
    } else {
      // Unspecified: must be at least as large as the entry after it.
      minPct[i] = i + 1 < n ? minPct[i + 1] : 0;
    }
  }
  const minTotal = minPct.reduce((s, x) => s + x, 0);
  if (minTotal > 100 + 1e-6) {
    return {
      feasible: false,
      message: `These target percentages require at least ${minTotal.toFixed(1)}% to satisfy the descending-order constraint, which exceeds 100%.`,
    };
  }

  return { feasible: true };
}
