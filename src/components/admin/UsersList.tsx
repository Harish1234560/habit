import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldOff, Trash2 } from "lucide-react";

export interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
}

interface Props {
  users: AdminUser[];
  currentUserId: string | undefined;
  actingId: string | null;
  onDelete: (u: AdminUser) => void;
  onToggleAdmin: (u: AdminUser) => void;
}

export function UsersList({ users, currentUserId, actingId, onDelete, onToggleAdmin }: Props) {
  if (users.length === 0) {
    return <Card className="p-6 text-sm text-muted-foreground">No users yet.</Card>;
  }
  return (
    <div className="space-y-3">
      {users.map((u) => {
        const isAdmin = u.roles.includes("admin");
        const isSelf = u.id === currentUserId;
        const busy = actingId === u.id;
        return (
          <Card key={u.id} className="p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{u.display_name || u.email}</span>
                {isAdmin && (
                  <Badge variant="default" className="gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </Badge>
                )}
                {isSelf && <Badge variant="outline">You</Badge>}
              </div>
              <div className="text-sm text-muted-foreground truncate">{u.email}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Joined {new Date(u.created_at).toLocaleDateString()}
                {u.last_sign_in_at && (
                  <> · Last login {new Date(u.last_sign_in_at).toLocaleDateString()}</>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleAdmin(u)}
                disabled={busy || (isSelf && isAdmin)}
                title={
                  isSelf && isAdmin
                    ? "You cannot revoke your own admin role"
                    : isAdmin
                      ? "Revoke admin"
                      : "Promote to admin"
                }
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isAdmin ? (
                  <>
                    <ShieldOff className="w-4 h-4 mr-1" /> Revoke
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" /> Make admin
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(u)}
                disabled={isSelf || busy}
                title={isSelf ? "You cannot delete your own account" : "Delete user"}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
