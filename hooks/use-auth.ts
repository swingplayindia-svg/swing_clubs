"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type User as FirebaseUser } from "firebase/auth";
import { loginWithGoogle, logoutFirebase, subscribeToFirebaseAuth } from "@/lib/firebase-auth";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

function mapUser(u: FirebaseUser): AuthUser {
  return {
    uid:         u.uid,
    email:       u.email ?? "",
    displayName: u.displayName ?? u.email?.split("@")[0] ?? "User",
    photoURL:    u.photoURL ?? undefined,
  };
}

export function useAuth() {
  const router   = useRouter();
  const [user,        setUser]       = useState<AuthUser | null>(null);
  const [isLoading,   setIsLoading]  = useState(true);
  const [error,       setError]      = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToFirebaseAuth((fbUser) => {
      setUser(fbUser ? mapUser(fbUser) : null);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
      return true;
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return false; // silent
      }
      setError("Sign-in failed. Please try again.");
      return false;
    }
  };

  const logout = async () => {
    await logoutFirebase();
    setUser(null);
    router.push("/login");
  };

  return { user, isLoading, error, login, logout, isAuthenticated: user !== null };
}
