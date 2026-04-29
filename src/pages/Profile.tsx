import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Upload, Trash2, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileData {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
}

type SavedProfileData = ProfileData;

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_DISPLAY_NAME = 50;
const MAX_USERNAME = 30;
const MAX_BIO = 160;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const USERNAME_REGEX = /^[a-zA-Z0-9_]*$/;
const ACCEPTED_IMAGE_TYPES = "image/png, image/jpeg, image/webp, image/gif";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(displayName: string, email?: string): string {
  const source = displayName.trim() || email || "?";
  return source.slice(0, 2).toUpperCase();
}

function isDirty(current: ProfileData, saved: SavedProfileData | null): boolean {
  if (!saved) return false;
  return (
    current.display_name !== saved.display_name ||
    current.username !== saved.username ||
    current.bio !== saved.bio ||
    current.avatar_url !== saved.avatar_url
  );
}

function validateProfile(data: ProfileData): string | null {
  if (!data.display_name.trim()) return "Display name is required.";
  if (data.display_name.length > MAX_DISPLAY_NAME)
    return `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`;
  if (data.username && !USERNAME_REGEX.test(data.username))
    return "Username may only contain letters, numbers, and underscores.";
  if (data.username.length > MAX_USERNAME)
    return `Username must be ${MAX_USERNAME} characters or fewer.`;
  if (data.bio.length > MAX_BIO) return `Bio must be ${MAX_BIO} characters or fewer.`;
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    username: "",
    bio: "",
    avatar_url: null,
  });
  const [savedProfile, setSavedProfile] = useState<SavedProfileData | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, username, bio, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      const fetched: ProfileData = {
        display_name: data.display_name ?? "",
        username: data.username ?? "",
        bio: data.bio ?? "",
        avatar_url: data.avatar_url ?? null,
      };
      setProfile(fetched);
      setSavedProfile(fetched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Unsaved changes guard ──────────────────────────────────────────────────

  useEffect(() => {
    const dirty = isDirty(profile, savedProfile);
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [profile, savedProfile]);

  const handleBack = () => {
    if (isDirty(profile, savedProfile)) {
      if (!window.confirm("You have unsaved changes. Leave anyway?")) return;
    }
    navigate("/");
  };

  // ── Field helpers ──────────────────────────────────────────────────────────

  const setField = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;
    const error = validateProfile(profile);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name.trim(),
        username: profile.username.trim() || null,
        bio: profile.bio.trim() || null,
        avatar_url: profile.avatar_url,
      })
      .eq("user_id", user.id);
    setSaving(false);

    if (dbError) {
      toast.error(dbError.message);
    } else {
      setSavedProfile({ ...profile });
      setLocalAvatarPreview(null);
      toast.success("Profile updated successfully.");
    }
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 2 MB.");
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setLocalAvatarPreview(objectUrl);

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (upErr) {
      toast.error(upErr.message);
      setLocalAvatarPreview(null);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setField("avatar_url", data.publicUrl);
    setUploading(false);
    toast.success("Avatar ready — click Save to apply.");

    // Clean up the object URL
    URL.revokeObjectURL(objectUrl);
    setLocalAvatarPreview(null);

    // Reset file input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteAvatar = () => {
    setLocalAvatarPreview(null);
    setField("avatar_url", null);
    toast.info("Avatar removed — click Save to apply.");
  };

  // ── Password reset ─────────────────────────────────────────────────────────

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Password reset email sent to ${user.email}.`);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const displayedAvatar = localAvatarPreview ?? profile.avatar_url;
  const initials = getInitials(profile.display_name, user?.email);
  const hasUnsavedChanges = isDirty(profile, savedProfile);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-400">
              Unsaved changes
            </Badge>
          )}
        </div>

        {/* Main card */}
        <Card className="p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-heading font-bold mb-1">Your Profile</h1>
            <p className="text-sm text-muted-foreground">
              Update your display name, username, avatar, and bio.
            </p>
          </div>

          {/* Avatar section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                {displayedAvatar && (
                  <AvatarImage src={displayedAvatar} alt={profile.display_name} />
                )}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload picture
              </Button>

              {displayedAvatar && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteAvatar}
                  disabled={uploading}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP or GIF — max 2 MB
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-5">
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>

            {/* Display name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="display-name">Display name *</Label>
                <span
                  className={`text-xs tabular-nums ${
                    profile.display_name.length > MAX_DISPLAY_NAME
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {profile.display_name.length}/{MAX_DISPLAY_NAME}
                </span>
              </div>
              <Input
                id="display-name"
                value={profile.display_name}
                onChange={(e) => setField("display_name", e.target.value)}
                placeholder="Your name"
                maxLength={MAX_DISPLAY_NAME + 10}
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="username">
                  Username
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <span
                  className={`text-xs tabular-nums ${
                    profile.username.length > MAX_USERNAME
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {profile.username.length}/{MAX_USERNAME}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                  @
                </span>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setField("username", e.target.value)}
                  placeholder="yourhandle"
                  className="pl-7"
                  maxLength={MAX_USERNAME + 5}
                />
              </div>
              {profile.username && !USERNAME_REGEX.test(profile.username) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Letters, numbers, and underscores only.
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">
                  Bio
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <span
                  className={`text-xs tabular-nums ${
                    profile.bio.length > MAX_BIO
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {profile.bio.length}/{MAX_BIO}
                </span>
              </div>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Tell us a little about yourself…"
                rows={3}
                className="resize-none"
                maxLength={MAX_BIO + 20}
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </Card>

        {/* Security card */}
        <Card className="p-8">
          <h2 className="text-lg font-semibold mb-1">Security</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Manage your password and account security settings.
          </p>
          <Separator className="mb-6" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">
                Send a password-reset link to your email.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={sendingReset}
            >
              {sendingReset ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Reset password
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}