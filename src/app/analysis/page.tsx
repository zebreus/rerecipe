"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  calculateFormulaComponents,
  componentsToPercent,
  calculateSimilarityScore,
  rankTrials,
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
import { Trophy, TrendingUp, BarChart3 } from "lucide-react";

export default function AnalysisPage() {
  const { data } = useStore();
  const { targetProduct, ingredients, formulas, protocols, trials } = data;

  const rankings = rankTrials(trials, formulas, ingredients, targetProduct);

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
  const progressionData = trials
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

  // ─── Trial radar comparison (top 3) ───
  const topTrials = rankings.slice(0, 3);
  const allDimensions = new Set<string>();
  topTrials.forEach((r) => {
    const t = trials.find((tr) => tr.id === r.trialId);
    t?.scores.forEach((s) => allDimensions.add(s.name));
  });
  const radarData = Array.from(allDimensions).map((dim) => {
    const row: Record<string, number | string> = {
      dimension: dim,
    };
    topTrials.forEach((r, idx) => {
      const t = trials.find((tr) => tr.id === r.trialId);
      const score = t?.scores.find((s) => s.name === dim)?.score || 0;
      row[`Trial #${t?.runNumber || idx + 1}`] = score;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Comparison, ranking, and insights
        </p>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="formulas">Formula Comparison</TabsTrigger>
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
                <p className="text-sm text-gray-400 text-center py-6">
                  No completed trials to rank.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
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
                            row.rank === 1 ? "bg-amber-50" : ""
                          }`}
                        >
                          <td className="py-2 font-bold">
                            {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}
                          </td>
                          <td className="py-2">
                            <Link
                              href={`/trials/${row.trialId}`}
                              className="text-indigo-600 hover:underline"
                            >
                              Trial #{row.trial.runNumber}
                            </Link>
                          </td>
                          <td className="py-2">
                            {row.formula?.name || "—"}
                          </td>
                          <td className="py-2">
                            {row.protocol?.name || "—"}
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
                <p className="text-sm text-gray-400 text-center py-8">
                  No formulas to compare.
                </p>
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
                <p className="text-sm text-gray-400 text-center py-8">
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
                Top Trials Score Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    {topTrials.map((r, idx) => {
                      const t = trials.find((tr) => tr.id === r.trialId);
                      return (
                        <Radar
                          key={r.trialId}
                          name={`Trial #${t?.runNumber || idx + 1}`}
                          dataKey={`Trial #${t?.runNumber || idx + 1}`}
                          stroke={CHART_COLORS[idx]}
                          fill={CHART_COLORS[idx]}
                          fillOpacity={0.15}
                        />
                      );
                    })}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
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
                    className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border"
                  >
                    <span className="text-indigo-500 font-bold text-sm shrink-0">
                      {idx + 1}.
                    </span>
                    <p className="text-sm text-gray-700">{r}</p>
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
              <ul className="space-y-2 text-sm text-gray-700">
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
