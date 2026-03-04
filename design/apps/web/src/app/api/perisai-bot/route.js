const DEFAULT_PERISAI_BOT_API_URL = "https://perisai-api.onrender.com";
const MAX_CONTEXT_TURNS = 6;

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
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!question) {
      return Response.json({ error: "Question is required." }, { status: 400 });
    }

    const normalizedHistory = history
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .map((item) => ({
        role: item.role,
        text: String(item.text || "").trim(),
      }))
      .filter((item) => item.text.length > 0)
      .slice(-MAX_CONTEXT_TURNS);

    const contextBlock = normalizedHistory.length
      ? [
          "Conversation context (latest first):",
          ...normalizedHistory
            .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.text}`)
            .reverse(),
          "",
          `Current question: ${question}`,
        ].join("\n")
      : question;

    const apiUrl = `${getApiBaseUrl()}/query`;
    const upstreamResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: contextBlock,
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
