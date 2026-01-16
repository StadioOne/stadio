import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Crown, Medal, Award } from "lucide-react";

type Tier = "gold" | "silver" | "bronze";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
  showIcon?: boolean;
}

const tierConfig: Record<
  Tier,
  { icon: React.ElementType; className: string; labelKey: string }
> = {
  gold: {
    icon: Crown,
    className: "bg-tier-gold/10 text-tier-gold border-tier-gold/20",
    labelKey: "pricing.gold",
  },
  silver: {
    icon: Medal,
    className: "bg-tier-silver/10 text-tier-silver border-tier-silver/20",
    labelKey: "pricing.silver",
  },
  bronze: {
    icon: Award,
    className: "bg-tier-bronze/10 text-tier-bronze border-tier-bronze/20",
    labelKey: "pricing.bronze",
  },
};

export function TierBadge({ tier, className, showIcon = true }: TierBadgeProps) {
  const { t } = useTranslation();
  const config = tierConfig[tier];
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
