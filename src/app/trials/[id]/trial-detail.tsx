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
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import type {
  Trial,
  TrialObservation,
  TrialMeasurement,
  ScoringDimension,
} from "@/lib/types";
import { COMPONENT_KEYS, COMPONENT_LABELS } from "@/lib/types";
import { statusColor } from "@/lib/utils";
import { calculateSimilarityScore, calculateFormulaComponents, componentsToPercent, checkCompliance } from "@/lib/solver";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function TrialDetailClient({ id }: { id: string }) {
  const { data, updateTrial } = useStore();

  const trial = data.trials.find((t) => t.id === id);
  const [local, setLocal] = useState<Trial | null>(
    trial ? structuredClone(trial) : null
  );
  const [dirty, setDirty] = useState(false);
  const [paramDialogOpen, setParamDialogOpen] = useState(false);
  const [newParamName, setNewParamName] = useState("");

  if (!local) {
    return (
      <div className="space-y-4">
        <Link href="/trials">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <p className="text-gray-500 dark:text-gray-400">Trial not found.</p>
      </div>
    );
  }

  const formula = data.formulas.find((f) => f.id === local.formulaId);
  const protocol = data.protocols.find((p) => p.id === local.protocolId);

  function save() {
    if (!local) return;
    const simScore = calculateSimilarityScore(local);
    updateTrial({
      ...local,
      similarityScore: simScore,
      updatedAt: new Date().toISOString(),
    });
    setDirty(false);
  }

  function update(partial: Partial<Trial>) {
    if (!local) return;
    setLocal({ ...local, ...partial });
    setDirty(true);
  }

  // ─── Observations ───
  function addObservation() {
    update({
      observations: [
        ...local!.observations,
        {
          category: "General",
          value: "",
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  function updateObservation(
    idx: number,
    partial: Partial<TrialObservation>
  ) {
    const obs = local!.observations.map((o, i) =>
      i === idx ? { ...o, ...partial } : o
    );
    update({ observations: obs });
  }

  function removeObservation(idx: number) {
    update({
      observations: local!.observations.filter((_, i) => i !== idx),
    });
  }

  // ─── Measurements ───
  function addMeasurement() {
    update({
      measurements: [
        ...local!.measurements,
        { name: "", value: 0, unit: "" },
      ],
    });
  }

  function updateMeasurement(
    idx: number,
    partial: Partial<TrialMeasurement>
  ) {
    const meas = local!.measurements.map((m, i) =>
      i === idx ? { ...m, ...partial } : m
    );
    update({ measurements: meas });
  }

  function removeMeasurement(idx: number) {
    update({
      measurements: local!.measurements.filter((_, i) => i !== idx),
    });
  }

  // ─── Scores ───
  function updateScore(idx: number, partial: Partial<ScoringDimension>) {
    if (partial.score !== undefined) {
      partial.score = Math.max(0, Math.min(10, partial.score));
    }
    const scores = local!.scores.map((s, i) =>
      i === idx ? { ...s, ...partial } : s
    );
    update({ scores });
  }

  // Radar chart data
  const radarData = local.scores.map((s) => ({
    dimension: s.name,
    score: s.score,
    fullMark: 10,
  }));

  const simScore = calculateSimilarityScore(local);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/trials">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to trials">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Trial #{local.runNumber}
            </h1>
            <div className="flex gap-2 mt-0.5">
              <Badge className={statusColor(local.status)} variant="outline">
                {local.status}
              </Badge>
              <Badge variant="secondary">{simScore.toFixed(0)}% score</Badge>
            </div>
          </div>
        </div>
        <Button onClick={save} disabled={!dirty}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Formula</p>
            {formula ? (
              <Link href={`/formulas?id=${formula.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                {formula.name}
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Protocol</p>
            {protocol ? (
              <Link href={`/protocols?id=${protocol.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                {protocol.name}
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <Select
              value={local.status}
              onValueChange={(v) =>
                update({ status: v as Trial["status"] })
              }
            >
              <SelectTrigger className="mt-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scoring">
        <TabsList>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="deviations">Deviations</TabsTrigger>
        </TabsList>

        {/* Scoring */}
        <TabsContent value="scoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {local.scores.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Label className="w-32 text-xs truncate">{s.name}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      className="w-20 h-8"
                      value={s.score}
                      onChange={(e) =>
                        updateScore(idx, {
                          score: Number(e.target.value),
                        })
                      }
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500">/10</span>
                    <Input
                      className="flex-1 h-8"
                      placeholder="Notes..."
                      value={s.notes}
                      onChange={(e) =>
                        updateScore(idx, { notes: e.target.value })
                      }
                    />
                  </div>
                ))}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Weighted Score
                  </span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {simScore.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Radar</CardTitle>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fontSize: 10 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 10]}
                        tick={{ fontSize: 9 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.3}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No scores yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Observations */}
        <TabsContent value="observations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Observations</CardTitle>
              <Button size="sm" variant="outline" onClick={addObservation}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {local.observations.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  No observations recorded.
                </p>
              ) : (
                local.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 border rounded p-2"
                  >
                    <Input
                      className="w-28 h-8"
                      placeholder="Category"
                      value={obs.category}
                      onChange={(e) =>
                        updateObservation(idx, {
                          category: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="flex-1 h-8"
                      placeholder="Observation..."
                      value={obs.value}
                      onChange={(e) =>
                        updateObservation(idx, {
                          value: e.target.value,
                        })
                      }
                    />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap self-center">
                      {new Date(obs.timestamp).toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 dark:text-red-400 shrink-0"
                      onClick={() => removeObservation(idx)}
                      aria-label={`Remove observation ${obs.category}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Measurements */}
        <TabsContent value="measurements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Measurements</CardTitle>
              <Button size="sm" variant="outline" onClick={addMeasurement}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {local.measurements.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  No measurements recorded.
                </p>
              ) : (
                local.measurements.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 border rounded p-2"
                  >
                    <Input
                      className="w-36 h-8"
                      placeholder="Name"
                      value={m.name}
                      onChange={(e) =>
                        updateMeasurement(idx, { name: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      className="w-24 h-8"
                      placeholder="Value"
                      value={m.value}
                      onChange={(e) =>
                        updateMeasurement(idx, {
                          value: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      className="w-20 h-8"
                      placeholder="Unit"
                      value={m.unit}
                      onChange={(e) =>
                        updateMeasurement(idx, { unit: e.target.value })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 dark:text-red-400 shrink-0"
                      onClick={() => removeMeasurement(idx)}
                      aria-label={`Remove measurement ${m.name || idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parameters */}
        <TabsContent value="parameters">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actual Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(local.actualParameters).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <Input
                    className="w-40 h-8"
                    value={key}
                    readOnly
                  />
                  <Input
                    className="flex-1 h-8"
                    value={val}
                    onChange={(e) => {
                      const params = { ...local!.actualParameters };
                      params[key] = e.target.value;
                      update({ actualParameters: params });
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewParamName("");
                  setParamDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Parameter
              </Button>

              <Dialog open={paramDialogOpen} onOpenChange={setParamDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Parameter</DialogTitle>
                    <DialogDescription>
                      Enter a name for the new parameter (e.g. &quot;Actual Temp&quot;, &quot;pH&quot;).
                    </DialogDescription>
                  </DialogHeader>
                  {(() => {
                    const trimmed = newParamName.trim();
                    const isDuplicate =
                      trimmed !== "" &&
                      Object.keys(local!.actualParameters).some(
                        (k) => k.toLowerCase() === trimmed.toLowerCase()
                      );
                    const canAdd = trimmed !== "" && !isDuplicate;

                    const addParam = () => {
                      if (!canAdd) return;
                      update({
                        actualParameters: {
                          ...local!.actualParameters,
                          [trimmed]: "",
                        },
                      });
                      setParamDialogOpen(false);
                    };

                    return (
                      <>
                        <div className="space-y-2">
                          <Label>Parameter Name</Label>
                          <Input
                            value={newParamName}
                            onChange={(e) => setNewParamName(e.target.value)}
                            placeholder="e.g. Actual Temperature"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addParam();
                            }}
                          />
                          {isDuplicate && (
                            <p className="text-xs text-red-500 dark:text-red-400">
                              A parameter named &quot;{trimmed}&quot; already exists.
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setParamDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={addParam} disabled={!canAdd}>
                            Add
                          </Button>
                        </DialogFooter>
                      </>
                    );
                  })()}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6">
              <Textarea
                value={local.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Trial notes, findings, next steps..."
                rows={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deviations */}
        <TabsContent value="deviations">
          {!formula ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  No formula linked to this trial.
                </p>
              </CardContent>
            </Card>
          ) : (() => {
            const trialComps = calculateFormulaComponents(formula.ingredientLines, data.ingredients);
            const trialPct = componentsToPercent(trialComps);
            const compliance = checkCompliance(trialPct, data.targetProduct.targetComposition);
            const significantDeviations = compliance.deviations.length;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Compliance Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overall Compliance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center gap-3">
                      <span
                        className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${
                          compliance.status === "compliant"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : compliance.status === "warning"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {compliance.status === "compliant"
                          ? "✓ Compliant"
                          : compliance.status === "warning"
                          ? "⚠ Warning"
                          : "✗ Non-compliant"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Max Deviation</p>
                        <p className="text-xl font-bold">{compliance.maxDeviation.toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Components &gt; 2%</p>
                        <p className="text-xl font-bold">{significantDeviations}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Component Deviations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Component Deviations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 pb-1 border-b">
                        <span>Component</span>
                        <span className="text-right">Formula</span>
                        <span className="text-right">Target</span>
                        <span className="text-right">Diff</span>
                        <span className="text-right">Status</span>
                      </div>
                      {COMPONENT_KEYS.map((key) => {
                        const formulaVal = trialPct[key];
                        const targetVal = data.targetProduct.targetComposition[key];
                        const diff = formulaVal - targetVal;
                        const absDiff = Math.abs(diff);
                        const direction = diff > 0 ? "over" : "under";

                        return (
                          <div key={key} className="grid grid-cols-5 gap-2 text-sm items-center py-1">
                            <span className="font-medium truncate">{COMPONENT_LABELS[key]}</span>
                            <span className="text-right">{formulaVal.toFixed(1)}%</span>
                            <span className="text-right">{targetVal.toFixed(1)}%</span>
                            <span className="text-right">
                              {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                            </span>
                            <span className="text-right">
                              {absDiff <= 2 ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                  OK
                                </Badge>
                              ) : absDiff <= 5 ? (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                                  {absDiff.toFixed(1)}% {direction}
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                                  {absDiff.toFixed(1)}% {direction}
                                </Badge>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
