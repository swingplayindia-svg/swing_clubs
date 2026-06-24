"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import type { ClubMember } from "@/lib/schemas/club";
import { memberUserId } from "@/lib/team-players";
import { MemberAvatar } from "@/components/teams/member-avatar";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export { memberUserId } from "@/lib/team-players";

interface MemberComboboxProps {
  members: ClubMember[];
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  excludeIds?: string[];
  disabled?: boolean;
  required?: boolean;
}

function matchesMember(member: ClubMember, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = member.displayName.toLowerCase();
  const email = member.email?.toLowerCase() ?? "";
  return name.includes(q) || email.includes(q) || name.split(" ").some((w) => w.startsWith(q));
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function MemberCombobox({
  members,
  value,
  onChange,
  placeholder = "Search by name or email…",
  excludeIds = [],
  disabled = false,
  required = false,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 280);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = members.find((m) => memberUserId(m) === value);
  const isSearching = query !== debouncedQuery;

  const options = useMemo(() => {
    return members.filter((m) => {
      const id = memberUserId(m);
      if (excludeIds.includes(id)) return false;
      return matchesMember(m, debouncedQuery);
    });
  }, [members, debouncedQuery, excludeIds]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const pick = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-input border text-sm transition",
          open ? "border-primary/40 ring-2 ring-primary/20" : "border-border",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {selected && !query ? (
          <MemberAvatar name={selected.displayName} avatarUrl={selected.avatarUrl} size="sm" />
        ) : (
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={selected && !query ? selected.displayName : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        {isSearching && open && (
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
        )}

        {selected && !required && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {selected && !open && !query && selected.email && (
        <p className="text-[11px] text-muted-foreground mt-1 px-1 truncate">{selected.email}</p>
      )}

      {open && !disabled && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {isSearching ? "Searching…" : `${options.length} member${options.length === 1 ? "" : "s"}`}
            </span>
            {debouncedQuery && (
              <span className="text-[10px] text-muted-foreground">"{debouncedQuery}"</span>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            {options.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                No members match your search
              </p>
            ) : (
              options.map((m) => {
                const id = memberUserId(m);
                const isSelected = id === value;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pick(id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition",
                      isSelected ? "bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    <MemberAvatar name={m.displayName} avatarUrl={m.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        <HighlightText text={m.displayName} query={debouncedQuery} />
                      </p>
                      {m.email ? (
                        <p className="text-[11px] text-muted-foreground truncate">
                          <HighlightText text={m.email} query={debouncedQuery} />
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">No email on file</p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
