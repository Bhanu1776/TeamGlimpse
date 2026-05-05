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

const dotColor: Record<DailyStatus, string> = {
  going: "bg-[var(--status-going)]",
  wfh: "bg-[var(--status-wfh)]",
  maybe: "bg-[var(--status-maybe)]",
  undecided: "bg-[var(--status-undecided)]",
};

const chipStyle: Record<DailyStatus, string> = {
  going: "bg-[var(--status-going-surface)] text-[var(--status-going)]",
  wfh: "bg-[var(--status-wfh-surface)] text-[var(--status-wfh)]",
  maybe: "bg-[var(--status-maybe-surface)] text-[var(--status-maybe)]",
  undecided: "bg-[var(--status-undecided-surface)] text-[var(--status-undecided-fg)]",
};

export function StatusChip({ status, size = "md" }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        chipStyle[status]
      )}
    >
      <span className={cn("rounded-full shrink-0", size === "sm" ? "size-1.5" : "size-2", dotColor[status])} />
      {labels[status]}
    </span>
  );
}
