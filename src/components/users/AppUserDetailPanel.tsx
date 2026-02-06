import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Ban, ShieldCheck, Trash2, Mail, Phone, Calendar, LogIn, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppUserStatusBadge } from './AppUserStatusBadge';
import { useAppUserMutations, type AppUser } from '@/hooks/useAppUsers';

interface AppUserDetailPanelProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AppUserDetailPanel({ user, isOpen, onClose }: AppUserDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const { banUser, unbanUser, deleteUser } = useAppUserMutations();
  const locale = i18n.language === 'fr' ? fr : undefined;

  if (!user) return null;

  const getInitials = (name: string | null, email: string | undefined): string => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (email || '?').charAt(0).toUpperCase();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'd MMMM yyyy, HH:mm', { locale });
  };

  const handleBan = async () => {
    await banUser.mutateAsync(user.id);
    onClose();
  };

  const handleUnban = async () => {
    await unbanUser.mutateAsync(user.id);
    onClose();
  };

  const handleDelete = async () => {
    await deleteUser.mutateAsync(user.id);
    onClose();
  };

  const infoItems = [
    { icon: Mail, label: t('common.email'), value: user.email },
    { icon: Phone, label: t('users.app.phone'), value: user.phone || '—' },
    { icon: Globe, label: t('users.app.provider'), value: user.provider },
    { icon: Calendar, label: t('users.app.registered'), value: formatDate(user.createdAt) },
    { icon: LogIn, label: t('users.app.lastLogin'), value: formatDate(user.lastSignInAt) },
    { icon: Calendar, label: t('users.app.emailConfirmed'), value: formatDate(user.emailConfirmedAt) },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('users.app.userDetail')}</SheetTitle>
          <SheetDescription>{t('users.app.userDetailDesc')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* User identity */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.fullName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{user.fullName || user.email}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <div className="mt-2">
                    <AppUserStatusBadge isBanned={user.isBanned} emailConfirmedAt={user.emailConfirmedAt} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info details */}
          <div className="space-y-3">
            {infoItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-32 flex-shrink-0">{item.label}</span>
                  <span className="truncate">{item.value}</span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            {user.isBanned ? (
              <Button variant="outline" className="w-full" onClick={handleUnban} disabled={unbanUser.isPending}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t('users.app.unban')}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300">
                    <Ban className="h-4 w-4 mr-2" />
                    {t('users.app.ban')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('users.app.banConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('users.app.banConfirmDesc', { email: user.email })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBan} className="bg-orange-600 hover:bg-orange-700">
                      {t('users.app.ban')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('users.app.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('users.app.deleteConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('users.app.deleteConfirmDesc', { email: user.email })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('users.app.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
