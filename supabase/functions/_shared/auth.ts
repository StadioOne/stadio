import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type AdminRole = 'owner' | 'admin' | 'editor' | 'support';

export interface AuthResult {
  userId: string;
  userEmail: string;
  role: AdminRole;
  supabase: SupabaseClient;
}

export interface AuthError {
  error: string;
  status: number;
}

export async function authenticateAdmin(
  req: Request,
  requiredRoles?: AdminRole[]
): Promise<AuthResult | AuthError> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');

  // Create client with the user's token for RPC calls
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Create admin client to verify the token
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Use admin client to get user from token (bypasses session check)
  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  
  if (userError || !userData?.user) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const userId = userData.user.id;
  const userEmail = userData.user.email || '';

  // Check if user is admin
  const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_admin', { 
    _user_id: userId 
  });

  if (isAdminError || !isAdminData) {
    return { error: 'Access denied: not an admin', status: 403 };
  }

  // Get user role
  const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', { 
    _user_id: userId 
  });

  if (roleError || !roleData) {
    return { error: 'Could not determine user role', status: 403 };
  }

  const role = roleData as AdminRole;

  // Check required roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const roleHierarchy: Record<AdminRole, number> = {
      owner: 4,
      admin: 3,
      editor: 2,
      support: 1,
    };

    const hasRequiredRole = requiredRoles.some(
      (r) => roleHierarchy[role] >= roleHierarchy[r]
    );

    if (!hasRequiredRole) {
      return { error: `Access denied: requires one of ${requiredRoles.join(', ')}`, status: 403 };
    }
  }

  return { userId, userEmail, role, supabase };
}

export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'error' in result;
}
