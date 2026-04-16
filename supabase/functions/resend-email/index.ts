import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_ADDRESS =
  Deno.env.get('RESEND_FROM_ADDRESS') ??
  'Control Prenatal <noreply@control-prenatal.app>';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { to: string | string[]; subject: string; html?: string; text?: string };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { to, subject, html, text } = body;

  if (!to || !subject || (!html && !text)) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: to, subject, and html or text' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const payload: Record<string, unknown> = {
    from: FROM_ADDRESS,
    to: Array.isArray(to) ? to : [to],
    subject,
  };

  if (html) payload.html = html;
  if (text) payload.text = text;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await resendResponse.json();

  if (!resendResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'Resend API error', details: data }),
      { status: resendResponse.status, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ success: true, id: data.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
