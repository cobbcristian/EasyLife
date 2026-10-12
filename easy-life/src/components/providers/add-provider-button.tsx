"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddProviderSheet } from "@/components/providers/add-provider-sheet";

export function AddProviderButton({
  type,
  label,
}: {
  type: "service" | "activity";
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <AddProviderSheet type={type} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
