import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Circle, CheckCircle2, Archive, Radio } from "lucide-react";

type Status = "draft" | "published" | "archived" | "live";

interface StatusBadgeProps {
  status: Status;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  Status,
  { icon: React.ElementType; className: string; labelKey: string }
> = {
  draft: {
    icon: Circle,
    className: "bg-status-draft/10 text-status-draft border-status-draft/20",
    labelKey: "common.draft",
  },
  published: {
    icon: CheckCircle2,
    className: "bg-status-published/10 text-status-published border-status-published/20",
    labelKey: "common.published",
  },
  archived: {
    icon: Archive,
    className: "bg-status-archived/10 text-status-archived border-status-archived/20",
    labelKey: "common.archived",
  },
  live: {
    icon: Radio,
    className: "bg-status-live/10 text-status-live border-status-live/20 animate-pulse",
    labelKey: "common.live",
  },
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "status-badge border",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{t(config.labelKey)}</span>
    </span>
  );
}
