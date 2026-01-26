import { useTranslation } from 'react-i18next';
import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RoleBadge } from './RoleBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { UserWithRole } from '@/hooks/useUsers';

interface UserRowProps {
  user: UserWithRole;
  onSelect: (user: UserWithRole) => void;
}

export function UserRow({ user, onSelect }: UserRowProps) {
  const { t, i18n } = useTranslation();

  const getInitials = (name: string | null, email: string): string => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'd MMM yyyy', { locale: i18n.language === 'fr' ? fr : undefined });
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSelect(user)}
    >
      <TableCell>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName || user.email} />
          <AvatarFallback className="text-xs">
            {getInitials(user.fullName, user.email)}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="font-medium">
        {user.fullName || '-'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {user.email}
      </TableCell>
      <TableCell>
        <RoleBadge role={user.role} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(user.createdAt)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelect(user)}>
              <Eye className="h-4 w-4 mr-2" />
              {t('users.editRole')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
