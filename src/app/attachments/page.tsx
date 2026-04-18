"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, FileText, StickyNote } from "lucide-react";
import { generateId, formatDate } from "@/lib/utils";
import type { Note, Attachment } from "@/lib/types";

export default function AttachmentsPage() {
  const { data, addNote, updateNote, deleteNote, addAttachment, deleteAttachment } =
    useStore();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  function openNewNote() {
    setEditingNote({
      id: generateId(),
      title: "",
      content: "",
      linkedTo: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNoteDialogOpen(true);
  }

  function openEditNote(note: Note) {
    setEditingNote({ ...note });
    setNoteDialogOpen(true);
  }

  function saveNote() {
    if (!editingNote) return;
    const updated = { ...editingNote, updatedAt: new Date().toISOString() };
    if (data.notes.find((n) => n.id === updated.id)) {
      updateNote(updated);
    } else {
      addNote(updated);
    }
    setNoteDialogOpen(false);
    setEditingNote(null);
  }

  function handleDeleteNote(id: string) {
    if (confirm("Delete this note?")) {
      deleteNote(id);
    }
  }

  function handleAddAttachment() {
    const name = prompt("Attachment name (e.g. photo.jpg):");
    if (!name) return;
    const url = prompt("URL or path:");
    if (!url) return;
    const a: Attachment = {
      id: generateId(),
      name,
      type: name.split(".").pop() || "file",
      url,
      linkedTo: [],
      notes: "",
      createdAt: new Date().toISOString(),
    };
    addAttachment(a);
  }

  function handleDeleteAttachment(id: string) {
    if (confirm("Delete this attachment?")) {
      deleteAttachment(id);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notes & Files</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lab notes, evidence, and attachments
        </p>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes ({data.notes.length})
          </CardTitle>
          <Button size="sm" onClick={openNewNote}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
          </Button>
        </CardHeader>
        <CardContent>
          {data.notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No notes yet. Add lab notes, observations, or evidence.
            </p>
          ) : (
            <div className="space-y-2">
              {data.notes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEditNote(note)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{note.title || "Untitled"}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(note.updatedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {note.content && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {note.content}
                    </p>
                  )}
                  {note.linkedTo.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {note.linkedTo.map((link, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded"
                        >
                          {link.entityType}: {link.entityId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Attachments ({data.attachments.length})
          </CardTitle>
          <Button size="sm" onClick={handleAddAttachment}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {data.attachments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No attachments yet. Add photos, data sheets, or lab records.
            </p>
          ) : (
            <div className="space-y-2">
              {data.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{att.name}</p>
                    <p className="text-xs text-gray-400">
                      {att.type} · {formatDate(att.createdAt)}
                    </p>
                    {att.url && (
                      <p className="text-xs text-indigo-600 truncate max-w-md">
                        {att.url}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500"
                    onClick={() => handleDeleteAttachment(att.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingNote &&
              data.notes.find((n) => n.id === editingNote.id)
                ? "Edit Note"
                : "New Note"}
            </DialogTitle>
            <DialogDescription>Write and save a lab note.</DialogDescription>
          </DialogHeader>
          {editingNote && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingNote.title}
                  onChange={(e) =>
                    setEditingNote({
                      ...editingNote,
                      title: e.target.value,
                    })
                  }
                  placeholder="Note title"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={editingNote.content}
                  onChange={(e) =>
                    setEditingNote({
                      ...editingNote,
                      content: e.target.value,
                    })
                  }
                  rows={8}
                  placeholder="Write your notes here..."
                />
              </div>
              <div className="space-y-2">
                <Label>Link to Entities</Label>
                <div className="space-y-1">
                  {editingNote.linkedTo.map((link, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        className="border rounded px-2 py-1 text-xs flex-1"
                        value={link.entityType}
                        onChange={(e) => {
                          const updated = [...editingNote.linkedTo];
                          updated[i] = { ...updated[i], entityType: e.target.value };
                          setEditingNote({ ...editingNote, linkedTo: updated });
                        }}
                      >
                        <option value="formula">Formula</option>
                        <option value="protocol">Protocol</option>
                        <option value="trial">Trial</option>
                        <option value="ingredient">Ingredient</option>
                      </select>
                      <select
                        className="border rounded px-2 py-1 text-xs flex-1"
                        value={link.entityId}
                        onChange={(e) => {
                          const updated = [...editingNote.linkedTo];
                          updated[i] = { ...updated[i], entityId: e.target.value };
                          setEditingNote({ ...editingNote, linkedTo: updated });
                        }}
                      >
                        <option value="">Select...</option>
                        {link.entityType === "formula" &&
                          data.formulas.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        {link.entityType === "protocol" &&
                          data.protocols.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        {link.entityType === "trial" &&
                          data.trials.map((t) => (
                            <option key={t.id} value={t.id}>Trial #{t.runNumber}</option>
                          ))}
                        {link.entityType === "ingredient" &&
                          data.ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                          ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 shrink-0"
                        onClick={() => {
                          const updated = editingNote.linkedTo.filter((_, j) => j !== i);
                          setEditingNote({ ...editingNote, linkedTo: updated });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      setEditingNote({
                        ...editingNote,
                        linkedTo: [
                          ...editingNote.linkedTo,
                          { entityType: "formula", entityId: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Link Entity
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
