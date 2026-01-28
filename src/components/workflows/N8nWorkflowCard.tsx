import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Calendar, TrendingUp, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import type { N8nWorkflow } from '@/hooks/useN8nWorkflows';
import { useTriggerWorkflow } from '@/hooks/useWorkflowMutations';
import type { WorkflowType } from '@/lib/api-types';

// Map n8n workflow IDs to our internal workflow types
const WORKFLOW_ID_MAP: Record<string, WorkflowType> = {
  'WVafba6frnoOSaEm': 'import_fixtures',
  'aBvSZmbvmdTdBYP1': 'recompute_pricing',
  'iGSPQgvlrLNGFfqy': 'refresh_notoriety',
};

// Icons based on workflow name patterns
function getWorkflowIcon(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('football') || lowerName.includes('compétition') || lowerName.includes('sync')) {
    return Calendar;
  }
  if (lowerName.includes('prix') || lowerName.includes('pricing')) {
    return DollarSign;
  }
  if (lowerName.includes('notoriété') || lowerName.includes('notoriety')) {
    return TrendingUp;
  }
  return Calendar;
}

interface N8nWorkflowCardProps {
  workflow: N8nWorkflow;
}

export function N8nWorkflowCard({ workflow }: N8nWorkflowCardProps) {
  const { t, i18n } = useTranslation();
  const triggerMutation = useTriggerWorkflow();
  
  const Icon = getWorkflowIcon(workflow.name);
  const locale = i18n.language === 'fr' ? fr : enUS;
  const internalWorkflowType = WORKFLOW_ID_MAP[workflow.id];
  
  const handleTrigger = () => {
    if (internalWorkflowType) {
      triggerMutation.mutate({ workflow: internalWorkflowType });
    }
  };

  const isTriggering = triggerMutation.isPending && 
    internalWorkflowType && 
    triggerMutation.variables?.workflow === internalWorkflowType;

  // Clean workflow name (remove emoji prefix if present)
  const displayName = workflow.name.replace(/^[^\w\s]+\s*/, '');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate" title={displayName}>
                {displayName}
              </h3>
            </div>
          </div>
          <Badge 
            variant={workflow.active ? 'default' : 'secondary'}
            className="shrink-0"
          >
            {workflow.active ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> {t('workflows.active')}</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> {t('workflows.inactive')}</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {workflow.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {workflow.description}
          </p>
        )}
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {t('workflows.lastUpdated')}: {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true, locale })}
          </span>
        </div>

        {internalWorkflowType && (
          <Button 
            size="sm" 
            className="w-full"
            onClick={handleTrigger}
            disabled={isTriggering || !workflow.active}
          >
            <Play className="h-3 w-3 mr-1" />
            {isTriggering ? t('workflows.triggering') : t('workflows.trigger')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
