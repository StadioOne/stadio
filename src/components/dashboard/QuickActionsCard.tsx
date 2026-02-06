import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, BarChart3, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const actions = [
    { label: t('dashboard.actions.manageEvents'), icon: Calendar, path: '/events', show: true },
    { label: t('dashboard.actions.recalculatePrices'), icon: DollarSign, path: '/pricing', show: hasRole('admin') },
    { label: t('dashboard.actions.viewAnalytics'), icon: BarChart3, path: '/analytics', show: true },
    { label: t('dashboard.actions.manageCatalog'), icon: LayoutGrid, path: '/catalog', show: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.sections.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.filter(a => a.show).map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => navigate(action.path)}
              className="gap-2"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
