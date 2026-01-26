import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { useUserByEmail } from '@/hooks/useUsers';
import { useUserMutations } from '@/hooks/useUserMutations';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Enums']['admin_role'];

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const roles: AdminRole[] = ['admin', 'editor', 'support'];

export function AddUserDialog({ isOpen, onClose }: AddUserDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('admin');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  
  const { data: foundUser, isLoading: isSearching } = useUserByEmail(debouncedEmail);
  const { addRole } = useUserMutations();

  // Debounce email input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(email);
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!foundUser?.user_id) return;
    
    await addRole.mutateAsync({ userId: foundUser.user_id, role });
    
    // Reset and close
    setEmail('');
    setRole('admin');
    setDebouncedEmail('');
    onClose();
  };

  const handleClose = () => {
    setEmail('');
    setRole('admin');
    setDebouncedEmail('');
    onClose();
  };

  const canSubmit = foundUser?.user_id && !addRole.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.addAdmin')}</DialogTitle>
          <DialogDescription>
            {t('users.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('common.email')}</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="utilisateur@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={foundUser ? 'border-green-500 dark:border-green-600' : ''}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {/* User found indicator */}
            {foundUser && (
              <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <span>✓</span>
                <span>{foundUser.full_name || foundUser.email}</span>
              </div>
            )}
            
            {/* User not found warning */}
            {debouncedEmail && !isSearching && !foundUser && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('users.userNotFound')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('users.role')}</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AdminRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`users.roles.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(`users.roleDescriptions.${role}`)}
            </p>
          </div>

          <Alert className="py-2">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t('users.userMustExist')}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {addRole.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.add')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
