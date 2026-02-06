import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminUsersTab } from '@/components/users/AdminUsersTab';
import { AppUsersTab } from '@/components/users/AppUsersTab';
import { AddUserDialog } from '@/components/users/AddUserDialog';

export default function UsersPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const isOwner = role === 'owner';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('users.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('users.subtitle')}</p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('users.newAdmin')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="admins">
        <TabsList>
          <TabsTrigger value="admins" className="gap-2">
            <Shield className="h-4 w-4" />
            {t('users.tabs.admins')}
          </TabsTrigger>
          <TabsTrigger value="app" className="gap-2">
            <Smartphone className="h-4 w-4" />
            {t('users.tabs.appUsers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="app">
          <AppUsersTab />
        </TabsContent>
      </Tabs>

      {/* Add Admin Dialog */}
      <AddUserDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />
    </div>
  );
}
