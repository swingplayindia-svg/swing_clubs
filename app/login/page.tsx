"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogle } from "@/lib/firebase-auth";
import { Radio, Loader2, ShieldCheck } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const router              = useRouter();
  const { theme, toggle }   = useTheme();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // silent
      } else if (code === "auth/popup-blocked") {
        setError("Popup was blocked — please allow popups for this site and try again.");
      } else {
        setError("Sign-in failed. Make sure your Google account has access to this portal.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-60 -right-60 w-[700px] h-[700px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute -bottom-60 -left-60 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[80px]" />
      </div>

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-[15px] tracking-tight">Swing</span>
        </div>
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition text-muted-foreground hover:text-foreground"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">

          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5 shadow-sm">
              <Radio className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-none">
              Organizer Portal
            </h1>
            <p className="text-muted-foreground mt-2 text-[14px]">
              Your command center for Swing clubs and tournaments
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/40 p-7">
            <h2 className="text-[17px] font-semibold text-foreground mb-1 text-center">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-[13px] mb-6 text-center">
              Sign in with the Google account linked to your club
            </p>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-3.5 py-2.5 text-[13px] text-destructive mb-5 leading-snug">
                {error}
              </div>
            )}

            {/* Google sign-in button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-[14px] hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {loading ? "Signing in…" : "Continue with Google"}
            </button>

            {/* Access notice */}
            <div className="flex items-start gap-2.5 mt-5 pt-4 border-t border-border">
              <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Access is restricted to verified club owners, admins, scorekeepers, and commentators.
              </p>
            </div>
          </div>

          <p className="text-center text-[12px] text-muted-foreground/60 mt-6">
            Swing Organizer · Built for club managers
          </p>
        </div>
      </div>
    </div>
  );
}
