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
  COMPONENT_KEYS,
  COMPONENT_LABELS,
  COMPONENT_COLORS,
  INGREDIENT_CATEGORIES,
  EMPTY_COMPOSITION,
} from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, Leaf, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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

import type { ComponentComposition } from "@/lib/types";

const COMMON_INGREDIENTS: {
  name: string;
  category: string;
  density_g_ml: number;
  composition: ComponentComposition;
  costPerKg: number;
}[] = [
  {
    name: "Water",
    category: "Water",
    density_g_ml: 1.0,
    composition: { water_pct: 100, fat_pct: 0, protein_pct: 0, sugar_pct: 0, starch_pct: 0, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 0 },
    costPerKg: 0,
  },
  {
    name: "Flour (All-Purpose)",
    category: "Grain",
    density_g_ml: 0.59,
    composition: { water_pct: 11.9, fat_pct: 1.2, protein_pct: 10.3, sugar_pct: 0.3, starch_pct: 71.4, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 4.9 },
    costPerKg: 1.5,
  },
  {
    name: "Butter",
    category: "Fat & Oil",
    density_g_ml: 0.91,
    composition: { water_pct: 17.9, fat_pct: 81.1, protein_pct: 0.9, sugar_pct: 0.1, starch_pct: 0, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 0 },
    costPerKg: 8.0,
  },
  {
    name: "Eggs (Whole)",
    category: "Protein",
    density_g_ml: 1.03,
    composition: { water_pct: 76.1, fat_pct: 9.5, protein_pct: 12.6, sugar_pct: 0.7, starch_pct: 0, salt_pct: 0.4, hydrocolloid_pct: 0, other_pct: 0.7 },
    costPerKg: 4.0,
  },
  {
    name: "Olive Oil",
    category: "Fat & Oil",
    density_g_ml: 0.92,
    composition: { water_pct: 0, fat_pct: 100, protein_pct: 0, sugar_pct: 0, starch_pct: 0, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 0 },
    costPerKg: 10.0,
  },
  {
    name: "Whole Milk",
    category: "Dairy",
    density_g_ml: 1.03,
    composition: { water_pct: 87.7, fat_pct: 3.3, protein_pct: 3.2, sugar_pct: 5.1, starch_pct: 0, salt_pct: 0.1, hydrocolloid_pct: 0, other_pct: 0.6 },
    costPerKg: 1.2,
  },
  {
    name: "Granulated Sugar",
    category: "Sugar & Sweetener",
    density_g_ml: 0.85,
    composition: { water_pct: 0.1, fat_pct: 0, protein_pct: 0, sugar_pct: 99.9, starch_pct: 0, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 0 },
    costPerKg: 1.0,
  },
  {
    name: "Salt",
    category: "Salt",
    density_g_ml: 1.2,
    composition: { water_pct: 0.2, fat_pct: 0, protein_pct: 0, sugar_pct: 0, starch_pct: 0, salt_pct: 99.8, hydrocolloid_pct: 0, other_pct: 0 },
    costPerKg: 0.5,
  },
  {
    name: "Cocoa Powder",
    category: "Flavor",
    density_g_ml: 0.64,
    composition: { water_pct: 3, fat_pct: 13.7, protein_pct: 19.6, sugar_pct: 1.8, starch_pct: 11, salt_pct: 0.1, hydrocolloid_pct: 0, other_pct: 50.8 },
    costPerKg: 12.0,
  },
  {
    name: "Cream Cheese",
    category: "Dairy",
    density_g_ml: 1.05,
    composition: { water_pct: 54.4, fat_pct: 34.4, protein_pct: 5.9, sugar_pct: 3.2, starch_pct: 0, salt_pct: 0.6, hydrocolloid_pct: 0, other_pct: 1.5 },
    costPerKg: 9.0,
  },
  {
    name: "Honey",
    category: "Sugar & Sweetener",
    density_g_ml: 1.42,
    composition: { water_pct: 17.1, fat_pct: 0, protein_pct: 0.3, sugar_pct: 82.1, starch_pct: 0, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 0.5 },
    costPerKg: 15.0,
  },
  {
    name: "Cornstarch",
    category: "Starch",
    density_g_ml: 0.56,
    composition: { water_pct: 8.3, fat_pct: 0.1, protein_pct: 0.3, sugar_pct: 0, starch_pct: 91, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 0.3 },
    costPerKg: 3.0,
  },
  {
    name: "Baking Powder",
    category: "Other",
    density_g_ml: 0.9,
    composition: { water_pct: 5, fat_pct: 0, protein_pct: 0, sugar_pct: 0, starch_pct: 28, salt_pct: 26, hydrocolloid_pct: 0, other_pct: 41 },
    costPerKg: 6.0,
  },
  {
    name: "Garlic",
    category: "Flavor",
    density_g_ml: 1.05,
    composition: { water_pct: 58.6, fat_pct: 0.5, protein_pct: 6.4, sugar_pct: 1, starch_pct: 28.2, salt_pct: 0.1, hydrocolloid_pct: 0, other_pct: 5.2 },
    costPerKg: 8.0,
  },
  {
    name: "Onion",
    category: "Flavor",
    density_g_ml: 0.96,
    composition: { water_pct: 89.1, fat_pct: 0.1, protein_pct: 1.1, sugar_pct: 4.2, starch_pct: 0, salt_pct: 0, hydrocolloid_pct: 0, other_pct: 5.5 },
    costPerKg: 2.0,
  },
];

