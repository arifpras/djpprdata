import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

let generationPromise = null;

function normalizeLanguage(value) {
  const raw = String(value || "").toLowerCase();
  return raw === "id" || raw === "indonesia" ? "id" : "en";
}

function getMarketUpdateFilePath(language) {
  const lang = normalizeLanguage(language);
  return path.join(process.cwd(), "data", "market-update", `latest-${lang}.json`);
}

function getMarketUpdateHistoryPath(language) {
  const lang = normalizeLanguage(language);
  return path.join(process.cwd(), "data", "market-update", `history-${lang}.json`);
}

function runMarketUpdateGeneration(language) {
  const lang = normalizeLanguage(language);

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "generate-market-update.mjs");

    if (!fs.existsSync(scriptPath)) {
      reject(new Error("Market update generation script not found."));
      return;
    }

    const child = spawn(process.execPath, [scriptPath, "--lang", lang], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const safeError = stderr.trim() || "Market update generation failed.";
      reject(new Error(safeError));
    });
  });
}

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url);
    const language = normalizeLanguage(requestUrl.searchParams.get("lang"));
    const filePath = getMarketUpdateFilePath(language);
    const historyPath = getMarketUpdateHistoryPath(language);
    const selectedId = requestUrl.searchParams.get("id");

    const legacyLatestPath = path.join(process.cwd(), "data", "market-update", "latest.json");
    const legacyHistoryPath = path.join(process.cwd(), "data", "market-update", "history.json");
    const resolvedFilePath = fs.existsSync(filePath) ? filePath : legacyLatestPath;
    const resolvedHistoryPath = fs.existsSync(historyPath) ? historyPath : legacyHistoryPath;

    let history = [];
    if (fs.existsSync(resolvedHistoryPath)) {
      const rawHistory = fs.readFileSync(resolvedHistoryPath, "utf8");
      const parsedHistory = JSON.parse(rawHistory);
      if (Array.isArray(parsedHistory)) {
        history = parsedHistory;
      }
    }

    const historyMeta = history.map((entry) => ({
      id: entry.id || entry.generatedAt || "",
      generatedAt: entry.generatedAt || null,
      model: entry.model || null,
    }));

    if (!fs.existsSync(resolvedFilePath)) {
      const selectedEntry = selectedId
        ? history.find((entry) => (entry.id || entry.generatedAt) === selectedId)
        : history[0] || null;

      return Response.json(
        {
          status: selectedEntry ? "ok" : "not-ready",
          selectedId: selectedEntry ? selectedEntry.id || selectedEntry.generatedAt : null,
          generatedAt: selectedEntry ? selectedEntry.generatedAt || null : null,
          model: selectedEntry ? selectedEntry.model || null : null,
          language,
          content: selectedEntry
            ? selectedEntry.content || ""
            : language === "id"
              ? "Ringkasan Intelijen Pasar belum dibuat. Jalankan `npm run generate:market-update` atau klik Refresh untuk membuat pembaruan terbaru."
              : "Market Intelligence Briefing is not generated yet. Run `npm run generate:market-update` or use Refresh to create the latest output.",
          history: historyMeta,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const raw = fs.readFileSync(resolvedFilePath, "utf8");
    const parsed = JSON.parse(raw);

    const fallbackLatestId = parsed.id || parsed.generatedAt || null;
    const selectedEntry = selectedId
      ? history.find((entry) => (entry.id || entry.generatedAt) === selectedId) || null
      : null;

    const responseEntry = selectedEntry || parsed;

    return Response.json(
      {
        status: "ok",
        selectedId: responseEntry.id || responseEntry.generatedAt || fallbackLatestId,
        generatedAt: responseEntry.generatedAt || null,
        model: responseEntry.model || null,
        language,
        content: responseEntry.content || "",
        history: historyMeta,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to read market update:", error);
    return Response.json(
      {
        status: "error",
        error: "Failed to load market update.",
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

export async function POST(request) {
  const requestUrl = new URL(request.url);
  const language = normalizeLanguage(requestUrl.searchParams.get("lang"));

  if (generationPromise) {
    return Response.json(
      {
        status: "running",
        message:
          language === "id"
            ? "Pembaruan market update sedang berjalan."
            : "Market update generation is already in progress.",
      },
      {
        status: 409,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  generationPromise = runMarketUpdateGeneration(language);

  try {
    await generationPromise;
    return Response.json(
      {
        status: "ok",
        message:
          language === "id"
            ? "Market update berhasil dibuat."
            : "Market update generated successfully.",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to generate market update:", error);
    return Response.json(
      {
        status: "error",
        error:
          language === "id"
            ? "Gagal membuat market update."
            : "Failed to generate market update.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } finally {
    generationPromise = null;
  }
}
