import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRole(user: any) {
  const role = user?.app_metadata?.role || user?.user_metadata?.role || "user";
  return String(role || "user").trim().toLowerCase();
}

async function resolveCaller(accessToken: string) {
  if (!SUPABASE_ANON_KEY) {
    return { user: null, error: "Supabase anon key is unavailable in Edge Function env." };
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error: error?.message || "Unauthorized." };
  }

  return { user: data.user, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const body = await req.json().catch(() => ({}));
    const headerToken = authHeader.startsWith("Bearer ")
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
    const forwardedUserJwt = String(body?.userJwt || "").trim();
    const accessToken = forwardedUserJwt || headerToken;

    if (!accessToken) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const caller = await resolveCaller(accessToken);
    if (caller.error || !caller.user) {
      return json({ error: caller.error || "Unauthorized." }, 401);
    }

    if (!["admin", "super_admin"].includes(getRole(caller.user))) {
      return json({ error: "Admin role required." }, 403);
    }
    const action = String(body?.action || "").trim().toLowerCase();

    if (action === "list_users") {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 500 });
      if (error) return json({ error: error.message }, 400);

      return json({
        users: (data.users || []).map((user) => ({
          id: user.id,
          email: user.email,
          last_sign_in_at: user.last_sign_in_at,
          created_at: user.created_at,
          role: getRole(user),
        })),
      });
    }

    if (action === "create_user") {
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "").trim();
      const role = ["admin", "user"].includes(String(body?.role || "").trim().toLowerCase())
        ? String(body.role).trim().toLowerCase()
        : "user";

      if (!email) return json({ error: "Email is required." }, 400);

      if (password) {
        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role },
          app_metadata: { role },
        });
        if (error) return json({ error: error.message }, 400);

        return json({
          ok: true,
          mode: "create",
          user: { id: data.user?.id, email, role },
        });
      }

      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { role },
        redirectTo: body?.redirectTo || undefined,
      });
      if (error) return json({ error: error.message }, 400);

      return json({
        ok: true,
        mode: "invite",
        user: { id: data.user?.id, email, role },
      });
    }

    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error." }, 500);
  }
});
