import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Calculator, PenLine } from "lucide-react";

interface OverrideBadgeProps {
  isOverride: boolean;
  className?: string;
}

export function OverrideBadge({ isOverride, className }: OverrideBadgeProps) {
  const { t } = useTranslation();

  if (isOverride) {
    return (
      <span
        className={cn(
          "status-badge border bg-warning/10 text-warning border-warning/20",
          className
        )}
      >
        <PenLine className="h-3 w-3" />
        <span>{t("common.manual")}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "status-badge border bg-info/10 text-info border-info/20",
        className
      )}
    >
      <Calculator className="h-3 w-3" />
      <span>{t("common.computed")}</span>
    </span>
  );
}
