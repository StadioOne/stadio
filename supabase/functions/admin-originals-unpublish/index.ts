import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata, cleanDiff } from '../_shared/audit.ts';

interface UnpublishRequest {
  id: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate - requires editor or higher
    const authResult = await authenticateAdmin(req, ['editor']);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { userId, userEmail, role } = authResult;
    const { id }: UnpublishRequest = await req.json();

    if (!id) {
      return errorResponse('id is required', 400);
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current state for audit
    const { data: currentOriginal, error: fetchError } = await serviceClient
      .from('originals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentOriginal) {
      return errorResponse('Original content not found', 404);
    }

    // Check if already draft (idempotence)
    if (currentOriginal.status === 'draft') {
      console.log(`Original ${id} is already a draft`);
      return successResponse(currentOriginal);
    }

    const now = new Date().toISOString();

    // Update original status
    const { data: updatedOriginal, error: updateError } = await serviceClient
      .from('originals')
      .update({ 
        status: 'draft',
        updated_by: userId,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return errorResponse(`Failed to unpublish original: ${updateError.message}`, 500);
    }

    // Log audit with new signature
    const { ipAddress, userAgent } = getRequestMetadata(req);
    await logAudit({
      actorUserId: userId,
      actorEmail: userEmail,
      actorRole: role,
      action: 'original.unpublish',
      entity: 'originals',
      entityId: id,
      before: cleanDiff({ 
        status: currentOriginal.status,
        published_at: currentOriginal.published_at 
      }),
      after: cleanDiff({ 
        status: 'draft' 
      }),
      metadata: { 
        source: 'admin_api',
        originalType: currentOriginal.type,
        title: currentOriginal.title_fr
      },
      ipAddress,
      userAgent,
    });

    console.log(`Original ${id} unpublished successfully by ${userEmail}`);
    return successResponse(updatedOriginal);
  } catch (error) {
    console.error('Unpublish original error:', error);
    return errorResponse('Internal server error', 500);
  }
});
