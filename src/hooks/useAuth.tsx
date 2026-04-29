import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearLocalSession = async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Ignore network-related signOut failures.
      }
    };

    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session: initial }, error }) => {
        if (error) {
          const isNetworkIssue =
            error.message.includes("Failed to fetch") ||
            error.message.includes("AuthRetryableFetchError") ||
            error.message.includes("ERR_NAME_NOT_RESOLVED");

          if (isNetworkIssue) {
            // Clear stale local auth data so Supabase doesn't keep retrying refresh tokens.
            await clearLocalSession();
          }

          setSession(null);
          setUser(null);
          return;
        }

        setSession(initial);
        setUser(initial?.user ?? null);
      })
      .catch(async () => {
        await clearLocalSession();
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
