import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardKPIGrid } from "@/components/dashboard/DashboardKPIGrid";
import { UpcomingEventsCard } from "@/components/dashboard/UpcomingEventsCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("dashboard.greeting", { name: firstName })}
        </h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <DashboardKPIGrid />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingEventsCard />
        <RecentActivityCard />
      </div>

      <QuickActionsCard />
    </div>
  );
}
