"use client";

import { useState, useMemo } from "react";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  TestTube,
  AlertTriangle,
  Play,
} from "lucide-react";
import type { Protocol, ProtocolStep, ProtocolContainer, ContainerType, Trial } from "@/lib/types";
import { generateId, statusColor } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ProtocolDetailClient({ id }: { id: string }) {
  const { data, updateProtocol, addTrial } = useStore();
  const router = useRouter();

  const ingredientById = useMemo(() => {
    const map = new Map<string, (typeof data.ingredients)[number]>();
    for (const ing of data.ingredients) {
      map.set(ing.id, ing);
    }
    return map;
  }, [data.ingredients]);

  const protocol = data.protocols.find((p) => p.id === id);
  const [local, setLocal] = useState<Protocol | null>(
    protocol ? structuredClone(protocol) : null
  );
  const [dirty, setDirty] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [newTrialFormulaId, setNewTrialFormulaId] = useState("");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const relatedTrials = data.trials.filter((t) => t.protocolId === id);
  const hasTrials = relatedTrials.length > 0;

  if (!local) {
    return (
      <div className="space-y-4">
        <Link href="/protocols">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <p className="text-gray-500 dark:text-gray-400">Protocol not found.</p>
      </div>
    );
  }

  function handleSaveClick() {
    if (hasTrials) {
      setConfirmSaveOpen(true);
    } else {
      save();
    }
  }

  function save() {
    if (!local) return;
    const newVersion = (local.version || 1) + 1;
    updateProtocol({ ...local, version: newVersion });
    setLocal({ ...local, version: newVersion });
    setDirty(false);
    setConfirmSaveOpen(false);
  }

  function createTrialAndNavigate(mode?: "run") {
    if (!newTrialFormulaId || !local) return;
    const now = new Date().toISOString();
    const runNumber = data.trials.filter((t) => t.formulaId === newTrialFormulaId).length + 1;
    const t: Trial = {
      id: generateId(),
      formulaId: newTrialFormulaId,
      protocolId: local.id,
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
      stepLogs: [],
      containerStates: [],
    };
    addTrial(t);
    setTrialDialogOpen(false);
    setNewTrialFormulaId("");
    router.push(mode === "run" ? `/trials?id=${t.id}&mode=run` : `/trials?id=${t.id}`);
  }

  function handleCreateTrial() {
    createTrialAndNavigate();
  }

  function handleCreateAndRunTrial() {
    createTrialAndNavigate("run");
  }

  function update(partial: Partial<Protocol>) {
    if (!local) return;
    setLocal({ ...local, ...partial, updatedAt: new Date().toISOString() });
    setDirty(true);
  }

  function addStep() {
    const newStep: ProtocolStep = {
      id: generateId(),
      order: local!.steps.length + 1,
      name: "",
      description: "",
      containerId: null,
      temperatureC: null,
      duration: { type: "fixed" },
      containerAgitation: {},
      additions: [],
      holdConditions: "",
      expectedEffects: [],
      requiresStartConfirmation: false,
    };
    update({ steps: [...local!.steps, newStep] });
  }

  function updateStep(index: number, partial: Partial<ProtocolStep>) {
    const steps = local!.steps.map((s, i) =>
      i === index ? { ...s, ...partial } : s
    );
    update({ steps });
  }

  function removeStep(index: number) {
    const steps = local!.steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i + 1 }));
    update({ steps });
  }

  function moveStep(index: number, direction: "up" | "down") {
    const steps = [...local!.steps];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    update({ steps: steps.map((s, i) => ({ ...s, order: i + 1 })) });
  }

  // ─── Container helpers ───
  function addContainer() {
    const newContainer: ProtocolContainer = {
      id: generateId(),
      name: "",
      type: "pot",
    };
    update({ containers: [...(local!.containers || []), newContainer] });
  }

  function updateContainer(index: number, partial: Partial<ProtocolContainer>) {
    const containers = (local!.containers || []).map((c, i) =>
      i === index ? { ...c, ...partial } : c
    );
    update({ containers });
  }

  function removeContainer(index: number) {
    const containerToRemove = (local!.containers || [])[index];
    if (!containerToRemove) return;

    const containers = (local!.containers || []).filter((_, i) => i !== index);
    const steps = local!.steps.map((step) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [containerToRemove.id]: _removedAgitation, ...remainingAgitation } =
        step.containerAgitation || {};
      return {
        ...step,
        containerId:
          step.containerId === containerToRemove.id ? null : step.containerId,
        containerAgitation: remainingAgitation,
        additions: (step.additions || []).map((addition) => ({
          ...addition,
          containerId:
            addition.containerId === containerToRemove.id
              ? undefined
              : addition.containerId,
        })),
      };
    });
    update({ containers, steps });
  }

  // Timeline chart data
  const timelineData = local.steps
    .filter((s) => {
      const dur = s.duration?.durationMin ?? s.durationMin;
      return dur != null;
    })
    .map((s) => {
      const dur = s.duration?.durationMin ?? s.durationMin ?? 0;
      return {
        name: s.name || `Step ${s.order}`,
        duration: Math.round(dur * scaleFactor * 10) / 10,
        temp: s.temperatureC || 0,
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/protocols">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to protocols">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{local.name}</h1>
            <div className="flex gap-2 mt-0.5">
              <Badge variant="outline">{local.category}</Badge>
              <Badge variant="secondary">v{local.version}</Badge>
              <Badge variant="secondary">
                {local.steps.length} step{local.steps.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setNewTrialFormulaId("");
              setTrialDialogOpen(true);
            }}
          >
            <TestTube className="h-4 w-4 mr-1" /> Create Trial
          </Button>
          <Button onClick={handleSaveClick} disabled={!dirty}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Warning banner for protocols with trials */}
      {hasTrials && (
        <div className="rounded-md px-4 py-3 text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This protocol is referenced by {relatedTrials.length} trial{relatedTrials.length !== 1 ? "s" : ""}. Editing it may affect trial data integrity.
          </span>
        </div>
      )}

      {/* Scale-Up Calculator */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium whitespace-nowrap">Scale Factor:</Label>
            <Input
              type="number"
              step="0.5"
              min="0.1"
              className="w-24 h-8"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(Number(e.target.value) || 1)}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {scaleFactor === 1 ? "Original scale" : `${scaleFactor}× original`}
            </span>
            {scaleFactor !== 1 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setScaleFactor(1)}>
                Reset
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Adjusts displayed durations for production scale-up. Display only — does not change saved data.
          </p>
        </CardContent>
      </Card>

      {/* Protocol Info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={local.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={local.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={local.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline visualization */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Process Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis
                  yAxisId="dur"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "min",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 10 },
                  }}
                />
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "°C",
                    angle: 90,
                    position: "insideRight",
                    style: { fontSize: 10 },
                  }}
                />
                <Tooltip />
                <Bar
                  yAxisId="dur"
                  dataKey="duration"
                  fill="#6366f1"
                  name="Duration (min)"
                />
                <Bar
                  yAxisId="temp"
                  dataKey="temp"
                  fill="#ef4444"
                  name="Temp (°C)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Containers section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Containers</CardTitle>
          <Button size="sm" variant="outline" onClick={addContainer}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Container
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(local.containers || []).length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No containers defined. Add containers to enable per-container settings in steps.
            </p>
          ) : (
            (local.containers || []).map((container, idx) => (
              <div key={container.id} className="flex items-center gap-2 border rounded p-3 bg-gray-50 dark:bg-gray-900">
                <Input
                  placeholder="Container name"
                  className="flex-1 h-8"
                  value={container.name}
                  onChange={(e) => updateContainer(idx, { name: e.target.value })}
                />
                <Select
                  value={container.type}
                  onValueChange={(v) => updateContainer(idx, { type: v as ContainerType })}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pot">Pot</SelectItem>
                    <SelectItem value="bowl">Bowl</SelectItem>
                    <SelectItem value="jar">Jar</SelectItem>
                    <SelectItem value="pitcher">Pitcher</SelectItem>
                    <SelectItem value="pressure-cooker">Pressure Cooker</SelectItem>
                    <SelectItem value="pan">Pan</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Capacity (ml)"
                  className="w-32 h-8"
                  value={container.capacityMl ?? ""}
                  onChange={(e) =>
                    updateContainer(idx, {
                      capacityMl: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 dark:text-red-400"
                  onClick={() => removeContainer(idx)}
                  aria-label={`Remove container ${container.name || idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Steps editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Steps</CardTitle>
          <Button size="sm" variant="outline" onClick={addStep}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {local.steps.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              No steps yet. Add your first process step.
            </p>
          ) : (
            local.steps.map((step, idx) => {
              const containers = local.containers || [];
              const durType = step.duration?.type ?? "fixed";
              const durMin = step.duration?.durationMin ?? step.durationMin;
              const eventDesc = step.duration?.eventDescription ?? "";

              return (
                <div
                  key={step.id}
                  className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
                >
                  {/* Step header: number, name, move/delete */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6">
                      #{step.order}
                    </span>
                    <Input
                      placeholder="Step name"
                      className="flex-1 h-8 font-medium"
                      value={step.name}
                      onChange={(e) => updateStep(idx, { name: e.target.value })}
                    />
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, "up")}
                        aria-label={`Move step ${step.name || idx + 1} up`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === local.steps.length - 1}
                        onClick={() => moveStep(idx, "down")}
                        aria-label={`Move step ${step.name || idx + 1} down`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 dark:text-red-400"
                        onClick={() => removeStep(idx)}
                        aria-label={`Remove step ${step.name || idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Primary container + temperature */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Primary Container</Label>
                      <Select
                        value={step.containerId ?? "__none__"}
                        onValueChange={(v) =>
                          updateStep(idx, { containerId: v === "__none__" ? null : v })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {containers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name || `Container ${c.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Target Temp °C</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={step.temperatureC ?? ""}
                        onChange={(e) =>
                          updateStep(idx, {
                            temperatureC: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Duration section */}
                  <div className="space-y-2">
                    <Label className="text-xs">Duration Type</Label>
                    <div className="flex gap-3">
                      {(["fixed", "after-event", "user-confirm"] as const).map((t) => (
                        <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name={`dur-type-${step.id}`}
                            value={t}
                            checked={durType === t}
                            onChange={() =>
                              updateStep(idx, {
                                duration: {
                                  ...step.duration,
                                  type: t,
                                },
                              })
                            }
                          />
                          {t === "fixed" ? "Fixed Time" : t === "after-event" ? "After Event" : "User Confirm"}
                        </label>
                      ))}
                    </div>
                    {durType === "fixed" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Duration (min)</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-32"
                          value={durMin ?? ""}
                          onChange={(e) =>
                            updateStep(idx, {
                              duration: {
                                ...step.duration,
                                type: "fixed",
                                durationMin: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                              },
                            })
                          }
                        />
                        {scaleFactor !== 1 && durMin != null && (
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                            → {Math.round(durMin * scaleFactor * 10) / 10} min at {scaleFactor}×
                          </p>
                        )}
                      </div>
                    )}
                    {durType === "after-event" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Event Description</Label>
                          <Input
                            className="h-8"
                            placeholder="e.g. pot reaches 85°C"
                            value={eventDesc}
                            onChange={(e) =>
                              updateStep(idx, {
                                duration: {
                                  ...step.duration,
                                  type: "after-event",
                                  eventDescription: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Wait after event (min)</Label>
                          <Input
                            type="number"
                            min="0"
                            className="h-8"
                            value={durMin ?? ""}
                            onChange={(e) =>
                              updateStep(idx, {
                                duration: {
                                  ...step.duration,
                                  type: "after-event",
                                  durationMin: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                    {durType === "user-confirm" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        User advances manually — no timer.
                      </p>
                    )}
                  </div>

                  {/* Per-container agitation */}
                  {containers.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Container Agitation</Label>
                      <div className="space-y-1">
                        {containers.map((c) => {
                          const agit = step.containerAgitation?.[c.id] ?? "none";
                          return (
                            <div key={c.id} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-28 truncate">
                                {c.name || c.id}
                              </span>
                              <Select
                                value={agit}
                                onValueChange={(v) =>
                                  updateStep(idx, {
                                    containerAgitation: {
                                      ...step.containerAgitation,
                                      [c.id]: v as "none" | "low" | "medium" | "high",
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ingredient additions */}
                  <div className="space-y-1">
                    <Label className="text-xs">Ingredient Additions</Label>
                    {(step.additions || []).length > 0 && (
                      <div className="space-y-1 mb-1">
                        {(step.additions || []).map((addition, addIdx) => {
                          const ing = ingredientById.get(addition.ingredientId);
                          const cont = containers.find((c) => c.id === addition.containerId);
                          return (
                            <div key={addIdx} className="flex items-center gap-2 text-xs">
                              <span className="flex-1 text-gray-700 dark:text-gray-300">
                                {ing?.name || addition.ingredientId}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                className="h-7 w-20 text-xs"
                                value={addition.massG}
                                onChange={(e) => {
                                  const additions = (step.additions || []).map((a, ai) =>
                                    ai === addIdx ? { ...a, massG: Number(e.target.value) } : a
                                  );
                                  updateStep(idx, { additions });
                                }}
                              />
                              <span className="text-gray-400">g</span>
                              <Select
                                value={containers.some((c) => c.id === addition.containerId) ? addition.containerId : undefined}
                                onValueChange={(v) => {
                                  const additions = (step.additions || []).map((a, ai) =>
                                    ai === addIdx ? { ...a, containerId: v } : a
                                  );
                                  updateStep(idx, { additions });
                                }}
                                disabled={containers.length === 0}
                              >
                                <SelectTrigger className="h-7 w-28">
                                  <SelectValue placeholder={containers.length === 0 ? "No containers" : "Container"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {containers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name || c.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {cont && (
                                <span className="text-gray-400 text-[10px] hidden sm:block">→ {cont.name}</span>
                              )}
                              <button
                                type="button"
                                aria-label="Remove addition"
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                onClick={() => {
                                  const additions = (step.additions || []).filter((_, ai) => ai !== addIdx);
                                  updateStep(idx, { additions });
                                }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Select
                      value="__none__"
                      onValueChange={(v) => {
                        if (v === "__none__") return;
                        const existing = step.additions || [];
                        if (existing.some((a) => a.ingredientId === v)) return;
                        updateStep(idx, {
                          additions: [
                            ...existing,
                            {
                              ingredientId: v,
                              massG: 0,
                              containerId: step.containerId || (containers[0]?.id ?? ""),
                            },
                          ],
                        });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Add ingredient…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          {(step.additions || []).length === 0 ? "None" : "Add another…"}
                        </SelectItem>
                        {data.ingredients
                          .filter((ing) => !(step.additions || []).some((a) => a.ingredientId === ing.id))
                          .map((ing) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start confirmation checkbox */}
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step.requiresStartConfirmation ?? false}
                      onChange={(e) =>
                        updateStep(idx, { requiresStartConfirmation: e.target.checked })
                      }
                    />
                    <span className="text-gray-700 dark:text-gray-300">Require user to confirm when step starts</span>
                  </label>

                  {/* Description */}
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      className="min-h-[40px]"
                      value={step.description}
                      onChange={(e) => updateStep(idx, { description: e.target.value })}
                      rows={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hold Conditions</Label>
                    <Input
                      className="h-8"
                      value={step.holdConditions}
                      onChange={(e) => updateStep(idx, { holdConditions: e.target.value })}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Risk flags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expected Effects & Risk Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Expected Effects (comma-separated)</Label>
            <Input
              value={local.expectedEffects.join(", ")}
              onChange={(e) =>
                update({
                  expectedEffects: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Risk Flags (comma-separated)</Label>
            <Input
              value={local.riskFlags.join(", ")}
              onChange={(e) =>
                update({
                  riskFlags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Related Trials */}
      {(() => {
        const relatedTrials = data.trials.filter((t) => t.protocolId === local.id);
        if (relatedTrials.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related Trials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {relatedTrials.map((trial) => {
                  const trialFormula = data.formulas.find((f) => f.id === trial.formulaId);
                  return (
                    <div key={trial.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center gap-3">
                        <Link href={`/trials?id=${trial.id}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                          Trial #{trial.runNumber}
                        </Link>
                        <Badge className={statusColor(trial.status)} variant="outline">
                          {trial.status}
                        </Badge>
                        {trialFormula && (
                          <Link href={`/formulas?id=${trialFormula.id}`}>
                            <Badge variant="secondary" className="text-xs hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                              {trialFormula.name}
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
              Create a new trial using &quot;{local.name}&quot;. Select a formula to test with.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Formula</Label>
              <Select value={newTrialFormulaId} onValueChange={setNewTrialFormulaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select formula..." />
                </SelectTrigger>
                <SelectContent>
                  {data.formulas.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
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
            <Button onClick={handleCreateTrial} disabled={!newTrialFormulaId}>
              Create Trial
            </Button>
            <Button onClick={handleCreateAndRunTrial} disabled={!newTrialFormulaId}>
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
              This protocol is referenced by {relatedTrials.length} trial{relatedTrials.length !== 1 ? "s" : ""}.
              Saving changes will update this protocol, and existing trials that reference it may display the updated protocol details.
              The protocol version will be incremented.
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
