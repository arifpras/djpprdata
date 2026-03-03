import React from "react";
import { Clock3, Copy, Newspaper, RefreshCw } from "lucide-react";

const MARKET_UPDATE_PLACEHOLDER =
  "Market Intelligence Briefing is not generated yet. Run `npm run generate:market-update` or use Refresh now to create the latest output.";

const RESEARCH_PROMPT = `Act as a CFA charterholder and global macro strategist operating in deep research mode.

Prepare a policy-grade global markets briefing covering only the most important financial and economic developments from the last 24 hours.

Audience:
A senior policymaker.
Write in plain English. Avoid jargon. Be analytical but clear and direct.

Scope and Selection Rules:

* Identify exactly the 4 most important market-moving developments globally in the last 24 hours.
* Order them by importance (most impactful first), but do NOT label them as rank 1, 2, etc.
* Of the 4 summaries:

  * At least 1 must focus specifically on Indonesia’s economic and financial developments.
  * The remaining items should cover major global developments (US, China, Europe, Japan, major EMs, commodities, geopolitics affecting markets).

For each of the 4 developments, use the following structure in bullet points:

Headline
A short, clear institutional-style title.

Event Synopsis

* Factual summary (data release, policy decision, market move, geopolitical development).
* Include key numbers where relevant (yields, index moves, FX levels, inflation data, etc.).
* Use 2 bullets maximum.

Cross-Asset Market Reaction

* Bullet points summarizing moves in:

  * Government bond yields (especially US 10Y and Indonesia 10Y)
  * Major equity indices
  * Key FX pairs (DXY, USD/IDR, EUR/USD, USD/JPY, USD/CNH)
  * Commodities (Brent, WTI, Gold)

Always report US 10Y, Indonesia 10Y, DXY, and USD/IDR even if unchanged; state “little changed” and include latest levels.
* Use 3 bullets maximum.

Policy Relevance

* Explain clearly how this affects:

  * Inflation outlook
  * Growth expectations
  * Capital flows
  * Exchange rate stability
  * Financial market stability
  * Fiscal or monetary policy space
  * Use 2 bullets maximum.

Forward Watch Points

* 1–2 bullets on what policymakers should monitor next.

Keep the tone professional, neutral, and policy-relevant.
Do not speculate beyond reasonable scenarios.
Keep the entire output concise but substantive.

This briefing is intended for internal strategic assessment, not public communication.

Output format requirements:
* Return valid HTML only (no Markdown, no code fences).
* Use this structure:
  - <h2> for each development headline, with exactly 4 <h2> sections in total.
  - <h3> for section labels: Event Synopsis, Cross-Asset Market Reaction, Policy Relevance, Forward Watch Points.
  - <ul><li> for bullet points.
* Keep formatting elegant, concise, and readable for an executive dashboard.`;

function sanitizeBriefingHtml(inputHtml) {
  if (typeof window === "undefined") {
    return inputHtml;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(inputHtml, "text/html");

  const blockedTags = ["script", "style", "iframe", "object", "embed", "link", "meta"];
  blockedTags.forEach((tag) => {
    documentNode.querySelectorAll(tag).forEach((node) => node.remove());
  });

  documentNode.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
        continue;
      }

      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    }
  });

  documentNode.querySelectorAll("a").forEach((anchor) => {
    const replacement = documentNode.createTextNode(anchor.textContent || "");
    anchor.replaceWith(replacement);
  });

  const sectionHeadings = Array.from(documentNode.querySelectorAll("h2"));
  sectionHeadings.forEach((heading) => {
    const parent = heading.parentNode;
    if (!parent) {
      return;
    }

    const section = documentNode.createElement("section");
    section.setAttribute("data-briefing-card", "true");
    parent.insertBefore(section, heading);
    section.appendChild(heading);

    let nextSibling = section.nextSibling;
    while (nextSibling && !(nextSibling.nodeType === 1 && nextSibling.nodeName.toLowerCase() === "h2")) {
      const current = nextSibling;
      nextSibling = nextSibling.nextSibling;
      section.appendChild(current);
    }

    heading.setAttribute("data-briefing-title", "true");

    const kicker = documentNode.createElement("div");
    kicker.setAttribute("data-briefing-kicker", "true");
    kicker.textContent = "Market Development";
    section.insertBefore(kicker, heading);
  });

  return documentNode.body.innerHTML;
}

