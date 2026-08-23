import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function authenticate(request: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  return { supabase, user };
}
