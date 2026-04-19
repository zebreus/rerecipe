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
  COMPONENT_KEYS,
  COMPONENT_LABELS,
  COMPONENT_COLORS,
  type TargetProduct,
  type ComponentComposition,
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
import { Save, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function TargetPage() {
  const { data, updateTarget } = useStore();
  const [target, setTarget] = useState<TargetProduct>(data.targetProduct);
  const [dirty, setDirty] = useState(false);

  const [newAttrValues, setNewAttrValues] = useState<
    Record<keyof TargetProduct["observedAttributes"], string>
  >({ texture: "", flavor: "", color: "", packaging: "" });

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

  function updateComposition(
    key: keyof ComponentComposition,
    val: number
  ) {
    setTarget({
      ...target,
      targetComposition: { ...target.targetComposition, [key]: val },
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
    setNewAttrValues(prev => ({ ...prev, [category]: "" }));
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

  const compositionData = COMPONENT_KEYS.map((key) => ({
    name: COMPONENT_LABELS[key],
    value: target.targetComposition[key],
    color: COMPONENT_COLORS[key],
  }));

  const totalPct = COMPONENT_KEYS.reduce(
    (sum, key) => sum + target.targetComposition[key],
    0
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
          <TabsTrigger value="composition">Composition</TabsTrigger>
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
                      updateField("targetMassG", Math.max(0, Number(e.target.value)))
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
                      updateField("targetVolumeMl", Math.max(0, Number(e.target.value)))
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

        <TabsContent value="composition">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Target Composition (%)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {COMPONENT_KEYS.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COMPONENT_COLORS[key] }}
                    />
                    <Label className="w-24 text-xs">
                      {COMPONENT_LABELS[key]}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-24"
                      value={target.targetComposition[key]}
                      onChange={(e) =>
                        updateComposition(key, Math.max(0, Math.min(100, Number(e.target.value))))
                      }
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500">%</span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between text-sm">
                  <span className="font-medium">Total</span>
                  <span
                    className={
                      Math.abs(totalPct - 100) < 0.5
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : Math.abs(totalPct - 100) < 2
                        ? "text-yellow-600 dark:text-yellow-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {totalPct.toFixed(1)}%
                    {Math.abs(totalPct - 100) < 0.5
                      ? " ✓"
                      : Math.abs(totalPct - 100) < 2
                      ? " ≈"
                      : " ✗"}
                  </span>
                </div>
                {Math.abs(totalPct - 100) >= 2 && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    Composition should sum to ~100%. Currently off by{" "}
                    {Math.abs(totalPct - 100).toFixed(1)}%.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Composition Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={compositionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" name="%" radius={[0, 4, 4, 0]}>
                      {compositionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attributes">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {(
                ["texture", "flavor", "color", "packaging"] as const
              ).map((category) => (
                <div key={category} className="space-y-2">
                  <Label className="capitalize text-sm font-medium">
                    {category}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {target.observedAttributes[category].map(
                      (attr, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="gap-1"
                        >
                          {attr}
                          <button
                            onClick={() =>
                              removeAttribute(category, idx)
                            }
                            className="ml-0.5 hover:text-red-600 dark:hover:text-red-400"
                            aria-label={`Remove ${attr}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Add ${category}...`}
                      className="max-w-xs"
                      value={newAttrValues[category] || ""}
                      onChange={(e) =>
                        setNewAttrValues(prev => ({ ...prev, [category]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addAttribute(category, newAttrValues[category] || "");
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
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
