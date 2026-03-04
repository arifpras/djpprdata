const DEFAULT_PERISAI_BOT_API_URL = "https://perisai-api.onrender.com";

function getApiBaseUrl() {
  const configured = process.env.PERISAI_BOT_API_URL;
  if (!configured) {
    return DEFAULT_PERISAI_BOT_API_URL;
  }

  return configured.replace(/\/$/, "");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const question = String(body?.question || "").trim();
    const csv = body?.csv ? String(body.csv).trim() : undefined;

    if (!question) {
      return Response.json({ error: "Question is required." }, { status: 400 });
    }

    const apiUrl = `${getApiBaseUrl()}/query`;
    const upstreamResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: question,
        ...(csv ? { csv } : {}),
      }),
    });

    const upstreamPayload = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      return Response.json(
        {
          error:
            upstreamPayload?.detail ||
            upstreamPayload?.error ||
            "PerisAI service returned an error.",
        },
        { status: upstreamResponse.status },
      );
    }

    return Response.json(
      {
        status: "ok",
        answer: upstreamPayload,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error: "Failed to query PerisAI service.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
