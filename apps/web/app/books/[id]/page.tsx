"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  getBook,
  updateBook,
  deleteBook,
  createNote,
  listNotes,
  recordPage,
  listEvents,
} from "@/lib/api";
import { getIdToken, isLocalApi, isConfigured } from "@/lib/auth";
import type { Book, Note, ReadingEvent } from "@book-tracker/types";
import { ArrowLeft, Pencil, Trash2, Plus, BookOpen } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  SHELF: "On shelf",
  READING: "Reading",
  READ: "Read",
};
const FORMAT_LABELS: Record<string, string> = {
  PHYSICAL: "Physical",
  ELECTRONIC: "Electronic (PDF, EPUB)",
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<ReadingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Book>>({});
  const [noteContent, setNoteContent] = useState("");
  const [pageValue, setPageValue] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [uploadCoverLoading, setUploadCoverLoading] = useState(false);

  useEffect(() => {
    if (isLocalApi() || !isConfigured()) {
      setToken(null);
      return;
    }
    getIdToken().then(setToken);
  }, []);

  useEffect(() => {
    const t = isLocalApi() || !isConfigured() ? null : token;
    if (t === null && !isLocalApi() && isConfigured()) return;
    setLoading(true);
    Promise.all([
      getBook(t ?? null, id),
      listNotes(t ?? null, id),
      listEvents(t ?? null, id),
    ])
      .then(([bookRes, notesRes, eventsRes]) => {
        if (bookRes.data) {
          setBook(bookRes.data);
          setEditForm(bookRes.data);
        }
        if (notesRes.data) setNotes(notesRes.data.items);
        if (eventsRes.data) setEvents(eventsRes.data.items);
        if (bookRes.status === 404 || bookRes.status === 403) {
          router.push("/books");
          return;
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, id, router]);

  async function handleCoverUploadEdit(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadCoverLoading(true);
    setImagePreviewError(false);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const res = await fetch("/api/upload-cover", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setEditForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadCoverLoading(false);
      e.target.value = "";
    }
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!book) return;
    if (!token && !isLocalApi()) return;
    setError("");
    const payload = {
      title: editForm.title,
      status: editForm.status,
      description: editForm.description ?? undefined,
      rating: editForm.rating ?? undefined,
      currentPage: editForm.currentPage ?? undefined,
      totalPages: editForm.totalPages ?? undefined,
      price: editForm.price ?? undefined,
      currency: editForm.currency ?? undefined,
      store: editForm.store ?? undefined,
      purchaseDate: editForm.purchaseDate ?? undefined,
      boughtAt: editForm.boughtAt ?? undefined,
      imageUrl: editForm.imageUrl ?? null,
      format: editForm.format ?? undefined,
    };
    updateBook(token ?? null, id, payload).then((res) => {
      if (res.data) {
        setBook(res.data);
        setEditForm(res.data);
        setEditing(false);
      }
      if (res.error) setError(res.error.message);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this book and all its notes and reading events?")) return;
    if (!token && !isLocalApi()) return;
    deleteBook(token ?? null, id).then((res) => {
      if (res.status === 204) {
        router.push("/books");
        router.refresh();
      }
      if (res.error) setError(res.error.message);
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    if (!token && !isLocalApi()) return;
    setError("");
    createNote(token ?? null, id, { content: noteContent.trim() }).then((res) => {
      if (res.data) {
        setNotes((prev) => [res.data!, ...prev]);
        setNoteContent("");
      }
      if (res.error) setError(res.error.message);
    });
  }

  function handleRecordPage(e: React.FormEvent) {
    e.preventDefault();
    const page = parseInt(pageValue, 10);
    if (Number.isNaN(page) || page < 0) return;
    if (!token && !isLocalApi()) return;
    setError("");
    recordPage(token ?? null, id, { page }).then((res) => {
      if (res.data) {
        setEvents((prev) => [res.data!, ...prev]);
        setPageValue("");
        getBook(token ?? null, id).then((r) => {
          if (r.data) setBook(r.data);
        });
      }
      if (res.error) setError(res.error.message);
    });
  }

  if (loading || !book) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/books">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold truncate flex-1">{book.title}</h1>
        <Button
          variant={editing ? "secondary" : "outline"}
          size="sm"
          onClick={() => setEditing(!editing)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          {editing ? "Cancel" : "Edit"}
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit book</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status ?? "SHELF"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Book["status"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHELF">{STATUS_LABELS.SHELF}</SelectItem>
                    <SelectItem value="READING">{STATUS_LABELS.READING}</SelectItem>
                    <SelectItem value="READ">{STATUS_LABELS.READ}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.description ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value || null }))}
                />
              </div>
              <div className="space-y-3">
                <Label>Cover image</Label>
                <p className="text-sm text-muted-foreground">
                  Paste a link for a preview, or upload an image to store it in the app.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-imageUrl" className="text-xs">Paste link</Label>
                    <Input
                      id="edit-imageUrl"
                      type="text"
                      value={editForm.imageUrl ?? ""}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, imageUrl: e.target.value || null }));
                        setImagePreviewError(false);
                      }}
                      placeholder="https://… (e.g. Amazon, Momox)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-coverFile" className="text-xs">Or upload from computer</Label>
                    <Input
                      id="edit-coverFile"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleCoverUploadEdit}
                      disabled={uploadCoverLoading}
                      className="cursor-pointer"
                    />
                    {uploadCoverLoading && <p className="text-xs text-muted-foreground">Uploading…</p>}
                  </div>
                </div>
                {(editForm.imageUrl ?? "") && (
                  <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                    <div className="h-24 w-16 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {!imagePreviewError ? (
                        <img
                          src={editForm.imageUrl!}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                          onLoad={() => setImagePreviewError(false)}
                          onError={() => setImagePreviewError(true)}
                        />
                      ) : (
                        <span className="text-xs text-destructive px-1 text-center">Link doesn’t load</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">
                        {imagePreviewError
                          ? "Preview failed. The link may be invalid or blocked; you can still save."
                          : "Preview: link works."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm((f) => ({ ...f, imageUrl: null }));
                          setImagePreviewError(false);
                        }}
                        className="text-xs text-muted-foreground underline mt-1"
                      >
                        Clear cover
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={editForm.format ?? ""}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, format: (v || null) as Book["format"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Physical or electronic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHYSICAL">{FORMAT_LABELS.PHYSICAL}</SelectItem>
                    <SelectItem value="ELECTRONIC">{FORMAT_LABELS.ELECTRONIC}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rating (1–5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={0.5}
                    value={editForm.rating ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        rating: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current page</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.currentPage ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        currentPage: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total pages</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.totalPages ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        totalPages: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step={0.01}
                    value={editForm.price ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        price: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={editForm.currency ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store</Label>
                  <Input
                    value={editForm.store ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, store: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase date</Label>
                  <Input
                    type="date"
                    value={editForm.purchaseDate ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, purchaseDate: e.target.value || null }))
                    }
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Bought at</Label>
                  <Input
                    value={editForm.boughtAt ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, boughtAt: e.target.value || null }))}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex gap-4">
              {book.imageUrl ? (
                <img
                  key={book.imageUrl}
                  src={book.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-32 w-24 shrink-0 rounded object-cover bg-muted"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="h-32 w-24 shrink-0 rounded bg-muted flex items-center justify-center"
                style={book.imageUrl ? { display: "none" } : undefined}
              >
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{book.title}</CardTitle>
                  <span className="rounded bg-muted px-2 py-0.5 text-sm shrink-0">
                    {STATUS_LABELS[book.status] ?? book.status}
                  </span>
                </div>
                {book.format && (
                  <span className="text-sm text-muted-foreground">
                    {FORMAT_LABELS[book.format] ?? book.format}
                  </span>
                )}
                {book.description && (
                  <CardDescription className="whitespace-pre-wrap mt-1">{book.description}</CardDescription>
                )}
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {book.rating != null && <span>Rating: {book.rating}/5</span>}
                {book.price != null && (
                  <span>
                    {book.currency ?? ""} {book.price}
                  </span>
                )}
                {book.store && <span>Store: {book.store}</span>}
                {book.purchaseDate && <span>Purchased: {book.purchaseDate}</span>}
                {book.boughtAt && <span>Bought at: {book.boughtAt}</span>}
              </div>
              {book.currentPage != null && book.totalPages != null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Page {book.currentPage} / {book.totalPages}
                    </span>
                    <span className="font-medium text-primary">
                      {Math.round((book.currentPage / book.totalPages) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={book.currentPage}
                    max={book.totalPages}
                    className="h-2.5"
                  />
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Record page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Record progress
          </CardTitle>
          <CardDescription>
            Update current page. This creates an immutable reading event (docs/spec.md, ADR-0003).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecordPage} className="flex gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Page number"
              value={pageValue}
              onChange={(e) => setPageValue(e.target.value)}
              className="max-w-[120px]"
            />
            <Button type="submit" disabled={!pageValue.trim()}>
              Record
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Reading timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reading timeline</CardTitle>
          <CardDescription>Chronological reading events (newest first).</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reading events yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span>Page {ev.page}</span>
                  <span className="text-muted-foreground">
                    {new Date(ev.occurredAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription>Free-form notes for this book.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <textarea
              className="flex min-h-[60px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Add a note…"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <Button type="submit" disabled={!noteContent.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded border bg-muted/30 p-3 text-sm whitespace-pre-wrap"
                >
                  {note.content}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
