import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).replace(/^\uFEFF/, "").trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || (process.env[key] !== undefined && process.env[key] !== "")) {
      continue;
    }

    const unquoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1)
        : value;

    process.env[key] = unquoted;
  }
}

loadEnvFromFile(path.join(projectRoot, ".env"));

const MODEL = process.env.OPENAI_MODEL || "gpt-5.2";
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 4000);
const MAX_HISTORY_ITEMS = 30;

function normalizeLanguage(value) {
  const raw = String(value || "").toLowerCase();
  return raw === "id" || raw === "indonesia" ? "id" : "en";
}

function getLanguageArg() {
  const langArgIndex = process.argv.findIndex((item) => item === "--lang");
  if (langArgIndex >= 0) {
    return normalizeLanguage(process.argv[langArgIndex + 1]);
  }

  const equalsArg = process.argv.find((item) => item.startsWith("--lang="));
  if (equalsArg) {
    return normalizeLanguage(equalsArg.split("=")[1]);
  }

  return normalizeLanguage(process.env.MARKET_UPDATE_LANG || "en");
}

const LANGUAGE = getLanguageArg();

const PROMPT_EN = `Act as a CFA charterholder and global macro strategist operating in deep research mode.

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

const PROMPT_ID = `Bertindaklah sebagai pemegang CFA charter sekaligus strategist makro global dalam mode riset mendalam.

Siapkan ringkasan pasar global tingkat kebijakan yang hanya memuat perkembangan ekonomi dan keuangan paling penting dalam 24 jam terakhir.

Audiens:
Pengambil kebijakan senior.
Gunakan Bahasa Indonesia yang lugas, profesional, dan mudah dipahami. Hindari istilah yang terlalu teknis tanpa konteks.

Ruang lingkup dan aturan seleksi:

* Pilih tepat 4 perkembangan pasar global yang paling berdampak dalam 24 jam terakhir.
* Urutkan berdasarkan dampak (paling penting lebih dulu), tetapi jangan beri label ranking 1, 2, dst.
* Dari 4 ringkasan tersebut:

  * Minimal 1 harus fokus pada perkembangan ekonomi dan keuangan Indonesia.
  * Sisanya mencakup perkembangan global utama (AS, Tiongkok, Eropa, Jepang, EM utama, komoditas, geopolitik yang memengaruhi pasar).

Untuk setiap perkembangan, gunakan struktur berikut dalam poin-poin:

Headline
Judul singkat bergaya institusional.

Event Synopsis

* Ringkasan faktual (rilis data, keputusan kebijakan, pergerakan pasar, perkembangan geopolitik).
* Cantumkan angka kunci bila relevan (yield, pergerakan indeks, level FX, data inflasi, dll).
* Maksimal 2 poin.

Cross-Asset Market Reaction

* Ringkas pergerakan pada:

  * Yield obligasi pemerintah (khususnya US 10Y dan Indonesia 10Y)
  * Indeks saham utama
  * Pasangan FX utama (DXY, USD/IDR, EUR/USD, USD/JPY, USD/CNH)
  * Komoditas (Brent, WTI, Gold)

US 10Y, Indonesia 10Y, DXY, dan USD/IDR wajib selalu disebut meskipun tidak banyak berubah; tulis “relatif stabil” bila perlu, tetap sertakan level terbaru.
* Maksimal 3 poin.

Policy Relevance

* Jelaskan dampak terhadap:

  * Prospek inflasi
  * Ekspektasi pertumbuhan
  * Arus modal
  * Stabilitas nilai tukar
  * Stabilitas pasar keuangan
  * Ruang kebijakan fiskal/moneter
  * Maksimal 2 poin.

Forward Watch Points

* 1–2 poin mengenai hal yang perlu dipantau selanjutnya oleh pembuat kebijakan.

Jaga nada tulisan profesional, netral, dan relevan untuk kebijakan.
Hindari spekulasi berlebihan di luar skenario yang masuk akal.
Ringkas namun tetap bernas.

Ringkasan ini untuk kebutuhan asesmen strategis internal, bukan komunikasi publik.

Format output:
* Kembalikan HTML valid saja (tanpa Markdown, tanpa code fence).
* Gunakan struktur:
  - <h2> untuk setiap headline perkembangan, total tepat 4 bagian <h2>.
  - <h3> untuk label bagian: Event Synopsis, Cross-Asset Market Reaction, Policy Relevance, Forward Watch Points.
  - <ul><li> untuk poin-poin.
