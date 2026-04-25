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
    const val = pct.trim() === "" ? undefined : Math.max(0, Math.min(100, Number(pct)));
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

  // Total of set target percentages
  const totalTargetPct = target.targetIngredients.reduce(
    (sum, ti) => sum + (ti.targetPct ?? 0),
    0
  );
  const hasPctValues = target.targetIngredients.some(
    (ti) => ti.targetPct !== undefined
  );

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
                  <Label>Product Name</Label>
                  <Input
                    value={target.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Müller Rice – Original"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Mass (g)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={target.targetMassG}
                    onChange={(e) =>
                      updateField(
                        "targetMassG",
                        Math.max(0, Number(e.target.value))
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Volume (mL)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={target.targetVolumeMl}
                    onChange={(e) =>
                      updateField(
                        "targetVolumeMl",
                        Math.max(0, Number(e.target.value))
                      )
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
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-24"
                      value={n.per100g}
                      onChange={(e) =>
                        updateNutritionValue(
                          n.name,
                          Math.max(0, Number(e.target.value))
                        )
                      }
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-8">
                      {n.unit}
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

              {/* Warning: percentages don&apos;t sum to 100 */}
              {hasPctValues && Math.abs(totalTargetPct - 100) > 1 && (
                <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Target percentages sum to {totalTargetPct.toFixed(1)}% (expected ~100%).
                  </span>
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
                    {hasPctValues && (
                      <tfoot>
                        <tr className="border-t">
                          <td></td>
                          <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                            Total
                          </td>
                          <td className="py-2 text-xs font-medium tabular-nums">
                            {totalTargetPct.toFixed(1)}%
                          </td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
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
                  <a href="/ingredients" className="underline">
                    Add ingredients
                  </a>{" "}
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
