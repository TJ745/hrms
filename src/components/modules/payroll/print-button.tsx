"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="border-slate-200"
      onClick={() => window.print()}
    >
      <Printer className="w-4 h-4 mr-1.5" /> Print
    </Button>
  );
}
