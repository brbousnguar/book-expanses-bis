"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createBook } from "@/lib/api";
import { getIdToken } from "@/lib/auth";

export default function NewBookPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"SHELF" | "READING" | "READ">("SHELF");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<string>("");
  const [currentPage, setCurrentPage] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [store, setStore] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [boughtAt, setBoughtAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const token = await getIdToken();
    createBook(token, {
      title,
      status,
      ...(description && { description }),
      ...(rating && { rating: Number(rating) }),
      ...(currentPage && { currentPage: Number(currentPage) }),
      ...(totalPages && { totalPages: Number(totalPages) }),
      ...(price && { price: Number(price) }),
      ...(currency && { currency }),
      ...(store && { store }),
      ...(purchaseDate && { purchaseDate }),
      ...(boughtAt && { boughtAt }),
    })
      .then((res) => {
        if (res.error) {
          setError(res.error.message);
          return;
        }
        if (res.data) {
          router.push("/books");
          router.refresh();
        }
      })
      .catch(() => setError("Failed to create book"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add book</CardTitle>
          <CardDescription>Create a new book entry. Title and status are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "SHELF" | "READING" | "READ")}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHELF">On shelf</SelectItem>
                  <SelectItem value="READING">Reading</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summary or notes"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1–5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPage">Current page</Label>
                <Input
                  id="currentPage"
                  type="number"
                  min={0}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalPages">Total pages</Label>
                <Input
                  id="totalPages"
                  type="number"
                  min={0}
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store">Store</Label>
                <Input
                  id="store"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  placeholder="Amazon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="boughtAt">Bought at (free text)</Label>
                <Input
                  id="boughtAt"
                  value={boughtAt}
                  onChange={(e) => setBoughtAt(e.target.value)}
                  placeholder="e.g. Amazon, Local bookstore"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create book"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/books">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
