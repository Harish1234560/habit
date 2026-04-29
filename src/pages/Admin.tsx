import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Check, X, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UsersList, type AdminUser } from "@/components/admin/UsersList";

interface PendingRequest {
  id: string;
  email: string;
  display_name: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

interface IssuedCredential {
  id: string;
  email: string;
  display_name: string | null;
  temp_password: string;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchAll = async () => {
    const [r, c, u] = await Promise.all([
      supabase.from("pending_signups").select("*").order("created_at", { ascending: false }),
      supabase.from("issued_credentials").select("*").order("created_at", { ascending: false }),
      supabase.functions.invoke("admin-list-users"),
    ]);
    if (r.data) setRequests(r.data as PendingRequest[]);
    if (c.data) setCredentials(c.data as IssuedCredential[]);
    const usersData = (u.data as { users?: AdminUser[] } | null)?.users;
    if (usersData) setUsers(usersData);
    setLoading(false);
  };

  const handleToggleAdmin = async (u: AdminUser) => {
    const isAdmin = u.roles.includes("admin");
    const verb = isAdmin ? "revoke admin from" : "promote to admin";
    if (!confirm(`Are you sure you want to ${verb} ${u.email}?`)) return;
    setActingId(u.id);
    const { data, error } = await supabase.functions.invoke("admin-set-role", {
      body: { user_id: u.id, role: "admin", action: isAdmin ? "revoke" : "grant" },
    });
    setActingId(null);
    if (error || (data as { error?: string })?.error) {
      toast.error(error?.message || (data as { error?: string }).error || "Failed");
      return;
    }
    toast.success(isAdmin ? "Admin role revoked" : "User promoted to admin");
    fetchAll();
  };

  const handleDeleteUser = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.email}? This permanently removes their account and all their data.`)) return;
    setActingId(u.id);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: u.id },
    });
    setActingId(null);
    if (error || (data as { error?: string })?.error) {
      toast.error(error?.message || (data as { error?: string }).error || "Failed");
      return;
    }
    toast.success("User deleted");
    fetchAll();
  };

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/", { replace: true });
      return;
    }
    if (isAdmin) fetchAll();
  }, [isAdmin, roleLoading, navigate]);

  const handleApprove = async (req: PendingRequest) => {
    setActingId(req.id);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email: req.email, display_name: req.display_name, request_id: req.id },
    });
    setActingId(null);
    if (error || (data as { error?: string })?.error) {
      toast.error(error?.message || (data as { error?: string }).error || "Failed");
      return;
    }
    toast.success(`Account created for ${req.email}. Share the password from the Issued Credentials tab.`);
    fetchAll();
  };

  const handleReject = async (req: PendingRequest) => {
    setActingId(req.id);
    const { error } = await supabase
      .from("pending_signups")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    setActingId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Request rejected");
      fetchAll();
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Delete this credential record? The user account will remain.")) return;
    const { error } = await supabase.from("issued_credentials").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Credential removed");
      fetchAll();
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <h1 className="text-3xl font-heading font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">Approve access requests and manage user credentials.</p>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">
              Requests {pending.length > 0 && <Badge variant="secondary" className="ml-2">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="users">
              All Users <Badge variant="secondary" className="ml-2">{users.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="credentials">Issued Credentials</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersList
              users={users}
              currentUserId={user?.id}
              actingId={actingId}
              onDelete={handleDeleteUser}
              onToggleAdmin={handleToggleAdmin}
            />
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-3">
            {pending.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground">No pending requests.</Card>
            )}
            {pending.map((req) => (
              <Card key={req.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{req.display_name || req.email}</div>
                  <div className="text-sm text-muted-foreground">{req.email}</div>
                  {req.note && <div className="text-sm mt-2 italic">"{req.note}"</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(req.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleReject(req)} disabled={actingId === req.id}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(req)} disabled={actingId === req.id}>
                    {actingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Approve & Create
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="credentials" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Share these credentials with users. They can change their password after first login.
            </p>
            {credentials.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground">No credentials yet.</Card>
            )}
            {credentials.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{c.email}</code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(c.email)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Temporary password</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{c.temp_password}</code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(c.temp_password)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteCredential(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {requests.filter((r) => r.status !== "pending").length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground">No history yet.</Card>
            )}
            {requests
              .filter((r) => r.status !== "pending")
              .map((req) => (
                <Card key={req.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{req.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={req.status === "approved" ? "default" : "secondary"}>{req.status}</Badge>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
