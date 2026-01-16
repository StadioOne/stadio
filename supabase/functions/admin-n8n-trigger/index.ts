import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';

type WorkflowType = 
  | 'import_fixtures'
  | 'recompute_pricing'
  | 'rebuild_editorial_lists'
  | 'refresh_notoriety'
  | 'send_notifications';

interface TriggerRequest {
  workflow: WorkflowType;
  params?: Record<string, unknown>;
}

const WORKFLOW_ROLE_REQUIREMENTS: Record<WorkflowType, string[]> = {
  import_fixtures: ['admin', 'owner'],
  recompute_pricing: ['admin', 'owner'],
  rebuild_editorial_lists: ['editor', 'admin', 'owner'],
  refresh_notoriety: ['admin', 'owner'],
  send_notifications: ['admin', 'owner'],
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { workflow, params }: TriggerRequest = await req.json();

    if (!workflow) {
      return errorResponse('workflow is required', 400);
    }

    const validWorkflows = Object.keys(WORKFLOW_ROLE_REQUIREMENTS);
    if (!validWorkflows.includes(workflow)) {
      return errorResponse(`Invalid workflow. Must be one of: ${validWorkflows.join(', ')}`, 400);
    }

    // Authenticate with role check based on workflow
    const requiredRoles = WORKFLOW_ROLE_REQUIREMENTS[workflow] as Array<'owner' | 'admin' | 'editor' | 'support'>;
    const authResult = await authenticateAdmin(req, requiredRoles);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { userId, userEmail, supabase } = authResult;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Create workflow run record
    const { data: workflowRun, error: createError } = await serviceClient
      .from('workflow_runs')
      .insert({
        workflow_name: workflow,
        workflow_type: 'n8n',
        triggered_by: userId,
        status: 'pending',
        input_data: params || {},
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      return errorResponse('Failed to create workflow run record', 500);
    }

    // Get n8n configuration
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    const n8nWebhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET');

    if (!n8nWebhookUrl || !n8nWebhookSecret) {
      // Update workflow run as failed
      await serviceClient
        .from('workflow_runs')
        .update({ 
          status: 'failed',
          error_message: 'n8n configuration missing',
          finished_at: new Date().toISOString(),
        })
        .eq('id', workflowRun.id);

      return errorResponse('n8n integration not configured', 503);
    }

    // Prepare payload for n8n
    const payload = {
      workflow,
      params: params || {},
      triggeredBy: {
        userId,
        userEmail,
      },
      workflowRunId: workflowRun.id,
      timestamp: new Date().toISOString(),
    };

    // Create signature for security
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload) + n8nWebhookSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    try {
      // Call n8n webhook
      const n8nResponse = await fetch(`${n8nWebhookUrl}/${workflow}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Workflow-Run-Id': workflowRun.id,
        },
        body: JSON.stringify(payload),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        
        // Update workflow run as failed
        await serviceClient
          .from('workflow_runs')
          .update({ 
            status: 'failed',
            error_message: `n8n returned ${n8nResponse.status}: ${errorText}`,
            finished_at: new Date().toISOString(),
          })
          .eq('id', workflowRun.id);

        return errorResponse(`n8n webhook failed: ${n8nResponse.status}`, 502);
      }

      // Update workflow run as running
      await serviceClient
        .from('workflow_runs')
        .update({ status: 'running' })
        .eq('id', workflowRun.id);

      // Log audit
      const { ipAddress, userAgent } = getRequestMetadata(req);
      await logAudit(supabase, {
        userId,
        userEmail,
        action: 'workflow.trigger',
        entityType: 'workflow_runs',
        entityId: workflowRun.id,
        newValues: { workflow, params },
        ipAddress,
        userAgent,
      });

      return successResponse({
        workflowRunId: workflowRun.id,
        workflow,
        status: 'running',
        message: `Workflow ${workflow} triggered successfully`,
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      // Update workflow run as failed
      await serviceClient
        .from('workflow_runs')
        .update({ 
          status: 'failed',
          error_message: `Network error: ${errorMessage}`,
          finished_at: new Date().toISOString(),
        })
        .eq('id', workflowRun.id);

      return errorResponse(`Failed to reach n8n: ${errorMessage}`, 502);
    }
  } catch (error) {
    console.error('n8n trigger error:', error);
    return errorResponse('Internal server error', 500);
  }
});
