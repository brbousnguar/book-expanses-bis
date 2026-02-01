"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getIdToken, signOut, isConfigured, isLocalApi } from "@/lib/auth";

export default function BooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLocalApi() || !isConfigured()) {
      setToken(null);
      setChecking(false);
      return;
    }
    const timeout = setTimeout(() => setChecking(false), 2000);
    getIdToken()
      .then((t) => {
        setToken(t);
        if (!t && pathname !== "/login") {
          router.push("/login");
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setChecking(false);
      });
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <Link href="/books" className="font-semibold text-lg">
          Book Tracker
        </Link>
        <div className="flex items-center gap-2">
          {isConfigured() && token && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOut();
                setToken(null);
                router.push("/login");
                router.refresh();
              }}
            >
              Sign out
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
