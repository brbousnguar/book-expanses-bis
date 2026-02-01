"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listBooks } from "@/lib/api";
import { getIdToken, isConfigured, isLocalApi } from "@/lib/auth";
import type { Book } from "@book-tracker/types";
import { BookOpen, Plus } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  SHELF: "On shelf",
  READING: "Reading",
  READ: "Read",
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("updatedAt_desc");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (isLocalApi() || !isConfigured()) {
      setToken(null);
      setLoading(false);
      return;
    }
    getIdToken().then(setToken);
  }, []);

  useEffect(() => {
    if (isLocalApi() || !isConfigured()) {
      setLoading(true);
      listBooks(null, {
        status: statusFilter === "all" ? undefined : statusFilter,
        sort: sort as "updatedAt_asc" | "updatedAt_desc",
      })
        .then((res) => {
          if (res.data) setBooks(res.data.items);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }
    if (token === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listBooks(token, {
      status: statusFilter === "all" ? undefined : statusFilter,
      sort: sort as "updatedAt_asc" | "updatedAt_desc",
    })
      .then((res) => {
        if (res.data) setBooks(res.data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, statusFilter, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">My Books</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="SHELF">{STATUS_LABELS.SHELF}</SelectItem>
              <SelectItem value="READING">{STATUS_LABELS.READING}</SelectItem>
              <SelectItem value="READ">{STATUS_LABELS.READ}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt_desc">Newest first</SelectItem>
              <SelectItem value="updatedAt_asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/books/new">
              <Plus className="mr-2 h-4 w-4" />
              Add book
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading books…</p>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No books yet.</p>
            <Button asChild>
              <Link href="/books/new">Add your first book</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <li key={book.id}>
              <Link href={`/books/${book.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold leading-tight line-clamp-2">
                        {book.title}
                      </h2>
                      <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs">
                        {STATUS_LABELS[book.status] ?? book.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {book.rating != null && (
                      <p className="text-sm text-muted-foreground">
                        Rating: {book.rating}/5
                      </p>
                    )}
                    {book.currentPage != null && book.totalPages != null && (
                      <p className="text-sm text-muted-foreground">
                        Page {book.currentPage} / {book.totalPages}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(book.updatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
