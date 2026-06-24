"use client";

import { toYoutubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { Video } from "lucide-react";

interface YoutubeEmbedProps {
  url?: string;
  embedUrl?: string;
  title?: string;
  className?: string;
  aspect?: "video" | "wide";
}

export function YoutubeEmbed({ url, embedUrl, title = "Video", className, aspect = "video" }: YoutubeEmbedProps) {
  const src = embedUrl || (url ? toYoutubeEmbedUrl(url) : null);

  if (!src) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-center p-8",
          aspect === "video" ? "aspect-video" : "min-h-[200px]",
          className,
        )}
      >
        <Video className="w-10 h-10 text-muted-foreground mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">No stream or video linked yet</p>
        <p className="text-xs text-muted-foreground mt-1">Paste a YouTube URL to preview</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl overflow-hidden border border-border bg-black shadow-lg", className)}>
      <div className={cn("relative w-full", aspect === "video" ? "aspect-video" : "aspect-[21/9]")}>
        <iframe
          src={`${src}?rel=0&modestbranding=1`}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
