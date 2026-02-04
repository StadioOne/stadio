import { Mail, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { BroadcasterStatusBadge } from './BroadcasterStatusBadge';
import { RightsTab } from './RightsTab';
import type { BroadcasterWithStats } from '@/hooks/useBroadcasters';

interface BroadcasterDetailPanelProps {
  broadcaster: BroadcasterWithStats | null;
  open: boolean;
  onClose: () => void;
}

export function BroadcasterDetailPanel({
  broadcaster,
  open,
  onClose,
}: BroadcasterDetailPanelProps) {
  if (!broadcaster) return null;

  const initials = broadcaster.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={broadcaster.logo_url || undefined} alt={broadcaster.name} />
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">{broadcaster.name}</SheetTitle>
                {broadcaster.legal_name && (
                  <p className="text-sm text-muted-foreground">{broadcaster.legal_name}</p>
                )}
                <BroadcasterStatusBadge status={broadcaster.status} className="mt-2" />
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="flex flex-wrap gap-4 text-sm">
            {broadcaster.contact_email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${broadcaster.contact_email}`} className="hover:underline">
                  {broadcaster.contact_email}
                </a>
              </div>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="rights" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rights">Droits</TabsTrigger>
            <TabsTrigger value="packages">Contrats</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="rights" className="mt-4">
            <RightsTab broadcasterId={broadcaster.id} broadcasterName={broadcaster.name} />
          </TabsContent>

          <TabsContent value="packages" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>La gestion des contrats sera disponible prochainement.</p>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>La gestion des utilisateurs sera disponible prochainement.</p>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>L'historique des modifications sera disponible prochainement.</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Notes */}
        {broadcaster.notes && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Notes internes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {broadcaster.notes}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
