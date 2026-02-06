import { TableRow, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { AppUserStatusBadge } from './AppUserStatusBadge';
import type { AppUser } from '@/hooks/useAppUsers';

interface AppUserRowProps {
  user: AppUser;
  onSelect: (user: AppUser) => void;
}

export function AppUserRow({ user, onSelect }: AppUserRowProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;

  const getInitials = (name: string | null, email: string | undefined): string => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (email || '?').charAt(0).toUpperCase();
  };

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(user)}>
      <TableCell>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(user.fullName, user.email)}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="font-medium">{user.fullName || '—'}</TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <AppUserStatusBadge isBanned={user.isBanned} emailConfirmedAt={user.emailConfirmedAt} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(user.createdAt), 'd MMM yyyy', { locale })}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {user.lastSignInAt ? format(new Date(user.lastSignInAt), 'd MMM yyyy', { locale }) : '—'}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onSelect(user); }}>
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
