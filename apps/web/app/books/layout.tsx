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
      <header className="glass-effect sticky top-0 z-50 shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/books" className="flex items-center gap-3 group">
            <div className="gradient-primary p-2 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Book Tracker
              </span>
              <span className="text-xs text-muted-foreground">Your reading journey</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
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
                className="hover:bg-purple-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
