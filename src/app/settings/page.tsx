"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Upload,
  RotateCcw,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { generateId } from "@/lib/utils";
import type { ScoringProfile } from "@/lib/types";

export default function SettingsPage() {
  const { data, updateProject, exportJSON, importJSON, resetToSeed, updateScoringProfiles } =
    useStore();
  const [projectName, setProjectName] = useState(data.project.name);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<ScoringProfile[]>(data.scoringProfiles);
  const [profilesDirty, setProfilesDirty] = useState(false);

  function handleSaveName() {
    updateProject(projectName);
  }

  function handleExport() {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    if (!importText.trim()) return;
    const ok = importJSON(importText);
    if (ok) {
      setImportStatus("Import successful!");
      setImportText("");
      setProjectName(data.project.name);
    } else {
      setImportStatus("Import failed. Invalid JSON or missing fields.");
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const ok = importJSON(text);
      if (ok) {
        setImportStatus("Import successful!");
        setProjectName(data.project.name);
      } else {
        setImportStatus("Import failed. Invalid JSON or missing fields.");
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (
      confirm(
        "Reset to seed data? This will erase all your current data."
      )
    ) {
      resetToSeed();
      setProjectName(data.project.name);
      setImportStatus(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Project configuration, import/export
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={handleSaveName}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Created: {new Date(data.project.createdAt).toLocaleString()}
            {" · "}
            Updated: {new Date(data.project.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Project</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Download the entire project as a single JSON file.
          </p>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Import a project JSON file to replace the current data.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" /> Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Or paste JSON:</Label>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
              placeholder='{"project": {...}, "ingredients": [...], ...}'
            />
            <Button
              variant="outline"
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              Import from Text
            </Button>
          </div>
          {importStatus && (
            <p
              className={`text-sm ${
                importStatus.includes("successful")
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {importStatus}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scoring Profile Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Scoring Profiles</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newProfile: ScoringProfile = {
                  id: generateId(),
                  name: `Profile ${profiles.length + 1}`,
                  dimensions: [{ name: "Quality", weight: 1 }],
                };
                setProfiles([...profiles, newProfile]);
                setProfilesDirty(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Profile
            </Button>
            <Button
              size="sm"
              onClick={() => {
                updateScoringProfiles(profiles);
                setProfilesDirty(false);
              }}
              disabled={!profilesDirty}
            >
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define scoring dimensions and weights used when evaluating trials.
          </p>
          {profiles.map((profile, pIdx) => (
            <div
              key={profile.id}
              className="border rounded-lg p-4 space-y-3 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <Input
                  value={profile.name}
                  onChange={(e) => {
                    const updated = [...profiles];
                    updated[pIdx] = { ...profile, name: e.target.value };
                    setProfiles(updated);
                    setProfilesDirty(true);
                  }}
                  className="max-w-xs font-medium"
                />
                {profiles.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 dark:text-red-400"
                    onClick={() => {
                      setProfiles(profiles.filter((_, i) => i !== pIdx));
                      setProfilesDirty(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {profile.dimensions.map((dim, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-2">
                    <Input
                      value={dim.name}
                      onChange={(e) => {
                        const updated = [...profiles];
                        const dims = [...profile.dimensions];
                        dims[dIdx] = { ...dim, name: e.target.value };
                        updated[pIdx] = { ...profile, dimensions: dims };
                        setProfiles(updated);
                        setProfilesDirty(true);
                      }}
                      className="flex-1"
                      placeholder="Dimension name"
                    />
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Weight:
                      </Label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={dim.weight}
                        onChange={(e) => {
                          const updated = [...profiles];
                          const dims = [...profile.dimensions];
                          dims[dIdx] = { ...dim, weight: Number(e.target.value) };
                          updated[pIdx] = { ...profile, dimensions: dims };
                          setProfiles(updated);
                          setProfilesDirty(true);
                        }}
                        className="w-20"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 dark:text-red-400 shrink-0"
                      onClick={() => {
                        const updated = [...profiles];
                        const dims = profile.dimensions.filter((_, i) => i !== dIdx);
                        updated[pIdx] = { ...profile, dimensions: dims };
                        setProfiles(updated);
                        setProfilesDirty(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const updated = [...profiles];
                  updated[pIdx] = {
                    ...profile,
                    dimensions: [
                      ...profile.dimensions,
                      { name: "", weight: 0.1 },
                    ],
                  };
                  setProfiles(updated);
                  setProfilesDirty(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Dimension
              </Button>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Total weight:{" "}
                {profile.dimensions
                  .reduce((sum, d) => sum + d.weight, 0)
                  .toFixed(2)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Ingredients</p>
              <p className="text-xl font-bold">{data.ingredients.length}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Formulas</p>
              <p className="text-xl font-bold">{data.formulas.length}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Protocols</p>
              <p className="text-xl font-bold">{data.protocols.length}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Trials</p>
              <p className="text-xl font-bold">{data.trials.length}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Notes</p>
              <p className="text-xl font-bold">{data.notes.length}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Attachments</p>
              <p className="text-xl font-bold">{data.attachments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-base text-red-600 dark:text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Reset to sample/seed data. All current data will be lost.
          </p>
          <Button variant="destructive" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset to Seed Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
