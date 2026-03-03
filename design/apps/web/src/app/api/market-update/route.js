import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

let generationPromise = null;

function getMarketUpdateFilePath() {
  return path.join(process.cwd(), "data", "market-update", "latest.json");
}

function getMarketUpdateHistoryPath() {
  return path.join(process.cwd(), "data", "market-update", "history.json");
}

function runMarketUpdateGeneration() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "generate-market-update.mjs");

    if (!fs.existsSync(scriptPath)) {
      reject(new Error("Market update generation script not found."));
      return;
    }

    const child = spawn(process.execPath, [scriptPath], {
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
    const filePath = getMarketUpdateFilePath();
    const historyPath = getMarketUpdateHistoryPath();
    const requestUrl = new URL(request.url);
    const selectedId = requestUrl.searchParams.get("id");

    let history = [];
    if (fs.existsSync(historyPath)) {
      const rawHistory = fs.readFileSync(historyPath, "utf8");
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

    if (!fs.existsSync(filePath)) {
      const selectedEntry = selectedId
        ? history.find((entry) => (entry.id || entry.generatedAt) === selectedId)
        : history[0] || null;

      return Response.json(
        {
          status: selectedEntry ? "ok" : "not-ready",
          selectedId: selectedEntry ? selectedEntry.id || selectedEntry.generatedAt : null,
          generatedAt: selectedEntry ? selectedEntry.generatedAt || null : null,
          model: selectedEntry ? selectedEntry.model || null : null,
          content: selectedEntry
            ? selectedEntry.content || ""
            : "Market Intelligence Briefing is not generated yet. Run `npm run generate:market-update` or use Refresh now to create the latest output.",
          history: historyMeta,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const raw = fs.readFileSync(filePath, "utf8");
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

export async function POST() {
  if (generationPromise) {
    return Response.json(
      {
        status: "running",
        message: "Market update generation is already in progress.",
      },
      {
        status: 409,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  generationPromise = runMarketUpdateGeneration();

  try {
    await generationPromise;
    return Response.json(
      {
        status: "ok",
        message: "Market update generated successfully.",
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
        error: "Failed to generate market update.",
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
