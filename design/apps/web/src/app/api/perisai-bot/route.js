const DEFAULT_PERISAI_BOT_API_URL = "https://perisai-api.onrender.com";
const MAX_CONTEXT_TURNS = 6;

function normalizeQuestion(input) {
  let normalized = String(input || "").trim();
  if (!normalized) {
    return normalized;
  }

  normalized = normalized
    .replace(/\b10\s*y\b/gi, "10 year")
    .replace(/\b5\s*y\b/gi, "5 year")
    .replace(/\b10y\b/gi, "10 year")
    .replace(/\b5y\b/gi, "5 year")
    .replace(/\baverage\b/gi, "avg")
    .replace(/\bindonesia\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

async function callPerisAiChat(apiUrl, q, csv) {
  return fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q,
      ...(csv ? { csv } : {}),
      plot: false,
    }),
  });
}

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

    const apiBaseUrl = getApiBaseUrl();
    const normalizedQuestion = normalizeQuestion(question);
    const normalizedContextBlock = normalizedHistory.length
      ? [
          "Conversation context (latest first):",
          ...normalizedHistory
            .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.text}`)
            .reverse(),
          "",
          `Current question: ${normalizedQuestion}`,
        ].join("\n")
      : normalizedQuestion;

    let upstreamResponse = await callPerisAiChat(apiBaseUrl, normalizedContextBlock, csv);
    let upstreamPayload = await upstreamResponse.json().catch(() => null);

    const shouldRetry =
      !upstreamResponse.ok &&
      (String(upstreamPayload?.detail || "").toLowerCase().includes("unhandled intent") ||
        String(upstreamPayload?.error || "").toLowerCase().includes("unhandled intent"));

    if (shouldRetry) {
      const fallbackQuery = `avg yield 10 year in q3 2025`.includes(normalizedQuestion.toLowerCase())
        ? normalizedQuestion
        : `avg ${normalizedQuestion}`;
      upstreamResponse = await callPerisAiChat(apiBaseUrl, fallbackQuery, csv);
      upstreamPayload = await upstreamResponse.json().catch(() => null);
    }

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
