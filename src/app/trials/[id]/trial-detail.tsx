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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import type {
  Trial,
  TrialObservation,
  TrialMeasurement,
  ScoringDimension,
} from "@/lib/types";
import { statusColor } from "@/lib/utils";
import { calculateSimilarityScore } from "@/lib/solver";
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

  if (!local) {
    return (
      <div className="space-y-4">
        <Link href="/trials">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <p className="text-gray-500">Trial not found.</p>
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
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
            <p className="text-xs text-gray-500">Formula</p>
            <p className="font-medium">{formula?.name || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Protocol</p>
            <p className="font-medium">{protocol?.name || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Status</p>
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
                    <span className="text-xs text-gray-400">/10</span>
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
                  <span className="text-2xl font-bold text-indigo-600">
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
                  <p className="text-sm text-gray-400">No scores yet.</p>
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
                <p className="text-sm text-gray-400 text-center py-6">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 shrink-0"
                      onClick={() => removeObservation(idx)}
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
                <p className="text-sm text-gray-400 text-center py-6">
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
                      className="h-8 w-8 text-red-500 shrink-0"
                      onClick={() => removeMeasurement(idx)}
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
                  const key = prompt("Parameter name:");
                  if (key) {
                    update({
                      actualParameters: {
                        ...local!.actualParameters,
                        [key]: "",
                      },
                    });
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Parameter
              </Button>
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
      </Tabs>
    </div>
  );
}
