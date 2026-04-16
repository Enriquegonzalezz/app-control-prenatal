import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface RequestPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

// ---------------------------------------------------------------------------
// Helpers JWT RS256 usando SubtleCrypto nativo de Deno (sin dependencias)
// ---------------------------------------------------------------------------

function base64url(bytes: ArrayBuffer | string): string {
  const str =
    typeof bytes === "string"
      ? bytes
      : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function buildJwt(credentials: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;

  // Limpiar el PEM y decodificar a bytes
  const pemBody = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signature = base64url(signatureBuffer);

  return `${signingInput}.${signature}`;
}

async function getAccessToken(credentials: ServiceAccount): Promise<string> {
  const jwt = await buildJwt(credentials);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google OAuth2 error: ${err}`);
  }

  const { access_token } = await response.json();
  return access_token;
}

// ---------------------------------------------------------------------------
// Envío FCM v1 HTTP API
// ---------------------------------------------------------------------------

async function sendToToken(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const url =
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        android: {
          notification: { channel_id: "appointments" },
          priority: "high",
        },
        apns: {
          payload: { aps: { sound: "default" } },
        },
        // data: solo string values
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const status = (errorData as { error?: { status?: string } }).error?.status;

    // Token inválido: loguear pero no lanzar (se limpiará en próxima ejecución)
    if (status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
      console.warn(`FCM: token inválido/expirado (${token.substring(0, 20)}…)`);
      return;
    }

    console.error("FCM send error:", JSON.stringify(errorData));
  }
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

const CREDENTIALS_JSON = Deno.env.get("FIREBASE_CREDENTIALS_JSON");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!CREDENTIALS_JSON) {
    console.error("FIREBASE_CREDENTIALS_JSON secret not configured");
    return new Response(
      JSON.stringify({ error: "FIREBASE_CREDENTIALS_JSON not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { tokens, title, body, data = {} } = payload;

  if (!tokens?.length || !title || !body) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: tokens (array), title, body",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const credentials: ServiceAccount = JSON.parse(CREDENTIALS_JSON);
    const accessToken = await getAccessToken(credentials);

    // Enviar a todos los tokens en paralelo; errores individuales no cancelan los demás
    await Promise.allSettled(
      tokens.map((token) =>
        sendToToken(accessToken, credentials.project_id, token, title, body, data)
      ),
    );

    return new Response(
      JSON.stringify({ success: true, sent: tokens.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("FCM Edge Function error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send push notifications",
        details: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
