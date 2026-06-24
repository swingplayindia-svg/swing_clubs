"use client";

import { use, useState, useEffect } from "react";
import { useClub } from "@/hooks/use-club-data";
import { updateClub } from "@/lib/firestore/clubs";
import { Save, Globe, Mail, Instagram, Camera, Loader2, Building2, MapPin, Palette } from "lucide-react";
import { toast } from "sonner";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { initials } from "@/lib/utils";

async function uploadClubImage(
  clubId: string,
  slot: "logo" | "cover",
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const sRef = storageRef(getFirebaseStorage(), `clubs/${clubId}/${slot}`);
    const task = uploadBytesResumable(sRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

// ─── Image Upload Widget ────────────────────────────────────────────────────
function ImageUploadWidget({
  currentUrl,
  fallback,
  shape,
  label,
  onUploaded,
}: {
  currentUrl?: string | null;
  fallback: string;
  shape: "square" | "wide";
  label: string;
  onUploaded: (url: string) => void;
}) {
  const [preview,  setPreview]  = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const inputId = `upload-${label.replace(/\s/g, "-")}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB."); return; }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const sRef = storageRef(getFirebaseStorage(), `placeholder/${label}`);
    void sRef; // The parent calls onUploaded with the actual upload
    onUploaded(objectUrl); // optimistic preview — actual upload happens in parent
    e.target.value = "";
  };

  const displaySrc = preview ?? currentUrl;

  if (shape === "wide") {
    return (
      <label htmlFor={inputId} className="block cursor-pointer group">
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-dashed border-border bg-muted hover:border-primary/40 transition">
          {displaySrc ? (
            <img src={displaySrc} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Camera className="w-6 h-6" />
              <span className="text-xs">Upload cover image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            {progress != null ? (
              <><Loader2 className="w-5 h-5 text-white animate-spin" /><span className="text-white text-sm">{progress}%</span></>
            ) : (
              <><Camera className="w-5 h-5 text-white" /><span className="text-white text-sm font-medium">Change Cover</span></>
            )}
          </div>
        </div>
        <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </label>
    );
  }

  return (
    <label htmlFor={inputId} className="block cursor-pointer group">
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-border bg-muted hover:border-primary/40 transition">
        {displaySrc ? (
          <img src={displaySrc} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg font-bold text-muted-foreground">{fallback.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div className="absolute inset-0 rounded-2xl bg-black/65 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
          {progress != null ? (
            <><Loader2 className="w-4 h-4 text-white animate-spin" /><span className="text-[9px] text-white">{progress}%</span></>
          ) : (
            <><Camera className="w-4 h-4 text-white" /><span className="text-[9px] text-white font-medium">Change</span></>
          )}
        </div>
      </div>
      <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </label>
  );
}

export default function ClubSettingsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club }   = useClub(clubId);

  const [form, setForm] = useState({
    name: "", tagline: "", description: "",
    contactEmail: "", website: "", instagramHandle: "",
    locationLabel: "", locationCity: "",
  });
  const [saving,          setSaving]         = useState(false);
  const [logoUploading,   setLogoUploading]  = useState(false);
  const [coverUploading,  setCoverUploading] = useState(false);
  const [logoProgress,    setLogoProgress]   = useState(0);
  const [coverProgress,   setCoverProgress]  = useState(0);
  const [logoPreview,     setLogoPreview]    = useState<string | null>(null);
  const [coverPreview,    setCoverPreview]   = useState<string | null>(null);

  useEffect(() => {
    if (club) {
      setForm({
        name:            club.name            ?? "",
        tagline:         club.tagline         ?? "",
        description:     club.description     ?? "",
        contactEmail:    club.contactEmail    ?? "",
        website:         club.website         ?? "",
        instagramHandle: club.instagramHandle ?? "",
        locationLabel:   club.locationLabel   ?? "",
        locationCity:    club.locationCity    ?? "",
      });
    }
  }, [club?.id]);

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    setLogoPreview(URL.createObjectURL(file));
    try {
      const url = await uploadClubImage(clubId, "logo", file, setLogoProgress);
      await updateClub(clubId, { logoImageUrl: url });
      toast.success("Club logo updated!");
    } catch {
      toast.error("Logo upload failed.");
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
      setLogoProgress(0);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    setCoverPreview(URL.createObjectURL(file));
    try {
      const url = await uploadClubImage(clubId, "cover", file, setCoverProgress);
      await updateClub(clubId, { coverImageUrl: url });
      toast.success("Cover image updated!");
    } catch {
      toast.error("Cover upload failed.");
      setCoverPreview(null);
    } finally {
      setCoverUploading(false);
      setCoverProgress(0);
    }
  };

  // Intercept the "optimistic" call from ImageUploadWidget for logo
  const logoInputRef = { current: null as HTMLInputElement | null };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateClub(clubId, form);
      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof form,
    placeholder?: string,
    textarea?: boolean,
    icon?: React.ReactNode,
  ) => (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition"
        />
      ) : icon ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{icon}</span>
          <input
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
        </div>
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Club Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your club's profile — changes sync instantly to the iOS app.</p>
      </div>

      {/* Branding */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Club Branding</h2>
        </div>
        <div className="p-6 space-y-5">
          {/* Cover image */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Cover Image
            </label>
            <div className="relative">
              <label className="block cursor-pointer group">
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-dashed border-border bg-muted hover:border-primary/40 transition">
                  {(coverPreview ?? club?.coverImageUrl) ? (
                    <img
                      src={coverPreview ?? club?.coverImageUrl ?? ""}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Camera className="w-6 h-6" />
                      <span className="text-xs font-medium">Upload a cover image · max 10 MB</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    {coverUploading ? (
                      <><Loader2 className="w-5 h-5 text-white animate-spin" /><span className="text-white text-sm">{coverProgress}%</span></>
                    ) : (
                      <><Camera className="w-5 h-5 text-white" /><span className="text-white text-sm font-medium">Change Cover</span></>
                    )}
                  </div>
                </div>
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.currentTarget.value = ""; }}
                />
              </label>
            </div>
          </div>

          {/* Logo + name preview */}
          <div className="flex items-end gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Club Logo
              </label>
              <label className="block cursor-pointer group">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-border bg-muted hover:border-primary/40 transition">
                  {(logoPreview ?? club?.logoImageUrl) ? (
                    <img
                      src={logoPreview ?? club?.logoImageUrl ?? ""}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl font-bold text-muted-foreground">
                        {(form.name || club?.name || "C").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/65 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                    {logoUploading ? (
                      <><Loader2 className="w-4 h-4 text-white animate-spin" /><span className="text-[9px] text-white">{logoProgress}%</span></>
                    ) : (
                      <><Camera className="w-4 h-4 text-white" /><span className="text-[9px] text-white font-medium">Change</span></>
                    )}
                  </div>
                </div>
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.currentTarget.value = ""; }}
                />
              </label>
            </div>
            <div className="pb-1">
              <p className="font-bold text-foreground">{form.name || club?.name || "Club Name"}</p>
              <p className="text-sm text-muted-foreground">{form.tagline || club?.tagline || "Your tagline"}</p>
              <p className="text-xs text-muted-foreground mt-1">Preview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic info form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Basic Information</h2>
          </div>
          <div className="p-6 space-y-4">
            {field("Club Name",   "name",        "e.g. Strike Hitters FC")}
            {field("Tagline",     "tagline",     "e.g. United in sport, relentless in spirit")}
            {field("Description", "description", "Tell players what your club is about…", true)}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Location</h2>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-4">
            {field("Location Label", "locationLabel", "e.g. North Mumbai")}
            {field("City",           "locationCity",  "e.g. Mumbai")}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Contact & Social</h2>
          </div>
          <div className="p-6 space-y-4">
            {field("Email", "contactEmail", "contact@yourclub.com", false, <Mail className="w-4 h-4" />)}
            {field("Website", "website", "https://yourclub.com", false, <Globe className="w-4 h-4" />)}
            {field("Instagram", "instagramHandle", "@yourclub", false, <Instagram className="w-4 h-4" />)}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-50 shadow-sm"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}
        </button>
      </form>
    </div>
  );
}