function getStructureValidation(htmlContent) {
  if (!htmlContent) {
    return {
      passed: false,
      reason: "No briefing content",
    };
  }

  const sections = [];
  const parts = htmlContent.split(/(<h2\b[^>]*>[\s\S]*?<\/h2>)/gi);
  for (let index = 1; index < parts.length; index += 2) {
    const headlineRaw = parts[index] || "";
    const body = parts[index + 1] || "";
    const headline = headlineRaw.replace(/<[^>]+>/g, "").trim();
    sections.push({ headline, body });
  }

  const requiredLabels = [
    "Event Synopsis",
    "Cross-Asset Market Reaction",
    "Policy Relevance",
    "Forward Watch Points",
  ];

  const hasIndonesia = sections.some((item) => item.headline.toLowerCase().includes("indonesia"));
  if (sections.length !== 4) {
    return {
      passed: false,
      reason: `Expected 4 developments, found ${sections.length}`,
    };
  }

  if (!hasIndonesia) {
    return {
      passed: false,
      reason: "No Indonesia-focused development found",
    };
  }

  for (const section of sections) {
    for (const label of requiredLabels) {
      const hasLabel = new RegExp(`<h3\\b[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<\\/h3>`, "i").test(
        section.body,
      );

      if (!hasLabel) {
        return {
          passed: false,
          reason: `Missing \"${label}\" in one development`,
        };
      }
    }
  }

  return {
    passed: true,
    reason: "Pass",
  };
}

