import React from "react";
import { Bot, Send } from "lucide-react";

const MAX_HISTORY_MESSAGES = 8;
const STREAM_INTERVAL_MS = 8;

function formatBotResponse(payload) {
  if (!payload) {
    return "No response";
  }

  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }

  if (typeof payload.analysis === "string" && payload.analysis.trim()) {
    return payload.analysis.trim();
  }

  const intent = payload.intent || {};
  const result = payload.result || {};
  const lines = [];

  if (intent.type) {
    lines.push(`Intent: ${intent.type}`);
  }

  if (typeof result.note === "string" && result.note.trim()) {
    lines.push(result.note.trim());
  }

  if (Array.isArray(result.rows) && result.rows.length > 0) {
    lines.push(`Rows returned: ${result.rows.length}`);
    const preview = result.rows.slice(0, 3);
    preview.forEach((row, index) => {
      lines.push(`${index + 1}. ${JSON.stringify(row)}`);
    });
  } else if (Array.isArray(payload.rows) && payload.rows.length > 0) {
    lines.push(`Rows returned: ${payload.rows.length}`);
    const preview = payload.rows.slice(0, 3);
    preview.forEach((row, index) => {
      lines.push(`${index + 1}. ${JSON.stringify(row)}`);
    });
  } else if (Object.prototype.hasOwnProperty.call(result, "value")) {
    const value = Number.isFinite(Number(result.value)) ? Number(result.value).toLocaleString("en-US") : String(result.value);
    const sample = Number.isFinite(Number(result.n)) ? ` (n=${result.n})` : "";
    lines.push(`Value: ${value}${sample}`);
  } else if (Object.prototype.hasOwnProperty.call(payload, "value")) {
    const value = Number.isFinite(Number(payload.value)) ? Number(payload.value).toLocaleString("en-US") : String(payload.value);
    lines.push(`Value: ${value}`);
  } else if (Object.keys(result).length > 0) {
    lines.push(JSON.stringify(result, null, 2));
  } else if (Object.keys(payload).length > 0) {
    lines.push(JSON.stringify(payload, null, 2));
  }

  return lines.join("\n");
}

export function PerisAIBot({ theme = "light" }) {
  const [messages, setMessages] = React.useState([
    {
      role: "assistant",
      text: "PerisAI chatbot is ready. Ask about bond yields, auction demand, or quick checks.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const streamTimerRef = React.useRef(null);

  const palette =
    theme === "dark"
      ? {
          cardBg: "#0F1117",
          border: "#21262D",
          title: "#F0F6FC",
          text: "#C9D1D9",
          subText: "#8B949E",
          mutedBg: "#161B22",
          inputBg: "#1A1F29",
          buttonBg: "#2962FF",
          buttonText: "#FFFFFF",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E8E9EF",
          title: "#1A1A1A",
          text: "#30343F",
          subText: "#6B7280",
          mutedBg: "#F8F9FC",
          inputBg: "#FFFFFF",
          buttonBg: "#2962FF",
          buttonText: "#FFFFFF",
        };

  const addMessage = (role, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((previous) => [
      ...previous,
      {
        id,
        role,
        text,
        timestamp: new Date().toISOString(),
      },
    ]);
    return id;
  };

  const streamAssistantMessage = (messageId, fullText) => {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    let index = 0;
    streamTimerRef.current = window.setInterval(() => {
      index += 3;
      const done = index >= fullText.length;
      const nextText = fullText.slice(0, done ? fullText.length : index);

      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId
            ? {
                ...message,
                text: nextText,
              }
            : message,
        ),
      );

      if (done && streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }, STREAM_INTERVAL_MS);
  };

  const submit = async () => {
    const question = input.trim();
    if (!question || loading) {
      return;
    }

    addMessage("user", question);
    setInput("");
    setLoading(true);

    const recentHistory = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-MAX_HISTORY_MESSAGES)
      .map((message) => ({
        role: message.role,
        text: message.text,
      }));

    try {
      const response = await fetch("/api/perisai-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, history: recentHistory }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to query PerisAI bot");
      }

      const assistantText = formatBotResponse(payload.answer);
      const assistantId = addMessage("assistant", "");
      streamAssistantMessage(assistantId, assistantText);
    } catch (error) {
      addMessage("assistant", error instanceof Error ? error.message : "Failed to query PerisAI bot");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  const onSubmit = (event) => {
    event.preventDefault();
    submit();
  };

  return (
    <section
      className="rounded-xl border p-4 md:p-5"
      style={{ borderColor: palette.border, backgroundColor: palette.cardBg }}
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: palette.mutedBg, border: `1px solid ${palette.border}` }}
        >
          <Bot size={18} style={{ color: palette.title }} />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold" style={{ color: palette.title }}>
            PerisAI Chatbot
          </h2>
          <p className="mt-1 text-[12px]" style={{ color: palette.subText }}>
            Query the PerisAI API directly from this dashboard tab.
          </p>
        </div>
      </div>

      <div
        className="mb-3 rounded-lg border p-3 h-[420px] overflow-y-auto space-y-3"
        style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}
      >
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div key={message.id || `${message.timestamp}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[90%] rounded-lg px-3 py-2 text-[12px] whitespace-pre-wrap"
                style={{
                  backgroundColor: isUser ? palette.buttonBg : palette.cardBg,
                  color: isUser ? palette.buttonText : palette.text,
                  border: `1px solid ${isUser ? palette.buttonBg : palette.border}`,
                }}
              >
                {message.text}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="flex-1 h-10 rounded-lg border px-3 text-[12px]"
          style={{ borderColor: palette.border, backgroundColor: palette.inputBg, color: palette.text }}
          placeholder="Example: average yield Q1 2023"
          disabled={loading}
        />
        <button
          type="submit"
          className="h-10 px-3 rounded-lg inline-flex items-center gap-2 text-[12px] font-medium disabled:opacity-60"
          style={{ backgroundColor: palette.buttonBg, color: palette.buttonText }}
          disabled={loading || !input.trim()}
        >
          <Send size={14} />
          {loading ? "Sending" : "Send"}
        </button>
      </form>
    </section>
  );
}

export default PerisAIBot;
