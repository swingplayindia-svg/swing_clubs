"use client";

import { useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export async function uploadNewsImage(
  clubId: string,
  file: File,
  postId?: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const folder = postId ?? `draft_${Date.now()}`;
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const storagePath = `clubs/${clubId}/news/${folder}/cover.${safeExt}`;

  return new Promise((resolve, reject) => {
    const sRef = ref(getFirebaseStorage(), storagePath);
    const task = uploadBytesResumable(sRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

interface NewsImageUploadProps {
  clubId: string;
  postId?: string;
  value?: string;
  onChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export function NewsImageUpload({
  clubId,
  postId,
  value,
  onChange,
  onUploadingChange,
}: NewsImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const displayUrl = preview ?? value;
  const uploading = progress !== null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setProgress(0);
    onUploadingChange?.(true);

    try {
      const url = await uploadNewsImage(clubId, file, postId, setProgress);
      onChange(url);
      setPreview(null);
      toast.success("Image uploaded.");
    } catch (err) {
      setPreview(null);
      onChange(value ?? null);
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt="Post cover" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
                <span className="text-xs font-bold">{progress}%</span>
              </div>
            </div>
          )}
          {!uploading && (
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                title="Replace image"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-loss/80 transition"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-medium">Uploading {progress}%</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 opacity-50" />
              <span className="text-sm font-medium text-foreground">Upload cover image</span>
              <span className="text-xs">JPG, PNG or WebP · max 8 MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