function buildStructuredClipboardTextFromHtml(htmlContent) {
  if (typeof window === "undefined") {
    return htmlContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(htmlContent, "text/html");
  const sections = Array.from(documentNode.querySelectorAll("section[data-briefing-card]"));

  if (sections.length === 0) {
    const fallbackLines = [];
    const headings = Array.from(documentNode.querySelectorAll("h2, h3"));
    const lists = Array.from(documentNode.querySelectorAll("ul"));

    headings.forEach((heading) => fallbackLines.push(heading.textContent?.trim() || ""));
    lists.forEach((list) => {
      Array.from(list.querySelectorAll("li")).forEach((item) => {
        fallbackLines.push(`• ${(item.textContent || "").trim()}`);
      });
    });

    const fallbackText = fallbackLines.filter(Boolean).join("\n").trim();
    return fallbackText || (documentNode.body.textContent || "").replace(/\s+\n/g, "\n").trim();
  }

  const divider = "------------------------------------------------------------";

  const sectionTexts = sections.map((section) => {
    const lines = [];
    const titleNode = section.querySelector("[data-briefing-title], h2");
    const title = (titleNode?.textContent || "").trim();

    if (title) {
      lines.push(title);
      lines.push(divider);
    }

    const contentNodes = Array.from(section.children).filter((node) => {
      const isKicker = node.hasAttribute("data-briefing-kicker");
      const isTitle = node.hasAttribute("data-briefing-title") || node.tagName.toLowerCase() === "h2";
      return !isKicker && !isTitle;
    });

    contentNodes.forEach((node) => {
      const tagName = node.tagName.toLowerCase();
      if (tagName === "h3") {
        const text = (node.textContent || "").trim();
        if (text) {
          if (lines.length > 0) {
            lines.push("");
          }
          lines.push(text);
        }
        return;
      }

      if (tagName === "ul") {
        Array.from(node.querySelectorAll("li")).forEach((item) => {
          const text = (item.textContent || "").trim();
          if (text) {
            lines.push(`• ${text}`);
          }
        });
        return;
      }

      if (tagName === "p") {
        const text = (node.textContent || "").trim();
        if (text) {
          lines.push(text);
        }
      }
    });

    return lines.join("\n").trim();
  });

  return sectionTexts.filter(Boolean).join(`\n\n${divider}\n\n`).trim();
}

export function MarketUpdate({ theme = "light" }) {
  const [briefing, setBriefing] = React.useState(MARKET_UPDATE_PLACEHOLDER);
  const [generatedAt, setGeneratedAt] = React.useState(null);
  const [model, setModel] = React.useState(null);
  const [status, setStatus] = React.useState("loading");
  const [lastCheckedAt, setLastCheckedAt] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [selectedBriefingId, setSelectedBriefingId] = React.useState("latest");
  const [copyFeedback, setCopyFeedback] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [refreshFeedback, setRefreshFeedback] = React.useState("");

  const historyIds = React.useMemo(
    () => history.map((item) => item.id || item.generatedAt).filter(Boolean),
    [history],
  );

  const activeHistoryId = selectedBriefingId === "latest" ? historyIds[0] || null : selectedBriefingId;
  const activeHistoryIndex = activeHistoryId ? historyIds.indexOf(activeHistoryId) : -1;

  const palette =
    theme === "dark"
      ? {
          cardBg: "#0F1117",
          border: "#21262D",
          title: "#F0F6FC",
          text: "#C9D1D9",
          subText: "#8B949E",
          mutedBg: "#161B22",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E8E9EF",
          title: "#1A1A1A",
          text: "#30343F",
          subText: "#6B7280",
          mutedBg: "#F8F9FC",
        };

  const looksLikeHtml = /<\s*[a-z][\s\S]*>/i.test(briefing);
  const renderedBriefingHtml = React.useMemo(() => {
    if (!looksLikeHtml) {
      return "";
    }

    return sanitizeBriefingHtml(briefing);
  }, [briefing, looksLikeHtml]);

  const structureValidation = React.useMemo(() => {
    if (!looksLikeHtml) {
      return { passed: false, reason: "Non-HTML content" };
    }

    return getStructureValidation(briefing);
  }, [briefing, looksLikeHtml]);

  const copyBriefingToClipboard = React.useCallback(async () => {
    const textToCopy = (() => {
      if (!briefing) {
        return "";
      }

      if (!looksLikeHtml) {
        return briefing;
      }

      if (typeof window === "undefined") {
        return briefing.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }

      return buildStructuredClipboardTextFromHtml(renderedBriefingHtml || briefing);
    })();

    if (!textToCopy) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopyFeedback("Copied");
        window.setTimeout(() => setCopyFeedback(""), 1500);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopyFeedback("Copied");
      window.setTimeout(() => setCopyFeedback(""), 1500);
    } catch {
      setCopyFeedback("Copy failed");
      window.setTimeout(() => setCopyFeedback(""), 1500);
    }
  }, [briefing, looksLikeHtml, renderedBriefingHtml]);

  const fetchBriefing = React.useCallback(async (requestedId = "latest") => {
    try {
      const idQuery = requestedId && requestedId !== "latest" ? `&id=${encodeURIComponent(requestedId)}` : "";
      const response = await fetch(`/api/market-update?t=${Date.now()}${idQuery}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Request failed");
      }

      const payload = await response.json();

      setStatus(payload.status || "ok");
      setBriefing(payload.content || MARKET_UPDATE_PLACEHOLDER);
      setGeneratedAt(payload.generatedAt || null);
      setModel(payload.model || null);
      setHistory(Array.isArray(payload.history) ? payload.history : []);

      if (requestedId !== "latest" && payload.selectedId) {
        setSelectedBriefingId(payload.selectedId);
      }

      setLastCheckedAt(new Date().toISOString());
    } catch (error) {
      setStatus("error");
      setBriefing("Failed to load latest market briefing.");
      setGeneratedAt(null);
      setModel(null);
      setHistory([]);
      setLastCheckedAt(new Date().toISOString());
    }
  }, []);

  const triggerManualRefresh = React.useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setRefreshFeedback("");

    try {
      const response = await fetch("/api/market-update", {
        method: "POST",
        headers: {
          "Cache-Control": "no-store",
        },
      });

      const payload = await response.json();

      if (response.status === 409) {
        setRefreshFeedback(payload.message || "Refresh is already running.");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error || "Failed to refresh market briefing.");
      }

      setSelectedBriefingId("latest");
      await fetchBriefing("latest");
      setRefreshFeedback("Refresh completed.");
    } catch {
      setRefreshFeedback("Refresh failed.");
    } finally {
      setIsRefreshing(false);
      window.setTimeout(() => setRefreshFeedback(""), 2500);
    }
  }, [fetchBriefing, isRefreshing]);

  React.useEffect(() => {
    let active = true;

    const runFetch = async () => {
      if (!active) {
        return;
      }

      await fetchBriefing(selectedBriefingId);
    };

    runFetch();
    const intervalId = window.setInterval(runFetch, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runFetch();
      }
    };

    const handleFocus = () => {
      runFetch();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchBriefing, selectedBriefingId]);

  const now = new Date();
  const nextUpdate = new Date(now);
  const scheduleMinutes = [
    { hour: 5, minute: 0 },
    { hour: 12, minute: 30 },
  ];

  const nextScheduledTime = scheduleMinutes
    .map(({ hour, minute }) => {
      const candidate = new Date(now);
      candidate.setHours(hour, minute, 0, 0);
      return candidate;
    })
    .find((candidate) => candidate > now);

  if (nextScheduledTime) {
    nextUpdate.setTime(nextScheduledTime.getTime());
  } else {
    nextUpdate.setDate(nextUpdate.getDate() + 1);
    nextUpdate.setHours(scheduleMinutes[0].hour, scheduleMinutes[0].minute, 0, 0);
  }

  const nextUpdateLabel = nextUpdate.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="rounded-lg p-4 md:p-6"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-semibold" style={{ color: palette.title }}>
            Market Intelligence Briefing
          </h3>
          <p className="text-[12px] mt-1" style={{ color: palette.subText }}>
            Institutional global markets briefing generated from Deep Research prompt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refreshFeedback ? (
            <span className="text-[10px]" style={{ color: palette.subText }}>
              {refreshFeedback}
            </span>
          ) : null}
          <button
            type="button"
            className="h-[26px] px-2 inline-flex items-center justify-center gap-1 rounded border text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: palette.border,
              color: palette.subText,
              backgroundColor: palette.mutedBg,
            }}
            onClick={triggerManualRefresh}
            disabled={isRefreshing}
            title="Refresh briefing now"
            aria-label="Refresh briefing now"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Refreshing" : "Refresh now"}
          </button>
          {copyFeedback ? (
            <span className="text-[10px]" style={{ color: palette.subText }}>
              {copyFeedback}
            </span>
          ) : null}
          <button
            type="button"
            className="h-6 w-6 inline-flex items-center justify-center rounded border"
            style={{
              borderColor: palette.border,
              color: palette.subText,
              backgroundColor: palette.mutedBg,
            }}
            onClick={copyBriefingToClipboard}
            title={copyFeedback || "Copy briefing"}
            aria-label="Copy briefing"
          >
            <Copy size={12} />
          </button>
          <Newspaper size={18} style={{ color: palette.subText }} />
        </div>
      </div>

      <div
        className="rounded-lg border px-3 py-2 mb-4 flex items-center gap-2"
        style={{ borderColor: palette.border, backgroundColor: palette.mutedBg, color: palette.subText }}
      >
        <Clock3 size={14} />
        <span className="text-[12px]">
          Refresh schedule: 05:00 and 12:30. Next refresh target: {nextUpdateLabel}
          {generatedAt ? ` • Latest generated: ${new Date(generatedAt).toLocaleString("en-US")}` : ""}
          {model ? ` • Model: ${model}` : ""}
          {lastCheckedAt ? ` • Last checked: ${new Date(lastCheckedAt).toLocaleString("en-US")}` : ""}
        </span>
      </div>

      <div
        className="rounded-lg border px-3 py-2 mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        style={{ borderColor: palette.border, backgroundColor: palette.cardBg }}
      >
        <div className="flex items-center gap-2 text-[12px]" style={{ color: palette.subText }}>
          <span>Briefing archive (latest 30 generated)</span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: structureValidation.passed
                ? theme === "dark"
                  ? "#1E3A2B"
                  : "#E7F7EE"
                : theme === "dark"
                  ? "#3A1E1E"
                  : "#FDECEC",
              color: structureValidation.passed
                ? theme === "dark"
                  ? "#7EE2A8"
                  : "#1E7A45"
                : theme === "dark"
                  ? "#F3A6A6"
                  : "#9B1C1C",
            }}
            title={structureValidation.reason}
          >
            Structure check: {structureValidation.passed ? "Passed" : "Needs review"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px]" style={{ color: palette.subText }} htmlFor="briefing-version-select">
            Version
          </label>
          <select
            id="briefing-version-select"
            className="h-[30px] rounded-md border px-2 text-[12px]"
            style={{
              borderColor: palette.border,
              color: palette.text,
              backgroundColor: palette.mutedBg,
            }}
            value={selectedBriefingId}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSelectedBriefingId(nextValue);
              fetchBriefing(nextValue);
            }}
          >
            <option value="latest">Latest briefing</option>
            {history.map((item) => {
              const optionId = item.id || item.generatedAt;
              if (!optionId) {
                return null;
              }

              const dateLabel = item.generatedAt
                ? new Date(item.generatedAt).toLocaleString("en-US")
                : "Unknown time";
              const modelLabel = item.model ? ` • ${item.model}` : "";

              return (
                <option key={optionId} value={optionId}>
                  {dateLabel}{modelLabel}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            className="h-[30px] px-2 rounded-md border text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: palette.border,
              color: palette.text,
              backgroundColor: palette.mutedBg,
            }}
            disabled={activeHistoryIndex <= 0}
            onClick={() => {
              const newerId = historyIds[activeHistoryIndex - 1];
              if (!newerId) {
                return;
              }

              setSelectedBriefingId(newerId);
              fetchBriefing(newerId);
            }}
          >
            Newer
          </button>

          <button
            type="button"
            className="h-[30px] px-2 rounded-md border text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: palette.border,
              color: palette.text,
              backgroundColor: palette.mutedBg,
            }}
            disabled={activeHistoryIndex < 0 || activeHistoryIndex >= historyIds.length - 1}
            onClick={() => {
              const olderId = historyIds[activeHistoryIndex + 1];
              if (!olderId) {
                return;
              }

              setSelectedBriefingId(olderId);
              fetchBriefing(olderId);
            }}
          >
            Older
          </button>
        </div>
      </div>

      <div
        className="rounded-lg border p-4 mb-4"
        style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}
      >
        {status === "loading" && (
          <div className="text-[12px] mb-3" style={{ color: palette.subText }}>
            Loading latest briefing...
          </div>
        )}
        {looksLikeHtml ? (
          <div
            className="text-[12px] leading-relaxed [&_section[data-briefing-card]]:rounded-md [&_section[data-briefing-card]]:border [&_section[data-briefing-card]]:px-3 [&_section[data-briefing-card]]:py-3 [&_section[data-briefing-card]]:mb-3 [&_section[data-briefing-card]]:bg-[var(--briefing-card-bg)] [&_section[data-briefing-card]]:border-[var(--briefing-card-border)] [&_[data-briefing-kicker]]:text-[10px] [&_[data-briefing-kicker]]:uppercase [&_[data-briefing-kicker]]:tracking-[0.08em] [&_[data-briefing-kicker]]:font-semibold [&_[data-briefing-kicker]]:mb-1 [&_[data-briefing-kicker]]:text-[var(--briefing-kicker)] [&_[data-briefing-title]]:text-[15px] [&_[data-briefing-title]]:font-semibold [&_[data-briefing-title]]:leading-snug [&_[data-briefing-title]]:mt-0 [&_[data-briefing-title]]:mb-2 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_li]:mb-1"
            style={{
              color: palette.text,
              "--briefing-card-border": palette.border,
              "--briefing-card-bg": palette.cardBg,
              "--briefing-kicker": palette.subText,
            }}
            dangerouslySetInnerHTML={{ __html: renderedBriefingHtml }}
          />
        ) : (
          <div className="text-[12px] whitespace-pre-line leading-relaxed" style={{ color: palette.text }}>
            {briefing}
          </div>
        )}
      </div>

      <details
        className="rounded-lg border p-3"
        style={{ borderColor: palette.border, backgroundColor: palette.cardBg }}
      >
        <summary className="text-[12px] font-medium cursor-pointer" style={{ color: palette.title }}>
          Deep Research Prompt Reference
        </summary>
        <pre
          className="mt-3 text-[11px] whitespace-pre-wrap leading-relaxed"
          style={{ color: palette.subText, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
        >
          {RESEARCH_PROMPT}
        </pre>
      </details>
    </div>
  );
}
