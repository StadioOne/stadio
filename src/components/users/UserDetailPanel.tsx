import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Crown, Shield, Pencil, HeadphonesIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RoleBadge } from './RoleBadge';
import { useUserMutations } from '@/hooks/useUserMutations';
import { useOwnerCount } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import type { UserWithRole } from '@/hooks/useUsers';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Enums']['admin_role'];

interface UserDetailPanelProps {
  user: UserWithRole | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
}

const roles: { value: AdminRole; icon: React.ComponentType<{ className?: string }>; descriptionKey: string }[] = [
  { value: 'owner', icon: Crown, descriptionKey: 'owner' },
  { value: 'admin', icon: Shield, descriptionKey: 'admin' },
  { value: 'editor', icon: Pencil, descriptionKey: 'editor' },
  { value: 'support', icon: HeadphonesIcon, descriptionKey: 'support' },
];

export function UserDetailPanel({ user, isOpen, onClose, isOwner }: UserDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const { updateRole, removeRole } = useUserMutations();
  const { data: ownerCount } = useOwnerCount();
  
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  if (!user) return null;

  const getInitials = (name: string | null, email: string): string => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'd MMMM yyyy', { locale: i18n.language === 'fr' ? fr : undefined });
  };

  const isLastOwner = user.role === 'owner' && (ownerCount ?? 0) <= 1;
  const isCurrentUser = currentUser?.id === user.userId;
  const canRemove = isOwner && !isLastOwner && !(isCurrentUser && user.role === 'owner');
  const hasChanges = selectedRole !== user.role;

  const handleSave = async () => {
    if (!selectedRole || !hasChanges) return;
    
    await updateRole.mutateAsync({ roleId: user.roleId, newRole: selectedRole });
    onClose();
  };

  const handleRemove = async () => {
    await removeRole.mutateAsync(user.roleId);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('users.editRole')}</SheetTitle>
          <SheetDescription>
            {isOwner ? t('users.description') : t('users.readOnly')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* User info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName || user.email} />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.fullName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{user.fullName || user.email}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('users.memberSince')}: {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current role */}
          <div>
            <Label className="text-sm font-medium">{t('users.currentRole')}</Label>
            <div className="mt-2">
              <RoleBadge role={user.role} className="text-sm py-1 px-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {t(`users.roleDescriptions.${user.role}`)}
              </p>
            </div>
          </div>

          {/* Role selector - only for owners */}
          {isOwner && (
            <div>
              <Label className="text-sm font-medium">{t('users.newRole')}</Label>
              <RadioGroup
                value={selectedRole || undefined}
                onValueChange={(value) => setSelectedRole(value as AdminRole)}
                className="mt-3 space-y-2"
                disabled={isLastOwner && user.role === 'owner'}
              >
                {roles.map((role) => {
                  const Icon = role.icon;
                  const isDisabled = isLastOwner && user.role === 'owner' && role.value !== 'owner';
                  
                  return (
                    <div
                      key={role.value}
                      className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${
                        selectedRole === role.value ? 'border-primary bg-primary/5' : 'border-border'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'}`}
                      onClick={() => !isDisabled && setSelectedRole(role.value)}
                    >
                      <RadioGroupItem value={role.value} id={role.value} disabled={isDisabled} />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <Label htmlFor={role.value} className="text-sm font-medium cursor-pointer">
                          {t(`users.roles.${role.value}`)}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t(`users.roleDescriptions.${role.descriptionKey}`)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Warning for last owner */}
          {isLastOwner && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">{t('users.cannotRemoveLastOwner')}</p>
            </div>
          )}
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          {/* Remove access button */}
          {canRemove && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('users.removeAccess')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('users.removeAccess')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('common.confirmAction')} {user.fullName || user.email}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('users.removeAccess')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          <div className="flex gap-2 flex-1 justify-end">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {isOwner && (
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || updateRole.isPending}
              >
                {updateRole.isPending ? t('common.saving') : t('common.save')}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