export default function IngredientsPage() {
  const { data, addIngredient, updateIngredient, deleteIngredient } =
    useStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
      density_g_ml: 1.0,
      composition: { ...EMPTY_COMPOSITION },
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
    setEditing({ ...ing });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!editing) return;
    const updated = { ...editing, updatedAt: new Date().toISOString() };
    if (data.ingredients.find((i) => i.id === updated.id)) {
      updateIngredient(updated);
    } else {
      addIngredient(updated);
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this ingredient?")) {
      deleteIngredient(id);
      if (selectedId === id) setSelectedId(null);
    }
  }

  const selectedCompositionData = selected
    ? COMPONENT_KEYS.map((key) => ({
        name: COMPONENT_LABELS[key],
        value: selected.composition[key],
        color: COMPONENT_COLORS[key],
      }))
    : [];

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
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium">Density</th>
                        <th className="pb-2 font-medium">Cost/kg</th>
                        <th className="pb-2 font-medium">Water %</th>
                        <th className="pb-2 font-medium">Fat %</th>
                        <th className="pb-2 font-medium">Protein %</th>
                        <th className="pb-2 font-medium">Sugar %</th>
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
                          <td className="py-2">
                            <Badge variant="outline" className="text-xs">
                              {ing.category}
                            </Badge>
                          </td>
                          <td className="py-2">{ing.density_g_ml}</td>
                          <td className="py-2">
                            {ing.costPerKg ? `$${ing.costPerKg.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-2">
                            {ing.composition.water_pct}
                          </td>
                          <td className="py-2">
                            {ing.composition.fat_pct}
                          </td>
                          <td className="py-2">
                            {ing.composition.protein_pct}
                          </td>
                          <td className="py-2">
                            {ing.composition.sugar_pct}
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
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
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Density:</span>{" "}
                    {selected.density_g_ml} g/mL
                  </p>
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Confidence:</span>{" "}
                    {(selected.confidence * 100).toFixed(0)}%
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
                    Composition
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={selectedCompositionData}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 9 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={70}
                        tick={{ fontSize: 9 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        name="%"
                        radius={[0, 3, 3, 0]}
                      >
                        {selectedCompositionData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
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
                  <Label>Density (g/mL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.density_g_ml}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        density_g_ml: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost per kg ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.costPerKg}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        costPerKg: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confidence (0–1)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={editing.confidence}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        confidence: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Composition (%)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {COMPONENT_KEYS.map((key) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">
                        {COMPONENT_LABELS[key]}
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editing.composition[key]}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            composition: {
                              ...editing.composition,
                              [key]: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Total:{" "}
                  {COMPONENT_KEYS.reduce(
                    (s, k) => s + editing.composition[k],
                    0
                  ).toFixed(1)}
                  %
                </p>
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
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Common Ingredient</DialogTitle>
            <DialogDescription>
              Click an ingredient to add it to your library instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-1">
            {COMMON_INGREDIENTS.map((item) => {
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
                      density_g_ml: item.density_g_ml,
                      composition: { ...item.composition },
                      source: "",
                      confidence: 0.9,
                      costPerKg: item.costPerKg,
                      substitutions: [],
                      constraints: [],
                      notes: "",
                      createdAt: now,
                      updatedAt: now,
                    });
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
                  <div className="flex items-center gap-2 shrink-0">
                    {alreadyAdded ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Already added
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        W{item.composition.water_pct}% F{item.composition.fat_pct}% P{item.composition.protein_pct}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
