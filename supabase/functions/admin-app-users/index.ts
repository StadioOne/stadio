import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate admin (minimum role: admin)
    const authResult = await authenticateAdmin(req, ['admin']);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    // Create client for the external Stadio App
    const stadioUrl = Deno.env.get('STADIO_APP_SUPABASE_URL');
    const stadioKey = Deno.env.get('STADIO_APP_SERVICE_ROLE_KEY');

    if (!stadioUrl || !stadioKey) {
      return new Response(JSON.stringify({ error: 'Stadio App credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stadioClient = createClient(stadioUrl, stadioKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    switch (action) {
      case 'list': {
        const page = parseInt(url.searchParams.get('page') || '1');
        const perPage = parseInt(url.searchParams.get('perPage') || '50');
        const search = url.searchParams.get('search') || '';

        const { data, error } = await stadioClient.auth.admin.listUsers({
          page,
          perPage,
        });

        if (error) throw error;

        let users = data.users.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.user_metadata?.full_name || u.user_metadata?.name || null,
          avatarUrl: u.user_metadata?.avatar_url || null,
          phone: u.phone || null,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
          emailConfirmedAt: u.email_confirmed_at || null,
          isBanned: !!u.banned_until && new Date(u.banned_until) > new Date(),
          bannedUntil: u.banned_until || null,
          provider: u.app_metadata?.provider || 'email',
        }));

        // Client-side search filter
        if (search) {
          const s = search.toLowerCase();
          users = users.filter(u =>
            u.email?.toLowerCase().includes(s) ||
            u.fullName?.toLowerCase().includes(s)
          );
        }

        // Stats
        const allUsers = data.users;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const stats = {
          total: allUsers.length,
          active: allUsers.filter(u => !u.banned_until || new Date(u.banned_until) <= now).length,
          banned: allUsers.filter(u => u.banned_until && new Date(u.banned_until) > now).length,
          newLast30d: allUsers.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length,
        };

        return new Response(JSON.stringify({ users, stats, total: data.users.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get': {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await stadioClient.auth.admin.getUserById(userId);
        if (error) throw error;

        const u = data.user;
        const user = {
          id: u.id,
          email: u.email,
          fullName: u.user_metadata?.full_name || u.user_metadata?.name || null,
          avatarUrl: u.user_metadata?.avatar_url || null,
          phone: u.phone || null,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
          emailConfirmedAt: u.email_confirmed_at || null,
          isBanned: !!u.banned_until && new Date(u.banned_until) > new Date(),
          bannedUntil: u.banned_until || null,
          provider: u.app_metadata?.provider || 'email',
          metadata: u.user_metadata,
        };

        return new Response(JSON.stringify({ user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'ban': {
        const body = await req.json();
        const { userId, duration } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await stadioClient.auth.admin.updateUserById(userId, {
          ban_duration: duration || '876000h', // ~100 years = permanent
        });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'unban': {
        const body = await req.json();
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await stadioClient.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        const body = await req.json();
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await stadioClient.auth.admin.deleteUser(userId);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
