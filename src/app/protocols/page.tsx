"use client";

import { useState, Suspense } from "react";
import { useStore } from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, ListChecks } from "lucide-react";
import { generateId } from "@/lib/utils";
import type { Protocol, ProtocolCategory } from "@/lib/types";
import ProtocolDetailClient from "./protocol-detail";

const CATEGORIES: { value: ProtocolCategory; label: string }[] = [
  { value: "hot-fill", label: "Hot Fill" },
  { value: "batch-cook", label: "Batch Cook" },
  { value: "prehydrate-cook", label: "Prehydrate + Cook" },
  { value: "inline-hydrocolloid", label: "Inline Hydrocolloid" },
  { value: "staged-sugar", label: "Staged Sugar" },
  { value: "staged-dairy", label: "Staged Dairy" },
  { value: "shear-first", label: "Shear First" },
  { value: "heat-first", label: "Heat First" },
  { value: "custom", label: "Custom" },
];

export default function ProtocolsPage() {
  return (
    <Suspense>
      <ProtocolsRouter />
    </Suspense>
  );
}

function ProtocolsRouter() {
  const searchParams = useSearchParams();
  const detailId = searchParams.get("id");

  if (detailId) {
    return <ProtocolDetailClient id={detailId} />;
  }

  return <ProtocolsListView />;
}

function ProtocolsListView() {
  const { data, addProtocol, deleteProtocol } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ProtocolCategory>("custom");
  const [newDesc, setNewDesc] = useState("");

  function handleCreate() {
    if (!newName.trim()) return;
    const now = new Date().toISOString();
    const p: Protocol = {
      id: generateId(),
      name: newName.trim(),
      category: newCategory,
      description: newDesc.trim(),
      version: 1,
      steps: [],
      expectedEffects: [],
      riskFlags: [],
      notes: "",
      createdAt: now,
      updatedAt: now,
      containers: [],
    };
    addProtocol(p);
    setNewName("");
    setNewDesc("");
    setDialogOpen(false);
  }

  function handleDuplicate(original: Protocol) {
    const now = new Date().toISOString();
    const dup: Protocol = {
      ...structuredClone(original),
      id: generateId(),
      name: `${original.name} (copy)`,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    // Give new IDs to steps
    dup.steps = dup.steps.map((s) => ({ ...s, id: generateId() }));
    addProtocol(dup);
  }

  function handleDelete(id: string) {
    const usedInTrials = data.trials.filter((t) => t.protocolId === id);
    const protocolName = data.protocols.find((p) => p.id === id)?.name || "this protocol";
    if (usedInTrials.length > 0) {
      alert(`Cannot delete "${protocolName}" because it is referenced by ${usedInTrials.length} trial(s).\n\nDelete those trials first.`);
      return;
    }
    if (confirm(`Delete "${protocolName}"?`)) {
      deleteProtocol(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Protocol Lab</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data.protocols.length} protocol
            {data.protocols.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Protocol
        </Button>
      </div>

      {data.protocols.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            <ListChecks className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>No protocols defined yet.</p>
            <p className="mt-1">Create your first manufacturing protocol.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.protocols.map((p) => {
            const trialCount = data.trials.filter(
              (t) => t.protocolId === p.id
            ).length;
            return (
              <Card key={p.id} className="hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Link href={`/protocols?id=${p.id}`}>
                      <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                        {p.name}
                      </CardTitle>
                    </Link>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleDuplicate(p)}
                        aria-label={`Duplicate ${p.name}`}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 dark:text-red-400"
                        onClick={() => handleDelete(p.id)}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{p.category}</Badge>
                    <Badge variant="secondary">
                      {p.steps.length} step{p.steps.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary">
                      {trialCount} trial{trialCount !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary">v{p.version}</Badge>
                  </div>
                  {p.riskFlags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {p.riskFlags.map((flag, i) => (
                        <Badge
                          key={i}
                          variant="destructive"
                          className="text-[10px]"
                        >
                          ⚠ {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Link href={`/protocols?id=${p.id}`}>
                    <Button variant="outline" size="sm" className="mt-1">
                      Open
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Protocol</DialogTitle>
            <DialogDescription>
              Define a manufacturing method to test.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Modified Batch Cook"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newCategory}
                onValueChange={(v) => setNewCategory(v as ProtocolCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
