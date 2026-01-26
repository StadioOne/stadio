import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Lock, LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkflowRun } from '@/hooks/useWorkflows';
import type { AdminRole } from '@/lib/api-types';

export interface WorkflowDefinition {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  icon: LucideIcon;
  type: 'internal' | 'n8n';
  requiredRoles: AdminRole[];
}

interface WorkflowCardProps {
  definition: WorkflowDefinition;
  lastRun?: WorkflowRun | null;
  onTrigger: () => void;
  isTriggering: boolean;
}

export function WorkflowCard({
  definition,
  lastRun,
  onTrigger,
  isTriggering,
}: WorkflowCardProps) {
  const { t, i18n } = useTranslation();
  const { hasRole } = useAuth();

  const Icon = definition.icon;
  const canTrigger = hasRole(definition.requiredRoles);
  const locale = i18n.language === 'fr' ? fr : enUS;

  const lastRunText = lastRun
    ? formatDistanceToNow(new Date(lastRun.created_at), {
        addSuffix: true,
        locale,
      })
    : t('workflows.never');

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <Badge variant="outline" className="text-xs">
            {definition.type}
          </Badge>
        </div>
        <CardTitle className="text-base mt-2">
          {t(definition.nameKey, { defaultValue: definition.name })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground mb-4">
          {t(definition.descriptionKey, { defaultValue: definition.description })}
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('workflows.lastRun')}</span>
            <span className="font-medium">{lastRunText}</span>
          </div>
          {lastRun && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('workflows.status')}</span>
              <StatusBadge status={lastRun.status} size="sm" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onTrigger}
                  disabled={!canTrigger || isTriggering}
                >
                  {!canTrigger ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {t('workflows.trigger')}
                    </>
                  ) : isTriggering ? (
                    <>
                      <Play className="h-4 w-4 mr-2 animate-pulse" />
                      {t('workflows.triggering')}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {t('workflows.trigger')}
                    </>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {!canTrigger && (
              <TooltipContent>
                <p>
                  {t('workflows.roleRequired', {
                    roles: definition.requiredRoles.join(', '),
                  })}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
