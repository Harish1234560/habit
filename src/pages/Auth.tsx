import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqName, setReqName] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const getNetworkSafeMessage = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("Failed to fetch") ||
      message.includes("ERR_NAME_NOT_RESOLVED") ||
      message.includes("NetworkError")
    ) {
      return "Unable to reach authentication server. Please verify your Supabase URL/internet and try again.";
    }
    return message || fallback;
  };

  useEffect(() => {
    if (user && !loading) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(getNetworkSafeMessage(error, "Sign in failed"));
        return;
      }

      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(getNetworkSafeMessage(error, "Sign in failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("pending_signups").insert({
        email: reqEmail.trim(),
        display_name: reqName.trim() || null,
        note: reqNote.trim() || null,
      });
      if (error) {
        toast.error(getNetworkSafeMessage(error, "Request submission failed"));
        return;
      }

      setRequested(true);
      toast.success("Request submitted — admin will review it.");
    } catch (error) {
      toast.error(getNetworkSafeMessage(error, "Request submission failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(getNetworkSafeMessage(result.error, "Google sign-in failed"));
        return;
      }
    } catch (error) {
      toast.error(getNetworkSafeMessage(error, "Google sign-in failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-heading font-bold">
            LifeOS <span className="text-primary">Ultra</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Time Intelligence System</p>
        </div>
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="request">Request access</TabsTrigger>
          </TabsList>

          <Button type="button" variant="outline" className="w-full mt-4" onClick={handleGoogle} disabled={submitting}>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email-l">Email</Label>
                <Input id="email-l" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pw-l">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
                </div>
                <Input id="pw-l" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="request">
            {requested ? (
              <div className="mt-4 text-sm">
                <p className="font-medium mb-2">Request received ✓</p>
                <p className="text-muted-foreground">
                  An admin will review your request. Once approved, you'll be sent your login credentials.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequest} className="space-y-4 mt-4">
                <p className="text-xs text-muted-foreground">
                  This is an invite-only app. Submit a request and an admin will create your account.
                </p>
                <div>
                  <Label htmlFor="name-r">Your name</Label>
                  <Input id="name-r" value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="Optional" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="email-r">Email</Label>
                  <Input id="email-r" type="email" required value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} maxLength={255} />
                </div>
                <div>
                  <Label htmlFor="note-r">Why do you want access?</Label>
                  <Textarea id="note-r" value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="Optional" maxLength={500} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit request
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
