import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface AppUserStatusBadgeProps {
  isBanned: boolean;
  emailConfirmedAt: string | null;
}

export function AppUserStatusBadge({ isBanned, emailConfirmedAt }: AppUserStatusBadgeProps) {
  const { t } = useTranslation();

  if (isBanned) {
    return (
      <Badge variant="destructive" className="text-xs">
        {t('users.app.status.banned')}
      </Badge>
    );
  }

  if (!emailConfirmedAt) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        {t('users.app.status.unconfirmed')}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      {t('users.app.status.active')}
    </Badge>
  );
}