* Format harus rapi, ringkas, dan nyaman dibaca pada dashboard eksekutif.`;

function stripHyperlinksFromHtml(input) {
  if (!input) {
    return "";
  }

  return input
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1");
}

function keepSingleSourceCitation(input) {
  if (!input) {
    return "";
  }

  return input.replace(/\(Source:\s*([^);]+)(?:;\s*Source:[^)]+)+\)/gi, "(Source: $1)");
}

function validateBriefingStructure(html) {
  const h2Matches = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => ({
    raw: match[0],
    headline: String(match[1] || "").replace(/<[^>]+>/g, "").trim(),
  }));

  const sections = [];
  for (let index = 0; index < h2Matches.length; index += 1) {
    const current = h2Matches[index];
    const next = h2Matches[index + 1];
    const start = html.indexOf(current.raw);
    const end = next ? html.indexOf(next.raw, start + current.raw.length) : html.length;
    const sectionHtml = html.slice(start + current.raw.length, end);
    sections.push({
      headline: current.headline,
      body: sectionHtml,
    });
  }

  const hasIndonesia = h2Matches.some((item) => item.headline.toLowerCase().includes("indonesia"));
  const requiredLabels = [
    "Event Synopsis",
    "Cross-Asset Market Reaction",
    "Policy Relevance",
    "Forward Watch Points",
  ];

  const missingLabels = requiredLabels.filter(
    (label) => !new RegExp(`<h3\\b[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<\\/h3>`, "i").test(html),
  );

  const incompleteSections = sections
    .map((section) => {
      const missing = requiredLabels.filter(
        (label) =>
          !new RegExp(`<h3\\b[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<\\/h3>`, "i").test(
            section.body,
          ),
      );

      return {
        headline: section.headline,
        missing,
      };
    })
    .filter((item) => item.missing.length > 0);

  return {
    valid: h2Matches.length === 4 && hasIndonesia && missingLabels.length === 0 && incompleteSections.length === 0,
    h2Count: h2Matches.length,
    hasIndonesia,
    missingLabels,
    incompleteSections,
  };
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  const client = new OpenAI({ apiKey });

  const isIndonesian = LANGUAGE === "id";
  const prompt = isIndonesian ? PROMPT_ID : PROMPT_EN;

  const baseSystemPrompt = isIndonesian
    ? "Anda menulis ringkasan makro kelas institusi dalam Bahasa Indonesia. Gunakan web_search agar data mencerminkan 24 jam terakhir. Kembalikan HTML valid saja. Hasil harus berisi tepat 4 bagian perkembangan dan minimal satu bagian fokus Indonesia. Gunakan label bagian Event Synopsis, Cross-Asset Market Reaction, Policy Relevance, dan Forward Watch Points. Jangan gunakan hyperlink; sitasi cukup teks polos seperti (Source: Reuters) atau (Source: BI). Maksimal satu sitasi sumber per bullet point."
    : "You write institutional-grade macro briefings. Use web_search to ensure all data reflects the last 24 hours. Return valid HTML only. Produce exactly 4 development sections and ensure at least one section is Indonesia-focused. Use section labels Event Synopsis, Cross-Asset Market Reaction, Policy Relevance, and Forward Watch Points. Do not include hyperlinks in citations; cite sources as plain text labels like (Source: Reuters) or (Source: BI). Use at most one source citation per bullet point.";

  const generateAttempt = async (extraInstruction = "") => {
    console.error(`[DEBUG] Requesting ${MODEL} with web_search tool...`);

    const resp = await client.responses.create({
      model: MODEL,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      tools: [{ type: "web_search" }],
      input: [
        {
          role: "system",
          content: baseSystemPrompt,
        },
        {
          role: "user",
          content: `${prompt}${extraInstruction ? `\n\n${extraInstruction}` : ""}`,
        },
      ],
    });

    console.error(`[DEBUG] Response received. output_text length: ${(resp.output_text || "").length}`);

    return {
      resp,
      text: keepSingleSourceCitation(stripHyperlinksFromHtml((resp.output_text || "").trim())),
    };
  };

  let resp = null;
  let text = "";
  let validation = {
    valid: false,
    h2Count: 0,
    hasIndonesia: false,
    missingLabels: [],
    incompleteSections: [],
  };

  let retryInstruction = "";
  const MAX_ATTEMPTS = 4;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    ({ resp, text } = await generateAttempt(retryInstruction));

    if (!text || text.toLowerCase().includes("unable to locate any credible reports")) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`[DEBUG] Full response:`, JSON.stringify(resp, null, 2));
        throw new Error("Briefing failed: no retrieval / empty output");
      }

      retryInstruction =
        "Regenerate now. Do not return placeholders. Provide complete content with exact required structure and concrete market data in the last 24 hours.";
      continue;
    }

    validation = validateBriefingStructure(text);
    if (validation.valid) {
      break;
    }

    if (attempt < MAX_ATTEMPTS) {
      const sectionFixes = validation.incompleteSections
        .map((item) => `For headline \"${item.headline}\", add missing sections: ${item.missing.join(", ")}`)
        .join(". ");

      retryInstruction =
        `Regenerate now and strictly comply: output exactly 4 <h2> development sections, include at least one Indonesia-focused section, and include all four <h3> labels for every development section without exception. ${
          sectionFixes || "Ensure every section is complete."
        }`;
    }
  }

  if (!validation.valid) {
    throw new Error(
      `Briefing failed: invalid structure (h2_count=${validation.h2Count}, has_indonesia=${validation.hasIndonesia}, missing_labels=${validation.missingLabels.join(",") || "none"}, incomplete_sections=${validation.incompleteSections
        .map((item) => `${item.headline}=>${item.missing.join("|")}`)
        .join(";") || "none"})`,
    );
  }

  const output = {
    id: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    model: MODEL,
    language: LANGUAGE,
    content: text,
  };

  const outputPath = path.join(projectRoot, "data", "market-update", `latest-${LANGUAGE}.json`);
  const historyPath = path.join(projectRoot, "data", "market-update", `history-${LANGUAGE}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

  let existingHistory = [];
  if (fs.existsSync(historyPath)) {
    try {
      const rawHistory = fs.readFileSync(historyPath, "utf8");
      const parsedHistory = JSON.parse(rawHistory);
      if (Array.isArray(parsedHistory)) {
        existingHistory = parsedHistory;
      }
    } catch {
      existingHistory = [];
    }
  }

  const updatedHistory = [
    output,
    ...existingHistory.filter((item) => item?.id !== output.id),
  ].slice(0, MAX_HISTORY_ITEMS);
  fs.writeFileSync(historyPath, JSON.stringify(updatedHistory, null, 2), "utf8");

  process.stdout.write(text);
  process.stdout.write("\n\nSaved to data/market-update/latest.json\n");
}

main().catch((error) => {
  console.error("generate-market-update failed:", error.message);
  process.exit(1);
});
