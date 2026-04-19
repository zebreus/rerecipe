"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  calculateFormulaComponents,
  componentsToPercent,
  calculateSimilarityScore,
  rankTrials,
  compositionSimilarity,
  checkCompliance,
} from "@/lib/solver";
import {
  COMPONENT_KEYS,
  COMPONENT_LABELS,
} from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { Trophy, TrendingUp, BarChart3, Table, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LINK_STYLE = "text-indigo-600 dark:text-indigo-400 hover:underline";

export default function AnalysisPage() {
  const { data } = useStore();
  const { targetProduct, ingredients, formulas, protocols, trials } = data;
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [radarTrialIds, setRadarTrialIds] = useState<string[]>([]);

  const filteredTrials = protocolFilter === "all"
    ? trials
    : trials.filter((t) => t.protocolId === protocolFilter);

  const rankings = rankTrials(filteredTrials, formulas, ingredients, targetProduct);

  // ─── Ranking table ───
  const rankingRows = rankings.map((r, idx) => {
    const trial = trials.find((t) => t.id === r.trialId)!;
    const formula = formulas.find((f) => f.id === trial.formulaId);
    const protocol = protocols.find((p) => p.id === trial.protocolId);
    return {
      rank: idx + 1,
      trial,
      formula,
      protocol,
      ...r,
    };
  });

  // ─── Trial progression ───
  const progressionData = filteredTrials
    .filter((t) => t.status === "completed")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .map((t, idx) => ({
      name: `Run #${t.runNumber}`,
      score: t.similarityScore || calculateSimilarityScore(t),
      index: idx + 1,
    }));

  // ─── Formula composition comparison ───
  const formulaCompData = COMPONENT_KEYS.map((key) => {
    const row: Record<string, number | string> = {
      name: COMPONENT_LABELS[key],
      Target: targetProduct.targetComposition[key],
    };
    formulas.forEach((f) => {
      const pct = componentsToPercent(
        calculateFormulaComponents(f.ingredientLines, ingredients)
      );
      row[f.name] = pct[key];
    });
    return row;
  });

  // ─── Trial radar comparison (selectable or top 3) ───
  const completedTrials = filteredTrials.filter((t) => t.status === "completed");
  const selectedRadarTrials = radarTrialIds.length > 0
    ? completedTrials.filter((t) => radarTrialIds.includes(t.id))
    : rankings.slice(0, 3).map((r) => completedTrials.find((t) => t.id === r.trialId)!).filter(Boolean);
  const allDimensions = new Set<string>();
  selectedRadarTrials.forEach((t) => {
    t?.scores.forEach((s) => allDimensions.add(s.name));
  });
  const radarData = Array.from(allDimensions).map((dim) => {
    const row: Record<string, number | string> = {
      dimension: dim,
    };
    selectedRadarTrials.forEach((t) => {
      const score = t?.scores.find((s) => s.name === dim)?.score || 0;
      row[t.id] = score;
    });
    return row;
  });

  const CHART_COLORS = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  // ─── Evidence & reasoning ───
  const bestRanking = rankings[0];
  const bestTrial = bestRanking
    ? trials.find((t) => t.id === bestRanking.trialId)
    : null;
  const bestFormula = bestTrial
    ? formulas.find((f) => f.id === bestTrial.formulaId)
    : null;

  function generateReasoning(): string[] {
    const reasons: string[] = [];
    if (!bestFormula || !bestTrial) {
      reasons.push("No completed trials to analyze yet.");
      return reasons;
    }

    const comps = calculateFormulaComponents(
      bestFormula.ingredientLines,
      ingredients
    );
    const pct = componentsToPercent(comps);

    // Check each component gap
    for (const key of COMPONENT_KEYS) {
      const target = targetProduct.targetComposition[key];
      const actual = pct[key];
      const diff = actual - target;
      const label = COMPONENT_LABELS[key];
      if (Math.abs(diff) > 2) {
        if (diff > 0) {
          reasons.push(
            `${label} is ${diff.toFixed(1)}% over target. Consider reducing ${label.toLowerCase()}-contributing ingredients.`
          );
        } else {
          reasons.push(
            `${label} is ${Math.abs(diff).toFixed(1)}% under target. Consider increasing ${label.toLowerCase()}-contributing ingredients.`
          );
        }
      }
    }

    // Check low scores
    bestTrial.scores.forEach((s) => {
      if (s.score < 5) {
        reasons.push(
          `"${s.name}" scored only ${s.score}/10. ${s.notes ? `Note: ${s.notes}` : "This needs attention in the next trial."}`
        );
      }
    });

    // Process suggestion
    if (bestTrial.scores.some((s) => s.name.includes("Grain") && s.score < 6)) {
      reasons.push(
        "Grain softness is low. Consider longer cook time or presoaking the grains."
      );
    }
    if (
      bestTrial.scores.some(
        (s) => s.name.includes("Viscosity") && s.score < 6
      )
    ) {
      reasons.push(
        "Viscosity is below target. Consider increasing hydrocolloid or starch, or extending hold time."
      );
    }

    if (reasons.length === 0) {
      reasons.push("The best formula is close to target across all dimensions!");
    }

    return reasons;
  }

  const reasoning = generateReasoning();

  function exportCSV() {
    const header = ["Rank","Trial Run","Formula","Protocol","Composition Score","Outcome Score","Combined Score"];
    const rows = rankingRows.map((row) => [
      row.rank,
      row.trial.runNumber,
      row.formula?.name || "",
      row.protocol?.name || "",
      row.compositionScore.toFixed(1),
      row.outcomeScore.toFixed(1),
      row.combinedScore.toFixed(1),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trial-rankings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analysis</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Comparison, ranking, and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={protocolFilter} onValueChange={(v) => { setProtocolFilter(v); setRadarTrialIds([]); }}>
            <SelectTrigger className="w-52">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <SelectValue placeholder="All protocols" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All protocols</SelectItem>
              {protocols.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} disabled={rankingRows.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="formulas">Formula Comparison</TabsTrigger>
          <TabsTrigger value="sidebyside">Side-by-Side</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="progression">Trial Progression</TabsTrigger>
          <TabsTrigger value="radar">Score Radar</TabsTrigger>
          <TabsTrigger value="reasoning">Evidence & Reasoning</TabsTrigger>
        </TabsList>

        {/* Ranking */}
        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Trial Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankingRows.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  No completed trials to rank.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                        <th className="pb-2 font-medium">#</th>
                        <th className="pb-2 font-medium">Trial</th>
                        <th className="pb-2 font-medium">Formula</th>
                        <th className="pb-2 font-medium">Protocol</th>
                        <th className="pb-2 font-medium">Composition</th>
                        <th className="pb-2 font-medium">Outcome</th>
                        <th className="pb-2 font-medium">Combined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingRows.map((row) => (
                        <tr
                          key={row.trialId}
                          className={`border-b last:border-0 ${
                            row.rank === 1 ? "bg-amber-50 dark:bg-amber-950" : ""
                          }`}
                        >
                          <td className="py-2 font-bold">
                            {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}
                          </td>
                          <td className="py-2">
                            <Link
                              href={`/trials?id=${row.trialId}`}
                              className={LINK_STYLE}
                            >
                              Trial #{row.trial.runNumber}
                            </Link>
                          </td>
                          <td className="py-2">
                            {row.formula ? (
                              <Link
                                href={`/formulas?id=${row.formula.id}`}
                                className={LINK_STYLE}
                              >
                                {row.formula.name}
                              </Link>
                            ) : "—"}
                          </td>
                          <td className="py-2">
                            {row.protocol ? (
                              <Link
                                href={`/protocols?id=${row.protocol.id}`}
                                className={LINK_STYLE}
                              >
                                {row.protocol.name}
                              </Link>
                            ) : "—"}
                          </td>
                          <td className="py-2">
                            {row.compositionScore.toFixed(1)}%
                          </td>
                          <td className="py-2">
                            {row.outcomeScore.toFixed(1)}%
                          </td>
                          <td className="py-2 font-medium">
                            {row.combinedScore.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formula comparison */}
        <TabsContent value="formulas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Formula Composition vs Target (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formulaCompData.length > 0 && formulas.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={formulaCompData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Target" fill="#94a3b8" />
                    {formulas.map((f, idx) => (
                      <Bar
                        key={f.id}
                        dataKey={f.name}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  No formulas to compare.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Side-by-side formula comparison table */}
        <TabsContent value="sidebyside">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Table className="h-4 w-4 text-indigo-500" />
                Side-by-Side Composition Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formulas.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  No formulas to compare.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                        <th className="pb-2 font-medium">Component</th>
                        <th className="pb-2 font-medium">Target</th>
                        {formulas.map((f) => (
                          <th key={f.id} className="pb-2 font-medium">
                            <Link href={`/formulas?id=${f.id}`} className={LINK_STYLE}>
                              {f.name}
                            </Link>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPONENT_KEYS.map((key) => (
                        <tr key={key} className="border-b last:border-0">
                          <td className="py-1.5 font-medium">{COMPONENT_LABELS[key]}</td>
                          <td className="py-1.5">{targetProduct.targetComposition[key].toFixed(1)}%</td>
                          {formulas.map((f) => {
                            const pct = componentsToPercent(
                              calculateFormulaComponents(f.ingredientLines, ingredients)
                            );
                            const diff = pct[key] - targetProduct.targetComposition[key];
                            return (
                              <td
                                key={f.id}
                                className={`py-1.5 ${
                                  Math.abs(diff) > 5
                                    ? "text-red-600 dark:text-red-400 font-medium"
                                    : Math.abs(diff) > 2
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-green-600 dark:text-green-400"
                                }`}
                              >
                                {pct[key].toFixed(1)}%
                                <span className="text-xs ml-1">
                                  ({diff > 0 ? "+" : ""}{diff.toFixed(1)})
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="border-t-2 font-medium">
                        <td className="py-1.5">Match Score</td>
                        <td className="py-1.5">—</td>
                        {formulas.map((f) => {
                          const pct = componentsToPercent(
                            calculateFormulaComponents(f.ingredientLines, ingredients)
                          );
                          const sim = compositionSimilarity(pct, targetProduct.targetComposition);
                          return (
                            <td key={f.id} className="py-1.5">{sim.toFixed(1)}%</td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Label Compliance Check</CardTitle>
            </CardHeader>
            <CardContent>
              {formulas.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  No formulas to check.
                </p>
              ) : (
                <div className="space-y-4">
                  {formulas.map((f) => {
                    const pct = componentsToPercent(
                      calculateFormulaComponents(f.ingredientLines, ingredients)
                    );
                    const compliance = checkCompliance(pct, targetProduct.targetComposition);
                    return (
                      <div key={f.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Link href={`/formulas?id=${f.id}`} className={`font-medium ${LINK_STYLE}`}>{f.name}</Link>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              compliance.status === "compliant"
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                : compliance.status === "warning"
                                ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                            }`}
                          >
                            {compliance.status === "compliant"
                              ? "✓ Compliant"
                              : compliance.status === "warning"
                              ? "⚠ Warning"
                              : "✗ Non-compliant"}
                            {" (max deviation: "}
                            {compliance.maxDeviation.toFixed(1)}%)
                          </span>
                        </div>
                        {compliance.deviations.length > 0 && (
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {compliance.deviations.map((d) => (
                              <li key={d.key} className="flex gap-2">
                                <span className={d.diff > 5 ? "text-red-500" : "text-yellow-500"}>●</span>
                                {d.label}: {d.diff.toFixed(1)}% deviation from target
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial progression */}
        <TabsContent value="progression">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Score Progression Over Trials
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Similarity Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  Complete trials to see progression.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Score radar */}
        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {radarTrialIds.length > 0 ? "Selected" : "Top"} Trials Score Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedTrials.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Select trials to compare (click to toggle, max 6; leave all unselected for top 3):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {completedTrials.map((t) => {
                      const isSelected = radarTrialIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          aria-pressed={isSelected ? "true" : "false"}
                          onClick={() => {
                            setRadarTrialIds((prev) => {
                              const wasSelected = prev.includes(t.id);
                              if (wasSelected) return prev.filter((id) => id !== t.id);
                              if (prev.length >= 6) return prev;
                              return [...prev, t.id];
                            });
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            isSelected
                              ? "bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-medium"
                              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          Trial #{t.runNumber}
                        </button>
                      );
                    })}
                    {radarTrialIds.length > 0 && (
                      <button
                        onClick={() => setRadarTrialIds([])}
                        className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
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
                    {selectedRadarTrials.map((t, idx) => {
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      return (
                        <Radar
                          key={t.id}
                          name={`Trial #${t.runNumber}`}
                          dataKey={t.id}
                          stroke={color}
                          fill={color}
                          fillOpacity={0.15}
                        />
                      );
                    })}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  Complete trials to see score comparison.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence & Reasoning */}
        <TabsContent value="reasoning">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Evidence & Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reasoning.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border"
                  >
                    <span className="text-indigo-500 dark:text-indigo-400 font-bold text-sm shrink-0">
                      {idx + 1}.
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{r}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What to test next */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">
                Suggested Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">→</span>
                  Duplicate the best trial&apos;s formula and adjust the largest
                  composition gap.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">→</span>
                  Vary one process parameter at a time (e.g., cook time, temp,
                  shear) to isolate effects.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">→</span>
                  Use the sensitivity analysis on the formula page to identify
                  which ingredient changes have the most impact.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">→</span>
                  Focus on low-scoring dimensions from the scoring rubric.
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
