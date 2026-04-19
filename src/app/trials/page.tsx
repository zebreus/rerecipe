"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";
import { Plus, Trash2, TestTube, Copy, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { generateId, statusColor, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import type { Trial } from "@/lib/types";
import { calculateSimilarityScore } from "@/lib/solver";

const STATUS_OPTIONS = ["all", "planned", "in-progress", "completed", "failed", "abandoned"] as const;

export default function TrialsPage() {
  const { data, addTrial, deleteTrial } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFormulaId, setNewFormulaId] = useState("");
  const [newProtocolId, setNewProtocolId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  function handleCreate() {
    if (!newFormulaId || !newProtocolId) return;
    const now = new Date().toISOString();
    const runNumber =
      data.trials.filter((t) => t.formulaId === newFormulaId).length + 1;
    const t: Trial = {
      id: generateId(),
      formulaId: newFormulaId,
      protocolId: newProtocolId,
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
    };
    addTrial(t);
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this trial?")) {
      deleteTrial(id);
    }
  }

  function handleDuplicate(trial: Trial) {
    const now = new Date().toISOString();
    const runNumber =
      data.trials.filter((t) => t.formulaId === trial.formulaId).length + 1;
    const dup: Trial = {
      ...trial,
      id: generateId(),
      runNumber,
      status: "planned",
      scores: trial.scores.map((s) => ({ ...s, score: 0 })),
      similarityScore: 0,
      startedAt: "",
      completedAt: "",
      createdAt: now,
      updatedAt: now,
    };
    addTrial(dup);
  }

  const sortedTrials = [...data.trials].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredTrials = sortedTrials.filter((trial) => {
    if (statusFilter !== "all" && trial.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const formula = data.formulas.find((f) => f.id === trial.formulaId);
      const protocol = data.protocols.find((p) => p.id === trial.protocolId);
      const matchesNotes = trial.notes.toLowerCase().includes(q);
      const matchesFormula = formula?.name.toLowerCase().includes(q) ?? false;
      const matchesProtocol = protocol?.name.toLowerCase().includes(q) ?? false;
      if (!matchesNotes && !matchesFormula && !matchesProtocol) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Log"
        subtitle={`${data.trials.length} trial${data.trials.length !== 1 ? "s" : ""} recorded`}
      >
        <Button onClick={() => {
          setNewFormulaId("");
          setNewProtocolId("");
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-1" />
          New Trial
        </Button>
      </PageHeader>

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search notes, formula, protocol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTrials.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<TestTube className="h-8 w-8" />}
              title={data.trials.length === 0 ? "No trials recorded yet." : "No trials match your filters."}
              subtitle={data.trials.length === 0 ? "Create a formula and protocol first, then log a trial." : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTrials.map((trial) => {
            const formula = data.formulas.find(
              (f) => f.id === trial.formulaId
            );
            const protocol = data.protocols.find(
              (p) => p.id === trial.protocolId
            );
            const score =
              trial.similarityScore || calculateSimilarityScore(trial);

            return (
              <Card
                key={trial.id}
                className="hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <Link href={`/trials/${trial.id}`}>
                          <p className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                            Trial #{trial.runNumber}
                          </p>
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDate(trial.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge
                          className={statusColor(trial.status)}
                          variant="outline"
                        >
                          {trial.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {score.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Score</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 dark:text-gray-400"
                        onClick={() => handleDuplicate(trial)}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 dark:text-red-400"
                        onClick={() => handleDelete(trial.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {formula && (
                      <Link href={`/formulas/${formula.id}`}>
                        <Badge variant="secondary" className="text-xs hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                          {formula.name}
                        </Badge>
                      </Link>
                    )}
                    {protocol && (
                      <Link href={`/protocols/${protocol.id}`}>
                        <Badge variant="secondary" className="text-xs hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                          {protocol.name}
                        </Badge>
                      </Link>
                    )}
                    {trial.observations.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {trial.observations.length} observation
                        {trial.observations.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {trial.measurements.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {trial.measurements.length} measurement
                        {trial.measurements.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  {trial.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                      {trial.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Trial</DialogTitle>
            <DialogDescription>
              Select a formula and protocol to test.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Formula</Label>
              <Select value={newFormulaId} onValueChange={setNewFormulaId}>
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
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={newProtocolId} onValueChange={setNewProtocolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol..." />
                </SelectTrigger>
                <SelectContent>
                  {data.protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newFormulaId || !newProtocolId}>Create Trial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
