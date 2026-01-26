import { useTranslation } from 'react-i18next';
import { Calendar, DollarSign, List, TrendingUp, Bell } from 'lucide-react';
import { WorkflowCard, WorkflowDefinition } from './WorkflowCard';
import { useTriggerWorkflow } from '@/hooks/useWorkflowMutations';
import { useWorkflowLastRuns } from '@/hooks/useWorkflows';
import type { WorkflowType } from '@/lib/api-types';

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: 'import_fixtures',
    name: 'Import Fixtures',
    nameKey: 'workflows.definitions.importFixtures',
    description: 'Import des matchs depuis API-Sports',
    descriptionKey: 'workflows.definitions.importFixturesDesc',
    icon: Calendar,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
  {
    id: 'recompute_pricing',
    name: 'Recalcul Pricing',
    nameKey: 'workflows.definitions.recomputePricing',
    description: 'Recalcule les prix de tous les événements',
    descriptionKey: 'workflows.definitions.recomputePricingDesc',
    icon: DollarSign,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
  {
    id: 'rebuild_editorial_lists',
    name: 'Rebuild Listes',
    nameKey: 'workflows.definitions.rebuildLists',
    description: 'Reconstruit les listes éditoriales',
    descriptionKey: 'workflows.definitions.rebuildListsDesc',
    icon: List,
    type: 'n8n',
    requiredRoles: ['editor', 'admin', 'owner'],
  },
  {
    id: 'refresh_notoriety',
    name: 'Refresh Notoriété',
    nameKey: 'workflows.definitions.refreshNotoriety',
    description: 'Met à jour les scores de notoriété',
    descriptionKey: 'workflows.definitions.refreshNotorietyDesc',
    icon: TrendingUp,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
  {
    id: 'send_notifications',
    name: 'Notifications',
    nameKey: 'workflows.definitions.sendNotifications',
    description: 'Envoie les notifications push',
    descriptionKey: 'workflows.definitions.sendNotificationsDesc',
    icon: Bell,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
];

export function WorkflowGrid() {
  const { t } = useTranslation();
  const { data: lastRuns } = useWorkflowLastRuns();
  const triggerMutation = useTriggerWorkflow();

  const handleTrigger = (workflowId: string) => {
    triggerMutation.mutate({
      workflow: workflowId as WorkflowType,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('workflows.availableWorkflows')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {WORKFLOW_DEFINITIONS.map((definition) => (
          <WorkflowCard
            key={definition.id}
            definition={definition}
            lastRun={lastRuns?.get(definition.id)}
            onTrigger={() => handleTrigger(definition.id)}
            isTriggering={
              triggerMutation.isPending &&
              triggerMutation.variables?.workflow === definition.id
            }
          />
        ))}
      </div>
    </div>
  );
}
