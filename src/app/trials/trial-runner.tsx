"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Clock,
  Thermometer,
  Beaker,
  Wind,
  Send,
  AlertCircle,
  Timer,
} from "lucide-react";
import type { Trial, TrialObservation, ProtocolStep } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

// ─── Web Audio API beep ───
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

function playBeep() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.value = 0.3;
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.stop(ctx.currentTime + 0.5);
    // play a second beep after a short gap
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.value = 0.3;
    osc2.start(ctx.currentTime + 0.6);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    osc2.stop(ctx.currentTime + 1.1);
  } catch {
    // Audio not available
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function agitationLabel(level: string): string {
  switch (level) {
    case "none":
      return "No agitation";
    case "low":
      return "Low agitation";
    case "medium":
      return "Medium agitation";
    case "high":
      return "High agitation";
    default:
      return level;
  }
}

function agitationColor(level: string): string {
  switch (level) {
    case "none":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "low":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "medium":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "high":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

const AUTO_ADVANCE_DELAY_MS = 1500;
const SCROLL_INTO_VIEW_DELAY_MS = 100;
const DEFAULT_OBSERVATION_CATEGORY = "General";

export default function TrialRunnerClient({ id }: { id: string }) {
  const { data, updateTrial } = useStore();

  const trial = data.trials.find((t) => t.id === id);
  const protocol = trial
    ? data.protocols.find((p) => p.id === trial.protocolId)
    : undefined;
  const steps = useMemo(
    () => protocol
      ? [...protocol.steps].sort((a, b) => a.order - b.order)
      : [],
    [protocol]
  );

  // ─── Infer initial step from most recent observation's stepId ───
  const inferredStepIndex = useMemo(() => {
    if (!trial || trial.status !== "in-progress") return 0;
    const obs = trial.observations;
    if (!obs || obs.length === 0) return 0;
    const lastObs = obs[obs.length - 1];
    if (!lastObs.stepId) return 0;
    const idx = steps.findIndex((s) => s.id === lastObs.stepId);
    return idx >= 0 ? idx : 0;
  }, [trial, steps]);

  // ─── State ───
  const [currentStepIndex, setCurrentStepIndex] = useState(inferredStepIndex);
  const initialStep = steps[inferredStepIndex];
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(
    initialStep?.durationMin != null ? initialStep.durationMin * 60 : null
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(
    trial?.startedAt || null
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [observationText, setObservationText] = useState("");
  const [trialStatus, setTrialStatus] = useState<Trial["status"]>(
    trial?.status || "planned"
  );
  const [observations, setObservations] = useState<TrialObservation[]>(
    trial?.observations || []
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observationInputRef = useRef<HTMLInputElement>(null);
  const observationLogRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep: ProtocolStep | undefined = steps[currentStepIndex];

  // ─── Persist observations to store ───
  const persistTrial = useCallback(
    (updates: Partial<Trial>) => {
      if (!trial) return;
      updateTrial({
        ...trial,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    },
    [trial, updateTrial]
  );

  const goToStep = useCallback((idx: number) => {
    if (idx >= 0 && idx < steps.length) {
      setCurrentStepIndex(idx);
      const nextStep = steps[idx];
      if (nextStep?.durationMin != null) {
        setTimerSecondsLeft(nextStep.durationMin * 60);
      } else {
        setTimerSecondsLeft(null);
      }
      setTimerRunning(false);
      // Cancel any pending scroll before scheduling a new one
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Scroll the target step into view after DOM update
      scrollTimeoutRef.current = setTimeout(() => {
        const el = stepRefs.current.get(idx);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        scrollTimeoutRef.current = null;
      }, SCROLL_INTO_VIEW_DELAY_MS);
    }
  }, [steps]);

  // ─── Step countdown timer ───
  useEffect(() => {
    if (!timerRunning) {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    timerRef.current = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev === null) {
          setTimerRunning(false);
          return null;
        }
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // ─── Auto-advance when timer reaches zero ───
  useEffect(() => {
    if (timerSecondsLeft === 0 && !timerRunning) {
      playBeep();
      const timeout = setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
          goToStep(currentStepIndex + 1);
        }
      }, AUTO_ADVANCE_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [timerSecondsLeft, timerRunning, currentStepIndex, steps.length, goToStep]);

  // ─── Elapsed time since trial start ───
  useEffect(() => {
    if (trialStartedAt && trialStatus === "in-progress") {
      const updateElapsed = () => {
        const diff = Math.floor(
          (Date.now() - new Date(trialStartedAt).getTime()) / 1000
        );
        setElapsedSeconds(Math.max(0, diff));
      };
      updateElapsed();
      elapsedRef.current = setInterval(updateElapsed, 1000);
    } else {
      if (elapsedRef.current) {
        clearInterval(elapsedRef.current);
        elapsedRef.current = null;
      }
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [trialStartedAt, trialStatus]);

  // ─── Scroll observation log to bottom ───
  useEffect(() => {
    if (observationLogRef.current) {
      observationLogRef.current.scrollTop =
        observationLogRef.current.scrollHeight;
    }
  }, [observations.length]);

  // ─── Cleanup pending scroll timeout on unmount ───
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // ─── Handlers ───
  function handleStartTrial() {
    const now = new Date().toISOString();
    setTrialStartedAt(now);
    setTrialStatus("in-progress");
    setCurrentStepIndex(0);
    persistTrial({
      status: "in-progress",
      startedAt: now,
    });
  }

  function handleCompleteTrial() {
    const now = new Date().toISOString();
    setTimerRunning(false);
    setTrialStatus("completed");
    persistTrial({
      status: "completed",
      completedAt: now,
      observations,
    });
  }

  function handleAddObservation() {
    const text = observationText.trim();
    if (!text) return;
    const obs: TrialObservation = {
      category: currentStep ? currentStep.name : DEFAULT_OBSERVATION_CATEGORY,
      value: text,
      timestamp: new Date().toISOString(),
      stepId: currentStep?.id,
    };
    const updated = [...observations, obs];
    setObservations(updated);
    setObservationText("");
    persistTrial({ observations: updated });
    observationInputRef.current?.focus();
  }

  function handleTimerPlay() {
    setTimerRunning(true);
  }

  function handleTimerPause() {
    setTimerRunning(false);
  }

  function handleTimerReset() {
    setTimerRunning(false);
    if (currentStep?.durationMin != null) {
      setTimerSecondsLeft(currentStep.durationMin * 60);
    }
  }

  // ─── Render guards ───
  if (!trial) {
    return (
      <div className="space-y-4 p-4">
        <Link href="/trials">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to trials
          </Button>
        </Link>
        <p className="text-gray-500 dark:text-gray-400">Trial not found.</p>
      </div>
    );
  }

  if (!protocol || steps.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <Link href={`/trials?id=${trial.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to trial
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <p>
                This trial has no protocol assigned or the protocol has no
                steps. Please assign a protocol with steps before running.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isStarted = trialStatus === "in-progress";
  const isCompleted =
    trialStatus === "completed" || trialStatus === "failed" || trialStatus === "abandoned";
  const isLastStep = currentStepIndex === steps.length - 1;

  const ingredientMap = new Map(
    data.ingredients.map((ing) => [ing.id, ing.name])
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)]">
      {/* ─── Header ─── */}
      <div className="shrink-0 border-b border-gray-700 bg-gray-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/trials?id=${trial.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to trial">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-100">
                Trial #{trial.runNumber} — {protocol.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  className={cn(
                    trialStatus === "in-progress"
                      ? "bg-blue-900 text-blue-200"
                      : trialStatus === "completed"
                        ? "bg-green-900 text-green-200"
                        : "bg-gray-800 text-gray-200"
                  )}
                  variant="outline"
                >
                  {trialStatus}
                </Badge>
                {isStarted && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Elapsed: {formatTime(elapsedSeconds)}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Step {currentStepIndex + 1} / {steps.length}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!isStarted && !isCompleted && (
              <Button onClick={handleStartTrial} className="bg-green-600 hover:bg-green-700 text-white">
                <Play className="h-4 w-4 mr-1" /> Start Trial
              </Button>
            )}
            {isStarted && isLastStep && (
              <Button onClick={handleCompleteTrial} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Trial
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ─── Steps Panel ─── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Step progress bar */}
          <div className="mb-4">
            <Progress
              value={((currentStepIndex + 1) / steps.length) * 100}
              className="h-2"
            />
          </div>

          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPast = idx < currentStepIndex;
            const isFuture = idx > currentStepIndex;

            return (
              <div
                key={step.id}
                ref={(el) => {
                  if (el) {
                    stepRefs.current.set(idx, el);
                  } else {
                    stepRefs.current.delete(idx);
                  }
                }}
                className={cn(
                  "relative",
                  // Timeline connector
                  idx < steps.length - 1 &&
                    "before:absolute before:left-5 before:top-12 before:h-[calc(100%-2rem)] before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700"
                )}
              >
                <Card
                  className={cn(
                    "transition-all duration-200",
                    isCurrent &&
                      "ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-md",
                    isPast && "opacity-60",
                    isFuture && "opacity-40"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {/* Step indicator */}
                      <div
                        className={cn(
                          "shrink-0 flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold",
                          isCurrent &&
                            "bg-indigo-600 text-white dark:bg-indigo-500",
                          isPast &&
                            "bg-green-600 text-white dark:bg-green-500",
                          isFuture &&
                            "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        )}
                      >
                        {isPast ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          {step.name}
                          {step.durationMin != null && (
                            <Badge variant="secondary" className="text-xs">
                              <Timer className="h-3 w-3 mr-1" />
                              {step.durationMin} min
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                      {isCurrent ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>

                  {/* Expanded content for current step */}
                  {isCurrent && (
                    <CardContent className="pt-0 space-y-4">
                      {/* Description */}
                      {step.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {step.description}
                        </p>
                      )}

                      {/* Step details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {step.temperatureC !== null && (
                          <div className="flex items-center gap-2 text-sm">
                            <Thermometer className="h-4 w-4 text-red-500" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {step.temperatureC}°C
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Wind className="h-4 w-4 text-blue-500" />
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              agitationColor(step.agitationLevel)
                            )}
                          >
                            {agitationLabel(step.agitationLevel)}
                          </Badge>
                        </div>
                        {step.durationMin !== null && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {step.durationMin} min
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Ingredients to add */}
                      {step.additionIngredients.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Add ingredients:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {step.additionIngredients.map((ingId) => (
                              <Badge
                                key={ingId}
                                variant="secondary"
                                className="text-xs"
                              >
                                <Beaker className="h-3 w-3 mr-1" />
                                {ingredientMap.get(ingId) || ingId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hold conditions */}
                      {step.holdConditions && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Hold conditions:
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                            {step.holdConditions}
                          </p>
                        </div>
                      )}

                      {/* Expected effects */}
                      {step.expectedEffects.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Expected effects:
                          </p>
                          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
                            {step.expectedEffects.map((effect, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Circle className="h-2 w-2 mt-1.5 shrink-0 fill-current text-indigo-400" />
                                {effect}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Timer */}
                      {isStarted &&
                        step.durationMin !== null &&
                        timerSecondsLeft !== null && (() => {
                          const totalSeconds = step.durationMin * 60;
                          return (
                          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                            <div className="text-center">
                              <p className="text-4xl font-mono font-bold text-gray-100">
                                {formatTime(timerSecondsLeft)}
                              </p>
                              <Progress
                                value={
                                  totalSeconds
                                    ? ((totalSeconds - timerSecondsLeft) /
                                        totalSeconds) *
                                      100
                                    : 0
                                }
                                className="h-1.5 mt-2"
                              />
                            </div>
                            <div className="flex justify-center gap-2">
                              {!timerRunning && timerSecondsLeft > 0 && (
                                <Button
                                  size="lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTimerPlay();
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Play className="h-5 w-5" />
                                </Button>
                              )}
                              {timerRunning && (
                                <Button
                                  size="lg"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTimerPause();
                                  }}
                                >
                                  <Pause className="h-5 w-5" />
                                </Button>
                              )}
                              <Button
                                size="lg"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTimerReset();
                                }}
                              >
                                <RotateCcw className="h-5 w-5" />
                              </Button>
                            </div>
                            {timerSecondsLeft === 0 && (
                              <p className="text-center text-sm font-medium text-green-400">
                                ✓ Timer complete!
                              </p>
                            )}
                          </div>
                          );
                        })()}

                      {/* Step navigation */}
                      {isStarted && (
                        <div className="flex justify-between pt-2 border-t border-gray-700">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentStepIndex === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              goToStep(currentStepIndex - 1);
                            }}
                          >
                            <ChevronUp className="h-4 w-4 mr-1" /> Previous
                          </Button>
                          {!isLastStep ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToStep(currentStepIndex + 1);
                              }}
                            >
                              Next <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteTrial();
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            );
          })}
        </div>

        {/* ─── Observation Panel (desktop: side panel) ─── */}
        <div
          className={cn(
            "hidden lg:flex shrink-0 lg:border-l border-gray-700",
            "bg-gray-900",
            "flex-col",
            "lg:w-80 xl:w-96"
          )}
        >
          <div className="px-4 py-2 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-100">
              Observation Log ({observations.length})
            </h2>
          </div>

          {/* Observation list */}
          <div
            ref={observationLogRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {observations.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">
                No observations yet. Start logging as you work through the
                steps.
              </p>
            )}
            {observations.map((obs, idx) => {
              const step = steps.find((s) => s.id === obs.stepId);
              return (
                <div
                  key={idx}
                  className="bg-gray-800 rounded-md px-3 py-2 text-sm border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {step ? step.name : obs.category}
                    </Badge>
                    <span className="text-[10px] text-gray-500">
                      {formatDateTime(obs.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-300">
                    {obs.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Observation input (desktop) */}
          {isStarted && (
            <div className="shrink-0 p-3 border-t border-gray-700 bg-gray-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddObservation();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={observationInputRef}
                  value={observationText}
                  onChange={(e) => setObservationText(e.target.value)}
                  placeholder="Log an observation..."
                  className="flex-1 h-10 text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={!observationText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              {currentStep && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Step: {currentStep.name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Mobile Observation Input (sticky bottom bar) ─── */}
      {isStarted && (
        <div className="lg:hidden shrink-0 border-t border-gray-700 bg-gray-900 px-3 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddObservation();
            }}
            className="flex gap-2 items-center"
          >
            <Input
              ref={observationInputRef}
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              placeholder="Log an observation..."
              className="flex-1 h-10 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={!observationText.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          {currentStep && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              Step: {currentStep.name} · {observations.length} observation{observations.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
