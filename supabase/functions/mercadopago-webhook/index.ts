import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // 1. Initialize Supabase Client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const payload = await req.json();
    console.log("Webhook Received:", payload);

    // Mercado Pago sends a notification with an ID. We need to fetch the full payment data.
    if (payload.type === "payment" && payload.data?.id) {
      const paymentId = payload.data.id;
      const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

      // Fetch payment details from Mercado Pago
      const mpResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!mpResponse.ok)
        throw new Error("Failed to fetch payment details from MP");

      const paymentData = await mpResponse.json();
      const status = paymentData.status; // 'approved', 'pending', etc.

      if (status === "approved") {
        // Find the subscription linked to this payment
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*, plan:plans(*)")
          .eq("external_payment_id", paymentId.toString())
          .single();

        if (sub) {
          // Calculate end date based on plan duration (using the existing start_date)
          const startDate = new Date(sub.start_date || new Date());
          const endDate = new Date(startDate);

          if (sub.plan.duration_months > 0) {
            endDate.setMonth(endDate.getMonth() + sub.plan.duration_months);
          } else if (sub.plan.duration_days > 0) {
            endDate.setDate(endDate.getDate() + sub.plan.duration_days);
          }

          // Update subscription to ACTIVE
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              payment_status: "approved",
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
            })
            .eq("id", sub.id);

          console.log(`Plan activated for subscription ID: ${sub.id}`);
        }
      } else {
        // Just update the status if not approved yet
        await supabase
          .from("subscriptions")
          .update({
            payment_status: status,
          })
          .eq("external_payment_id", paymentId.toString());
      }
    }

    return new Response("ok", { headers: corsHeaders, status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
