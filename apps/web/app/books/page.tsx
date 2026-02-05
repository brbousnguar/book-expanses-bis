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
import { Progress } from "@/components/ui/progress";
import { listBooks } from "@/lib/api";
import { getIdToken, isConfigured, isLocalApi } from "@/lib/auth";
import type { Book } from "@book-tracker/types";
import { BookOpen, Plus } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  SHELF: "On shelf",
  READING: "Reading",
  READ: "Read",
};
const FORMAT_LABELS: Record<string, string> = {
  PHYSICAL: "Physical",
  ELECTRONIC: "Electronic",
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            My Books
          </h1>
          <p className="text-muted-foreground">Organize and track your reading adventure</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] border-purple-200 focus:ring-purple-500">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📚 All</SelectItem>
              <SelectItem value="SHELF">📖 {STATUS_LABELS.SHELF}</SelectItem>
              <SelectItem value="READING">📗 {STATUS_LABELS.READING}</SelectItem>
              <SelectItem value="READ">✅ {STATUS_LABELS.READ}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px] border-purple-200 focus:ring-purple-500">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt_desc">🆕 Newest first</SelectItem>
              <SelectItem value="updatedAt_asc">🕐 Oldest first</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild className="gradient-primary shine-effect shadow-lg hover:shadow-xl transition-all">
            <Link href="/books/new">
              <Plus className="mr-2 h-4 w-4" />
              Add book
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Loading your library…</p>
          </div>
        </div>
      ) : books.length === 0 ? (
        <Card className="border-0 shadow-2xl gradient-card overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-20 px-6 relative">
            <div className="absolute top-0 left-0 w-full h-2 gradient-primary"></div>
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-purple-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative gradient-primary p-6 rounded-3xl shadow-lg">
                <BookOpen className="h-16 w-16 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center">Your library awaits!</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Start building your personal collection and track your reading journey
            </p>
            <Button asChild size="lg" className="gradient-primary shine-effect shadow-lg hover:shadow-xl transition-all">
              <Link href="/books/new">
                <Plus className="mr-2 h-5 w-5" />
                Add your first book
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book, index) => (
            <li key={book.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
              <Link href={`/books/${book.id}`}>
                <Card className="h-full transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 shadow-lg gradient-card group overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 gradient-primary"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        {book.imageUrl ? (
                          <img
                            src={book.imageUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-28 w-20 rounded-lg object-cover shadow-md ring-2 ring-purple-100 group-hover:ring-purple-300 transition-all"
                          />
                        ) : (
                          <div className="h-28 w-20 rounded-lg gradient-primary flex items-center justify-center shadow-md">
                            <BookOpen className="h-8 w-8 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h2 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-purple-600 transition-colors">
                            {book.title}
                          </h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
                            {STATUS_LABELS[book.status] ?? book.status}
                          </span>
                          {book.format && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                              {FORMAT_LABELS[book.format] ?? book.format}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {book.rating != null && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${
                              i < book.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-sm font-semibold text-gray-700">{book.rating}/5</span>
                      </div>
                    )}
                    {book.currentPage != null && book.totalPages != null && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium">
                            📄 Page {book.currentPage} / {book.totalPages}
                          </span>
                          <span className="font-bold text-purple-600">
                            {Math.round((book.currentPage / book.totalPages) * 100)}%
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full gradient-primary rounded-full transition-all duration-500"
                            style={{ width: `${(book.currentPage / book.totalPages) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-purple-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Updated {new Date(book.updatedAt).toLocaleDateString()}</span>
                    </div>
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
