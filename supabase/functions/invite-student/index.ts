import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const sbAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const sbService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!sbService) {
      throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY in edge function secrets",
      );
    }

    const { studentEmail, studentName } = await req.json();
    if (!studentEmail || !studentName) {
      throw new Error("Email e nome do aluno são obrigatórios");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseAdmin = createClient(sbUrl, sbService);
    const supabaseUser = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user)
      throw new Error("Auth failed: " + (userError?.message || "No user"));

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("uid", user.id)
      .single();

    if (profileErr)
      throw new Error("Error fetching origin profile: " + profileErr.message);
    if (callerProfile?.role !== "personal")
      throw new Error("Only personal trainers can invite students");

    let studentAuthId = "";

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(studentEmail, {
        data: { full_name: studentName },
      });

    if (inviteError) {
      console.log("Invite error detected:", inviteError.message);

      // Check if user exists in profiles table (existing gym members)
      const { data: existingProfiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("uid, personal_id")
        .eq("email", studentEmail);

      if (existingProfiles && existingProfiles.length > 0) {
        // User exists in profiles - just update personal_id
        studentAuthId = existingProfiles[0].uid;
        const { error: updErr } = await supabaseAdmin
          .from("profiles")
          .update({ personal_id: user.id })
          .eq("uid", studentAuthId);
        if (updErr)
          throw new Error("Failed to assign existing user: " + updErr.message);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Aluno já existia e foi vinculado ao seu plano!",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // If not in profiles but auth invite failed, check if user exists in auth.users
      // This handles the case where user is already registered but has no profile yet
      console.log("User not in profiles table. Checking auth.users...");

      const { data: authUser } = await supabaseAdmin
        .from("auth.users")
        .select("id")
        .eq("email", studentEmail)
        .maybeSingle();

      if (authUser?.id) {
        // User exists in auth but not in profiles - create profile and link
        console.log("Found user in auth.users with ID:", authUser.id);
        studentAuthId = authUser.id;

        const { error: profileCreateErr } = await supabaseAdmin
          .from("profiles")
          .insert({
            uid: studentAuthId,
            name: studentName,
            email: studentEmail,
            role: "student",
            personal_id: user.id,
          });

        if (profileCreateErr) {
          // If insert fails due to duplicate, try to update instead
          if (
            profileCreateErr.message?.includes("duplicate") ||
            profileCreateErr.code === "23505"
          ) {
            const { error: updErr } = await supabaseAdmin
              .from("profiles")
              .update({ personal_id: user.id })
              .eq("uid", studentAuthId);
            if (updErr)
              throw new Error(
                "Failed to assign existing user: " + updErr.message,
              );
          } else {
            throw new Error(
              "Failed to create profile: " + profileCreateErr.message,
            );
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Aluno já existia e foi vinculado ao seu plano!",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // If we get here, user doesn't exist anywhere - original error
      throw new Error("Error inviting user via Auth: " + inviteError.message);
    }

    if (!inviteData?.user?.id) {
      throw new Error("Sucesso no invite, mas ID de usuario nulo.");
    }

    studentAuthId = inviteData.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        uid: studentAuthId,
        name: studentName,
        email: studentEmail,
        role: "student",
        personal_id: user.id,
      },
      { onConflict: "uid" },
    );

    if (profileError)
      throw new Error("Error creating profile: " + profileError.message);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Convite enviado com sucesso!",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("invite-student exception:", error.message);
    // Return a 200 with error property so it bypasses standard Supabase client swallowing, allowing UI to see exact error directly inside `data`.
    return new Response(
      JSON.stringify({
        error: error.message || "Erro interno catch edge-function",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
