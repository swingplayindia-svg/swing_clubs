"use client";

import { useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface LogoUploadProps {
  currentUrl?: string | null;
  storagePath: string;
  fallbackText: string;
  size?: "sm" | "md" | "lg";
  onUploaded: (url: string) => void;
}

export function LogoUpload({ currentUrl, storagePath, fallbackText, size = "md", onUploaded }: LogoUploadProps) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);

  const sizeClasses = {
    sm: "w-10 h-10 rounded-xl text-sm",
    md: "w-16 h-16 rounded-2xl text-xl",
    lg: "w-24 h-24 rounded-3xl text-2xl",
  }[size];

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const storageRef = ref(getFirebaseStorage(), storagePath);
    const task       = uploadBytesResumable(storageRef, file, { contentType: file.type });

    task.on(
      "state_changed",
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err)  => { toast.error("Upload failed: " + err.message); setProgress(null); setPreview(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onUploaded(url);
        setProgress(null);
        toast.success("Logo uploaded!");
      },
    );
  };

  const displaySrc = preview ?? currentUrl;

  return (
    <div className="relative group">
      <div
        className={`${sizeClasses} relative overflow-hidden border-2 border-dashed border-border bg-card cursor-pointer transition hover:border-primary/60 hover:bg-primary/5`}
        onClick={() => progress == null && inputRef.current?.click()}
      >
        {displaySrc ? (
          <img src={displaySrc} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-bold text-primary">{fallbackText.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          {progress != null ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Progress ring */}
        {progress != null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <span className="text-white text-xs font-bold">{progress}%</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
