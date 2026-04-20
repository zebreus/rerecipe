"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import {
  Target,
  Leaf,
  FlaskConical,
  ListChecks,
  TestTube,
  BarChart3,
  Trophy,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Play,
} from "lucide-react";
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
} from "recharts";

export default function DashboardPage() {
  const { data } = useStore();
  const { targetProduct, ingredients, formulas, protocols, trials } = data;

  const activeTrials = trials.filter((t) => t.status === "in-progress");

  const rankings = useMemo(
    () => rankTrials(trials, formulas, ingredients, targetProduct),
    [trials, formulas, ingredients, targetProduct]
  );
  const bestRanking = rankings[0];
  const bestTrial = bestRanking
    ? trials.find((t) => t.id === bestRanking.trialId)
    : null;
  const bestFormula = bestTrial
    ? formulas.find((f) => f.id === bestTrial.formulaId)
    : null;

  const gapData = useMemo(
    () =>
      formulas.length > 0
        ? COMPONENT_KEYS.map((key) => {
            const label = COMPONENT_LABELS[key];
            const targetVal = targetProduct.targetComposition[key];
            const bestFormulaComps = bestFormula
              ? componentsToPercent(
                  calculateFormulaComponents(
                    bestFormula.ingredientLines,
                    ingredients
                  )
                )
              : null;
            return {
              name: label,
              Target: targetVal,
              Best: bestFormulaComps ? bestFormulaComps[key] : 0,
            };
          })
        : [],
    [formulas, targetProduct, bestFormula, ingredients]
  );

  const trialHistory = useMemo(
    () =>
      trials
        .filter((t) => t.status === "completed")
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        .map((t) => ({
          name: `Run #${t.runNumber}`,
          score: t.similarityScore || calculateSimilarityScore(t),
        })),
    [trials]
  );

  const hasTarget = targetProduct.name.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.project.name}
        subtitle="RErecipe Dashboard"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="h-5 w-5 text-indigo-600" />}
          label="Target"
          value={hasTarget ? targetProduct.name : "Not set"}
          href="/target"
        />
        <StatCard
          icon={<Leaf className="h-5 w-5 text-green-600" />}
          label="Ingredients"
          value={String(ingredients.length)}
          href="/ingredients"
        />
        <StatCard
          icon={<FlaskConical className="h-5 w-5 text-purple-600" />}
          label="Formulas"
          value={String(formulas.length)}
          href="/formulas"
        />
        <StatCard
          icon={<TestTube className="h-5 w-5 text-orange-600" />}
          label="Trials"
          value={String(trials.length)}
          href="/trials"
        />
      </div>

      {!hasTarget && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Get started by defining your target product
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Set up the product you want to reverse-engineer, then add
                ingredients and build candidate formulas.
              </p>
            </div>
            <Link href="/target" className="ml-auto">
              <Button size="sm">Set Target</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {activeTrials.length > 0 && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-green-600" />
              Active Trials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeTrials.map((t) => {
              const formula = formulas.find((f) => f.id === t.formulaId);
              const protocol = protocols.find((p) => p.id === t.protocolId);
              return (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Trial #{t.runNumber}
                    </span>
                    {formula && (
                      <span className="text-gray-500 dark:text-gray-400"> — {formula.name}</span>
                    )}
                    {protocol && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs"> ({protocol.name})</span>
                    )}
                  </div>
                  <Link href={`/trials?id=${t.id}&mode=run`}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Play className="h-3 w-3" /> Continue Run
                    </Button>
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Best Current Clone
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestTrial && bestRanking ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Trial #{bestTrial.runNumber}
                  </span>
                  <Badge variant="secondary">
                    Score: {bestRanking.combinedScore.toFixed(1)}%
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Composition Match</span>
                    <span>{bestRanking.compositionScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={bestRanking.compositionScore} />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Outcome Score</span>
                    <span>{bestRanking.outcomeScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={bestRanking.outcomeScore} />
                </div>
                {bestFormula && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Formula:{" "}
                    <Link href={`/formulas?id=${bestFormula.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      {bestFormula.name}
                    </Link>
                  </p>
                )}
                <Link href={`/trials?id=${bestTrial.id}`}>
                  <Button variant="outline" size="sm" className="mt-2">
                    View Trial
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No completed trials yet. Run your first experiment!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              Composition Gap
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gapData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gapData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Target" fill="#6366f1" />
                  <Bar dataKey="Best" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Add formulas to see composition comparison.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Trial History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trialHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trialHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#f59e0b" name="Similarity %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Complete trials to see progress over time.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/formulas" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FlaskConical className="h-4 w-4" />
                Create New Formula
              </Button>
            </Link>
            <Link href="/protocols" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <ListChecks className="h-4 w-4" />
                Design Protocol
              </Button>
            </Link>
            <Link href="/trials" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Play className="h-4 w-4" />
                Run Trial
              </Button>
            </Link>
            <Link href="/analysis" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <BarChart3 className="h-4 w-4" />
                View Analysis
              </Button>
            </Link>
            <Link href="/help" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <HelpCircle className="h-4 w-4" />
                Getting Started Guide
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {protocols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-blue-500" />
              Protocols Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2 font-medium">Protocol</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Steps</th>
                    <th className="pb-2 font-medium">Trials</th>
                    <th className="pb-2 font-medium">Best Score</th>
                  </tr>
                </thead>
                <tbody>
                  {protocols.map((p) => {
                    const pTrials = trials.filter(
                      (t) => t.protocolId === p.id
                    );
                    const best = pTrials.reduce(
                      (max, t) =>
                        t.similarityScore > max ? t.similarityScore : max,
                      0
                    );
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Link
                            href={`/protocols?id=${p.id}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="py-2">
                          <Badge variant="outline">{p.category}</Badge>
                        </td>
                        <td className="py-2">{p.steps.length}</td>
                        <td className="py-2">{pTrials.length}</td>
                        <td className="py-2">
                          {best > 0 ? `${best}%` : "\u2014"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          {icon}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {value}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
