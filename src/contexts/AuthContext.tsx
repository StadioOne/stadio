import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AdminRole = "owner" | "admin" | "editor" | "support";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AdminRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AdminRole | AdminRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  support: 1,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("role")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role as AdminRole | null;
    } catch (err) {
      console.error("Error in fetchUserRole:", err);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Defer role fetching to avoid blocking
        setTimeout(async () => {
          const userRole = await fetchUserRole(newSession.user.id);
          setRole(userRole);
          setIsLoading(false);
        }, 0);
      } else {
        setRole(null);
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        const userRole = await fetchUserRole(existingSession.user.id);
        setRole(userRole);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const hasRole = (requiredRole: AdminRole | AdminRole[]): boolean => {
    if (!role) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.some(
        (r) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[r]
      );
    }

    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
  };

  const isAdmin = role !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        isAdmin,
        signIn,
        signUp,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
