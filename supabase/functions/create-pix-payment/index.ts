import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { planId, studentId } = await req.json();

    // 1. Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Fetch Plan and Student Details
    const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
    const { data: student } = await supabase.from('profiles').select('*').eq('uid', studentId).single();

    if (!plan || !student) {
      throw new Error('Plano ou estudante não encontrado.');
    }

    // Mercado Pago requires a payer email. Fallback if not exists.
    const payerEmail = student.email || 'financeiro@vsfitgym.com';

    // 3. Call Mercado Pago API
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Configuração ausente: MERCADO_PAGO_ACCESS_TOKEN');
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: plan.price,
        description: `Plano ${plan.name} - VSFit Gym`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: student.name.split(' ')[0],
          last_name: student.name.split(' ').slice(1).join(' ') || 'Aluno',
        },
        notification_url: 'https://ueixrbdbtjpyuortrniz.supabase.co/functions/v1/mercadopago-webhook' 
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago Error:', mpData);
      throw new Error(`Erro no Mercado Pago: ${mpData.message || 'Desconhecido'}`);
    }

    // 4. Update Subscription with External ID
    await supabase.from('subscriptions').upsert({
      student_id: studentId,
      plan_id: planId,
      external_payment_id: mpData.id.toString(),
      payment_status: 'pending',
      status: 'pending'
    });

    return new Response(JSON.stringify({
      id: mpData.id,
      qr_code: mpData.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: mpData.point_of_interaction.transaction_data.qr_code_base64,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
