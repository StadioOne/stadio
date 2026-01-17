import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * Audit Log Entry - Production-grade audit system
 * 
 * All critical actions are logged with complete context:
 * - Who: actorUserId, actorEmail, actorRole
 * - What: action, entity, entityId
 * - Changes: before/after state
 * - Context: metadata, IP, user agent
 */
export interface AuditLogEntry {
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Technical fields to exclude from diffs (not business-relevant)
const EXCLUDED_DIFF_FIELDS = ['updated_at', 'updated_by', 'created_at', 'created_by'];

/**
 * Clean object by removing technical fields from diffs
 * Makes audit diffs human-readable and focused on business changes
 */
export function cleanDiff(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !EXCLUDED_DIFF_FIELDS.includes(key))
  );
}

/**
 * Log an audit entry to the audit_log table
 * 
 * IMPORTANT: This function NEVER blocks the main operation.
 * If audit logging fails, it logs to console and continues silently.
 * 
 * Uses service role client to bypass RLS (INSERT blocked for authenticated users)
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await serviceClient.from('audit_log').insert({
      actor_user_id: entry.actorUserId,
      actor_email: entry.actorEmail,
      actor_role: entry.actorRole,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId || null,
      old_values: entry.before || null,
      new_values: entry.after || null,
      metadata: entry.metadata || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });

    if (error) {
      console.error('Audit log insert failed:', error);
    } else {
      console.log(`Audit: ${entry.action} on ${entry.entity}/${entry.entityId || 'N/A'} by ${entry.actorEmail} (${entry.actorRole})`);
    }
  } catch (error) {
    // Non-blocking: audit logging should never break the main operation
    console.error('Audit log failed (non-blocking):', error);
  }
}

/**
 * Extract request metadata for audit logging
 */
export function getRequestMetadata(req: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}
