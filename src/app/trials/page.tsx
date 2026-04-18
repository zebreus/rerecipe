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
import { Plus, Trash2, TestTube, Copy } from "lucide-react";
import { generateId, statusColor, formatDate } from "@/lib/utils";
import type { Trial } from "@/lib/types";
import { calculateSimilarityScore } from "@/lib/solver";

export default function TrialsPage() {
  const { data, addTrial, deleteTrial } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFormulaId, setNewFormulaId] = useState("");
  const [newProtocolId, setNewProtocolId] = useState("");

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trial Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.trials.length} trial{data.trials.length !== 1 ? "s" : ""}{" "}
            recorded
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Trial
        </Button>
      </div>

      {sortedTrials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-400">
            <TestTube className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No trials recorded yet.</p>
            <p className="mt-1">
              Create a formula and protocol first, then log a trial.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedTrials.map((trial) => {
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
                className="hover:border-gray-300 transition-colors"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <Link href={`/trials/${trial.id}`}>
                          <p className="font-medium text-indigo-600 hover:underline">
                            Trial #{trial.runNumber}
                          </p>
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
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
                        <p className="text-lg font-bold text-gray-900">
                          {score.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-gray-400">Score</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500"
                        onClick={() => handleDuplicate(trial)}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleDelete(trial.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {formula && (
                      <Badge variant="secondary" className="text-xs">
                        {formula.name}
                      </Badge>
                    )}
                    {protocol && (
                      <Badge variant="secondary" className="text-xs">
                        {protocol.name}
                      </Badge>
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
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
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
            <Button onClick={handleCreate}>Create Trial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
