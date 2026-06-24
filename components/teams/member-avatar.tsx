import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function MemberAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "w-7 h-7 text-[10px]" :
    size === "lg" ? "w-11 h-11 text-sm" :
    "w-8 h-8 text-xs";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(dim, "rounded-full object-cover shrink-0", className)}
      />
    );
  }

  return (
    <div className={cn(dim, "rounded-full bg-primary/15 flex items-center justify-center shrink-0", className)}>
      <span className="font-bold text-primary">{initials(name)}</span>
    </div>
  );
}
