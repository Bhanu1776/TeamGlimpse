import { cn } from "@/lib/utils";
import type { DailyStatus } from "@/types/domain";

interface StatusChipProps {
  status: DailyStatus;
  size?: "sm" | "md";
}

const labels: Record<DailyStatus, string> = {
  going: "Going",
  wfh: "WFH",
  maybe: "Maybe",
  undecided: "Not decided",
};

const colors: Record<DailyStatus, string> = {
  going: "bg-emerald-100 text-emerald-800",
  wfh: "bg-sky-100 text-sky-800",
  maybe: "bg-amber-100 text-amber-800",
  undecided: "bg-muted text-muted-foreground",
};

export function StatusChip({ status, size = "md" }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        colors[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
