"use client";

import { use } from "react";
import { useClub } from "@/hooks/use-club-data";
import { Topbar } from "@/components/layout/topbar";

export default function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = use(params);
  const { club } = useClub(clubId);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar club={club} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
