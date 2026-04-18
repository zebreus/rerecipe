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
} from "lucide-react";

export default function SettingsPage() {
  const { data, updateProject, exportJSON, importJSON, resetToSeed } =
    useStore();
  const [projectName, setProjectName] = useState(data.project.name);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
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
          <p className="text-xs text-gray-400">
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
          <p className="text-sm text-gray-500 mb-3">
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
          <p className="text-sm text-gray-500">
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
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {importStatus}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Ingredients</p>
              <p className="text-xl font-bold">{data.ingredients.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Formulas</p>
              <p className="text-xl font-bold">{data.formulas.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Protocols</p>
              <p className="text-xl font-bold">{data.protocols.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Trials</p>
              <p className="text-xl font-bold">{data.trials.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Notes</p>
              <p className="text-xl font-bold">{data.notes.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Attachments</p>
              <p className="text-xl font-bold">{data.attachments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
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
