import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export interface AuditLogEntry {
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(
  _supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    // Use service role client for audit logging
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await serviceClient.from('audit_log').insert({
      user_id: entry.userId,
      user_email: entry.userEmail,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      old_values: entry.oldValues || null,
      new_values: entry.newValues || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

export function getRequestMetadata(req: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}
