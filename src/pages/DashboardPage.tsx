import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Radio, Calendar } from "lucide-react";

export default function DashboardPage() {
  const { t } = useTranslation();

  const kpis = [
    { label: t("dashboard.kpis.ppvSales"), value: "—", icon: TrendingUp, trend: null },
    { label: t("dashboard.kpis.revenue"), value: "—", icon: DollarSign, trend: null },
    { label: t("dashboard.kpis.liveEvents"), value: "0", icon: Radio, trend: null },
    { label: t("dashboard.kpis.upcomingEvents"), value: "0", icon: Calendar, trend: null },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.welcome")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.kpis.topEvents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.kpis.topOriginals")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
