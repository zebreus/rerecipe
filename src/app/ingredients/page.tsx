"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Ingredient,
  INGREDIENT_CATEGORIES,
  nutritionColor,
} from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, Leaf, Zap, HelpCircle, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { NumberInput } from "@/components/ui/number-input";
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

import { COMMON_INGREDIENTS, emptyNutrition, presetNutrition } from "@/lib/common-ingredients";

const CONFIDENCE_TOOLTIP =
  "How certain we are about the correctness of this ingredient's composition data. A higher value means the data is from a reliable source and has been verified.";

function ConfidenceHelpButton() {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded-sm cursor-help text-gray-400 dark:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
            aria-label="What the confidence value means"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            className="z-50 max-w-xs rounded-md bg-gray-950 px-3 py-2 text-xs text-gray-50 shadow-md dark:bg-gray-50 dark:text-gray-950"
          >
            {CONFIDENCE_TOOLTIP}
            <TooltipPrimitive.Arrow className="fill-gray-950 dark:fill-gray-50" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export default function IngredientsPage() {
  const { data, addIngredient, updateIngredient, deleteIngredient } =
    useStore();
  const settings = data.settings;
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [lastQuickAdded, setLastQuickAdded] = useState<string | null>(null);
  const [quickAddSearch, setQuickAddSearch] = useState("");
  const [quickAddCategory, setQuickAddCategory] = useState("all");

  const trackedNutrients = data.targetProduct.targetNutrition;
  const trackedNames = trackedNutrients.map((n) => n.name);

  const filtered = data.ingredients.filter((ing) => {
    const matchesSearch =
      ing.name.toLowerCase().includes(search.toLowerCase()) ||
      ing.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || ing.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const selected = selectedId
    ? data.ingredients.find((i) => i.id === selectedId)
    : null;

  function openNew() {
    setEditing({
      id: generateId(),
      name: "",
      category: "Other",
      nutrition: emptyNutrition(trackedNames),
      source: "",
      confidence: 0.9,
      costPerKg: 0,
      substitutions: [],
      constraints: [],
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setDialogOpen(true);
  }

  function openEdit(ing: Ingredient) {
    // Ensure the editing object has entries for every tracked nutrient
    // so the form renders inputs for them (existing extra entries are kept).
    const nutrition = { ...ing.nutrition };
    for (const name of trackedNames) {
      if (typeof nutrition[name] !== "number") nutrition[name] = 0;
    }
    setEditing({ ...ing, nutrition });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) return;
    const updated = { ...editing, name: editing.name.trim(), updatedAt: new Date().toISOString() };
    if (data.ingredients.find((i) => i.id === updated.id)) {
      updateIngredient(updated);
    } else {
      addIngredient(updated);
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    const usedInFormulas = data.formulas.filter((f) =>
      f.ingredientLines.some((l) => l.ingredientId === id)
    );
    const ingName = data.ingredients.find((i) => i.id === id)?.name || "this ingredient";
    if (usedInFormulas.length > 0) {
      const names = usedInFormulas.slice(0, 5).map((f) => f.name).join(", ");
      const extra = usedInFormulas.length > 5 ? ` and ${usedInFormulas.length - 5} more` : "";
      alert(`Cannot delete "${ingName}" because it is used in ${usedInFormulas.length} formula(s): ${names}${extra}.\n\nRemove it from those formulas first.`);
      return;
    }
    if (confirm(`Delete "${ingName}"?`)) {
      deleteIngredient(id);
      if (selectedId === id) setSelectedId(null);
    }
  }

  // Show up to 4 tracked nutrients in the summary table for a quick overview.
  const summaryNutrients = trackedNutrients.slice(0, 4);

  const selectedCompositionData = selected
    ? trackedNutrients.map((n) => ({
        name: n.name,
        value: selected.nutrition?.[n.name] ?? 0,
        color: nutritionColor(n.name),
        unit: n.unit,
      }))
    : [];

  const filteredCommonIngredients = COMMON_INGREDIENTS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(quickAddSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(quickAddSearch.toLowerCase());
    const matchesCategory =
      quickAddCategory === "all" || item.category === quickAddCategory;
    return matchesSearch && matchesCategory;
  });

  const quickAddCategories = Array.from(
    new Set(COMMON_INGREDIENTS.map((i) => i.category))
  ).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingredient Library"
        subtitle={`${data.ingredients.length} ingredient${data.ingredients.length !== 1 ? "s" : ""} in library`}
      >
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          Add Ingredient
        </Button>
        <Button variant="outline" onClick={() => setQuickAddOpen(true)}>
          <Zap className="h-4 w-4 mr-1" />
          Quick Add
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {INGREDIENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredient list */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<Leaf className="h-8 w-8" />}
                  title="No ingredients found."
                  subtitle="Add your first ingredient!"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                        <th className="pb-2 font-medium">Name</th>
                        {settings.showCategoryColumn && (
                          <th className="pb-2 font-medium">Category</th>
                        )}
                        {settings.showCostColumn && (
                          <th className="pb-2 font-medium">Cost</th>
                        )}
                        {summaryNutrients.map((n) => (
                          <th key={n.name} className="pb-2 font-medium">
                            {n.name}
                          </th>
                        ))}
                        <th className="pb-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((ing) => (
                        <tr
                          key={ing.id}
                          className={`border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            selectedId === ing.id ? "bg-indigo-50 dark:bg-indigo-950" : ""
                          }`}
                          onClick={() => setSelectedId(ing.id)}
                        >
                          <td className="py-2 font-medium">{ing.name}</td>
                          {settings.showCategoryColumn && (
                            <td className="py-2">
                              <Badge variant="outline" className="text-xs">
                                {ing.category}
                              </Badge>
                            </td>
                          )}
                          {settings.showCostColumn && (
                            <td className="py-2">
                              {ing.costPerKg ? `€${ing.costPerKg.toFixed(2)}/kg` : "—"}
                            </td>
                          )}
                          {summaryNutrients.map((n) => (
                            <td key={n.name} className="py-2">
                              {(ing.nutrition?.[n.name] ?? 0)}{" "}
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {n.unit}
                              </span>
                            </td>
                          ))}
                          <td className="py-2">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={`Edit ${ing.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(ing);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500"
                                aria-label={`Delete ${ing.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(ing.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selected.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Category:</span>{" "}
                    {selected.category}
                  </p>
                  {selected.costPerKg > 0 && (
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">Cost:</span>{" "}
                      €{selected.costPerKg.toFixed(2)}/kg
                    </p>
                  )}
                  <p className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">Confidence:</span>{" "}
                    {(selected.confidence * 100).toFixed(0)}%
                    <ConfidenceHelpButton />
                  </p>
                  {selected.source && (
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">Source:</span>{" "}
                      {selected.source}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Nutrition (per 100&nbsp;g)
                  </p>
                  {selectedCompositionData.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      No nutritional values tracked. Add some on the Target page.
                    </p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={selectedCompositionData}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 9 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={70}
                            tick={{ fontSize: 9 }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="value"
                            name="per 100 g"
                            radius={[0, 3, 3, 0]}
                          >
                            {selectedCompositionData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {selectedCompositionData.map((entry) => {
                          if (entry.value === 0) return null;
                          return (
                            <div
                              key={entry.name}
                              className="flex justify-between"
                            >
                              <span className="text-gray-500 dark:text-gray-400">
                                {entry.name}
                              </span>
                              <span className="font-medium">
                                {entry.value} {entry.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {selected.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Notes
                    </p>
                    <p className="text-sm mt-1">{selected.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                Select an ingredient to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing && data.ingredients.find((i) => i.id === editing.id)
                ? "Edit Ingredient"
                : "Add Ingredient"}
            </DialogTitle>
            <DialogDescription>
              Enter ingredient details and composition data.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    placeholder="Ingredient name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(val) =>
                      setEditing({ ...editing, category: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INGREDIENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cost per kg (€)</Label>
                  <NumberInput
                    step={0.01}
                    min={0}
                    value={editing.costPerKg}
                    onCommit={(v) =>
                      setEditing({
                        ...editing,
                        costPerKg: Math.max(0, v),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Confidence (0–1)
                    <ConfidenceHelpButton />
                  </Label>
                  <NumberInput
                    step={0.05}
                    min={0}
                    max={1}
                    value={editing.confidence}
                    onCommit={(v) =>
                      setEditing({
                        ...editing,
                        confidence: Math.min(1, Math.max(0, v)),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">
                  Nutrition (per 100&nbsp;g)
                </p>
                {(() => {
                  // Tracked nutrients (defined on the target) plus any extra
                  // nutrients already on the ingredient that the target
                  // doesn't track. The "Add extra" control below appends
                  // new keys to `editing.nutrition`.
                  const trackedNamesSet = new Set(trackedNames);
                  const extraNames = Object.keys(editing.nutrition ?? {})
                    .filter((n) => !trackedNamesSet.has(n))
                    .sort();
                  if (
                    trackedNutrients.length === 0 &&
                    extraNames.length === 0
                  ) {
                    return (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        No nutritional values are tracked. Add some on the
                        Target page, or add a one-off entry below.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {trackedNutrients.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {trackedNutrients.map((n) => (
                            <div key={n.name} className="space-y-1">
                              <Label className="text-xs">
                                {n.name} ({n.unit})
                              </Label>
                              <NumberInput
                                step={0.1}
                                min={0}
                                value={editing.nutrition?.[n.name] ?? 0}
                                onCommit={(v) =>
                                  setEditing({
                                    ...editing,
                                    nutrition: {
                                      ...editing.nutrition,
                                      [n.name]: Math.max(0, v),
                                    },
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {extraNames.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                            Extra (not tracked by target)
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {extraNames.map((name) => (
                              <div key={name} className="space-y-1">
                                <Label className="text-xs flex items-center gap-1">
                                  <span className="truncate" title={name}>
                                    {name}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Remove ${name}`}
                                    title="Remove this nutrient"
                                    className="text-gray-400 hover:text-red-500"
                                    onClick={() => {
                                      const next = { ...editing.nutrition };
                                      delete next[name];
                                      setEditing({ ...editing, nutrition: next });
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Label>
                                <NumberInput
                                  step={0.1}
                                  min={0}
                                  value={editing.nutrition?.[name] ?? 0}
                                  onCommit={(v) =>
                                    setEditing({
                                      ...editing,
                                      nutrition: {
                                        ...editing.nutrition,
                                        [name]: Math.max(0, v),
                                      },
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <AddExtraNutrient
                        existingNames={Object.keys(editing.nutrition ?? {})}
                        onAdd={(name) =>
                          setEditing({
                            ...editing,
                            nutrition: {
                              ...editing.nutrition,
                              [name]: 0,
                            },
                          })
                        }
                      />
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={editing.source}
                  onChange={(e) =>
                    setEditing({ ...editing, source: e.target.value })
                  }
                  placeholder="e.g. supplier datasheet"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editing.notes}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={(open) => {
        setQuickAddOpen(open);
        if (!open) {
          setLastQuickAdded(null);
          setQuickAddSearch("");
          setQuickAddCategory("all");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Common Ingredient</DialogTitle>
            <DialogDescription>
              Click an ingredient to add it to your library instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={quickAddSearch}
                onChange={(e) => setQuickAddSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={quickAddCategory} onValueChange={setQuickAddCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {quickAddCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[60vh] overflow-y-auto space-y-1">
            {lastQuickAdded && (
              <div className="px-3 py-2 mb-2 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
                ✓ Added &quot;{lastQuickAdded}&quot; to library
              </div>
            )}
            {filteredCommonIngredients.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No ingredients match your search.
              </p>
            ) : (
              filteredCommonIngredients.map((item) => {
                const alreadyAdded = data.ingredients.some(
                  (ing) => ing.name.toLowerCase() === item.name.toLowerCase()
                );
                return (
                  <button
                    key={item.name}
                    disabled={alreadyAdded}
                    className="w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-colors"
                    onClick={() => {
                      const now = new Date().toISOString();
                      addIngredient({
                        id: generateId(),
                        name: item.name,
                        category: item.category,
                        nutrition: presetNutrition(item),
                        source: "",
                        confidence: 0.9,
                        costPerKg: item.costPerKg,
                        substitutions: [],
                        constraints: [],
                        notes: "",
                        createdAt: now,
                        updatedAt: now,
                      });
                      setLastQuickAdded(item.name);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">
                        {item.name}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.category}
                      </Badge>
                    </div>
                    {alreadyAdded && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        Already added
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline form for adding a one-off nutrient entry to an ingredient that
// isn't tracked by the target. Lets the user keep extra values around for
// future targets without polluting the target list.
function AddExtraNutrient({
  existingNames,
  onAdd,
}: {
  existingNames: string[];
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const taken = existingNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  );
  const canAdd = trimmed.length > 0 && !taken;
  function commit() {
    if (!canAdd) return;
    onAdd(trimmed);
    setName("");
  }
  return (
    <div className="flex items-end gap-2 pt-2 border-t">
      <div className="flex-1 space-y-1">
        <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Add extra nutrient
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="e.g. Iron, Vitamin C"
        />
      </div>
      <Button variant="outline" size="sm" onClick={commit} disabled={!canAdd}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
