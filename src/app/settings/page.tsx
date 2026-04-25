"use client";

import { useState, useRef, useEffect } from "react";
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
  FlaskConical,
  FileText,
} from "lucide-react";
import { generateId, exportFilename, describeImportError } from "@/lib/utils";
import type { ScoringProfile, Ingredient } from "@/lib/types";
import { isUnmodifiedCommonIngredient } from "@/lib/common-ingredients";

export default function SettingsPage() {
  const { data, updateProject, updateSettings, exportJSON, importJSON, resetToEmptyProject, loadExampleData, updateScoringProfiles } =
    useStore();
  const settings = data.settings;
  const [projectName, setProjectName] = useState(data.project.name);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<ScoringProfile[]>(data.scoringProfiles);
  const [profilesDirty, setProfilesDirty] = useState(false);

  // Sync local state when store data changes (e.g., after import or reset)
  useEffect(() => {
    setProjectName(data.project.name);
  }, [data.project.name]);

  useEffect(() => {
    setProfiles(data.scoringProfiles);
    setProfilesDirty(false);
  }, [data.scoringProfiles]);

  function handleSaveName() {
    updateProject(projectName);
  }

  function handleExport() {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename(data.project.name);
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    if (!importText.trim()) return;
    if (!confirm("Importing will replace all current project data. Continue?")) return;
    try {
      const parsed = JSON.parse(importText);
      const ok = importJSON(importText);
      if (ok) {
        setImportStatus("Import successful!");
        setImportText("");
        setProjectName(parsed.project?.name ?? "");
      } else {
        setImportStatus(describeImportError(importText) ?? "Import failed.");
      }
    } catch {
      setImportStatus(describeImportError(importText) ?? "Import failed: invalid JSON.");
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!confirm("Importing will replace all current project data. Continue?")) return;
      try {
        const parsed = JSON.parse(text);
        const ok = importJSON(text);
        if (ok) {
          setImportStatus("Import successful!");
          setProjectName(parsed.project?.name ?? "");
        } else {
          setImportStatus(describeImportError(text) ?? "Import failed.");
        }
      } catch {
        setImportStatus(describeImportError(text) ?? "Import failed: invalid JSON.");
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (
      confirm(
        "Reset to empty project? This will erase all your current data."
      )
    ) {
      resetToEmptyProject();
      setImportStatus(null);
    }
  }

  function handleLoadExample() {
    if (
      confirm(
        "Load the Müller Rice example project? This will replace all your current data."
      )
    ) {
      loadExampleData();
      setImportStatus(null);
    }
  }

  function escapeMdTableCell(value: string): string {
    return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  }

  function escapeMdInline(value: string): string {
    return value.replace(/\r?\n/g, " ").replace(/([_*`#[\]\\])/g, "\\$1");
  }

  function ingredientsMarkdownFilename(projectName: string): string {
    const sanitizedBase = projectName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .replace(/^_+|_+$/g, "");
    const baseName = sanitizedBase || "project";
    return `${baseName}-ingredients.md`;
  }

  function buildIngredientsMarkdown(ingredients: Ingredient[]): string {
    const custom = ingredients.filter(
      (ing) => !isUnmodifiedCommonIngredient(ing)
    );
    if (custom.length === 0) {
      return "# Custom Ingredient Library\n\nNo manually added or modified ingredients found.\n";
    }
    const lines: string[] = [
      "# Custom Ingredient Library",
      "",
      `_Exported from RErecipe project: **${escapeMdInline(data.project.name)}**_`,
      `_Date: ${new Date().toLocaleString()}_`,
      "",
      `${custom.length} ingredient${custom.length !== 1 ? "s" : ""} added manually or modified from quick-add defaults.`,
      "",
    ];
    for (const ing of custom) {
      lines.push(`## ${escapeMdInline(ing.name)}`);
      lines.push("");
      lines.push(`- **Category:** ${escapeMdInline(ing.category)}`);
      lines.push(`- **Density:** ${ing.density_g_ml} g/mL`);
      lines.push(`- **Cost per kg:** $${ing.costPerKg}`);
      lines.push(`- **Confidence:** ${(ing.confidence * 100).toFixed(0)}%`);
      if (ing.source) lines.push(`- **Source:** ${escapeMdInline(ing.source)}`);
      lines.push("");
      lines.push("### Nutrition (per 100 g)");
      lines.push("");
      lines.push("| Nutrient | Value | Unit |");
      lines.push("|----------|-------|------|");
      // Look up the unit for each nutrient from the target nutrition list when
      // available; fall back to an empty string for nutrients not in the target.
      const unitByName = new Map(
        data.targetProduct.targetNutrition.map((n) => [n.name, n.unit])
      );
      for (const [name, val] of Object.entries(ing.nutrition ?? {})) {
        if (val !== 0) {
          const unit = unitByName.get(name) ?? "";
          lines.push(
            `| ${escapeMdTableCell(name)} | ${val} | ${escapeMdTableCell(unit)} |`
          );
        }
      }
      if (ing.notes) {
        lines.push("");
        lines.push(`**Notes:** ${escapeMdInline(ing.notes)}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }

  function handleExportIngredientsMarkdown() {
    const md = buildIngredientsMarkdown(data.ingredients);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ingredientsMarkdownFilename(data.project.name);
    a.click();
    URL.revokeObjectURL(url);
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
          <CardTitle className="text-base">Ingredient Table Columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose which optional columns are shown in the ingredient table.
          </p>
          <div className="space-y-2">
            {(
              [
                { key: "showCategoryColumn", label: "Category" },
                { key: "showDensityColumn", label: "Density" },
                { key: "showCostColumn", label: "Cost" },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) =>
                    updateSettings({ ...settings, [key]: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-indigo-600"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

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
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Download the entire project as a single JSON file.
          </p>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export JSON
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Export ingredients you added manually or modified from quick-add
            defaults as a Markdown file.
          </p>
          <Button variant="outline" onClick={handleExportIngredientsMarkdown}>
            <FileText className="h-4 w-4 mr-1" /> Export Custom Ingredients (Markdown)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Example Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The Müller Rice reverse-engineering demo project. Download it as
            JSON or load it directly into the app.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                const a = document.createElement("a");
                a.href = "/milchreis-example.json";
                a.download = "milchreis-example.json";
                a.click();
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Download Example JSON
            </Button>
            <Button variant="outline" onClick={handleLoadExample}>
              <FlaskConical className="h-4 w-4 mr-1" /> Load Example Data
            </Button>
          </div>
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
            Reset to an empty project. All current data will be lost.
          </p>
          <Button variant="destructive" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset to Empty Project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
