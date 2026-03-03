import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function getWorkspaceRoot() {
  const configuredRoot = process.env.DASHBOARD_WORKSPACE_ROOT;
  if (configuredRoot && fs.existsSync(configuredRoot)) {
    return configuredRoot;
  }

  const relativeRoot = path.join(process.cwd(), "..", "..", "..");
  if (fs.existsSync(relativeRoot)) {
    return relativeRoot;
  }

  return "/Users/arifpras/Library/CloudStorage/Dropbox/perisai/dashboard";
}

function getPythonExecutable(workspaceRoot) {
  const configuredPython = process.env.BOND_PREDICT_PYTHON;
  if (configuredPython && fs.existsSync(configuredPython)) {
    return configuredPython;
  }

  const venvPython = path.join(workspaceRoot, ".venv", "bin", "python");
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  return "python3";
}

function runPredictProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

export async function GET() {
  return Response.json(
    {
      message: "Upload a CSV and run prediction.",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export async function POST(request) {
  let tempDir = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    const isFileLike = file && typeof file === "object" && typeof file.text === "function";
    if (!isFileLike) {
      return Response.json(
        { error: "CSV file is required." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const fileText = await file.text();
    if (!fileText.trim()) {
      return Response.json(
        { error: "Uploaded CSV is empty." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bond-predict-"));
    const inputPath = path.join(tempDir, "input.csv");
    fs.writeFileSync(inputPath, fileText, "utf8");

    const workspaceRoot = getWorkspaceRoot();
    const scriptPath = path.join(workspaceRoot, "model", "predict_bond_prices.py");
    const dbtrainCsv = path.join(workspaceRoot, "model", "dbtrain.csv");
    const modelsDir = path.join(workspaceRoot, "model", "production", "models");
    const validationCsv = path.join(modelsDir, "predictions_all_models.csv");
    const validationReport = path.join(modelsDir, "validation_report.json");

    if (!fs.existsSync(scriptPath)) {
      return Response.json(
        { error: "Prediction script not found." },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    if (!fs.existsSync(modelsDir)) {
      return Response.json(
        { error: "Saved models directory not found. Please run model export first." },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const pythonExecutable = getPythonExecutable(workspaceRoot);
    const processResult = await runPredictProcess(pythonExecutable, [
      scriptPath,
      "--input",
      inputPath,
      "--models-dir",
      modelsDir,
      "--validation-csv",
      validationCsv,
      "--validation-report",
      validationReport,
      "--dbtrain",
      dbtrainCsv,
    ]);

    if (processResult.code !== 0) {
      let structuredError = null;
      try {
        structuredError = JSON.parse(processResult.stdout || "{}");
      } catch {
        structuredError = null;
      }

      const safeError =
        structuredError?.error
        || processResult.stderr?.trim()
        || "Prediction process failed.";

      return Response.json(
        {
          error: safeError,
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(processResult.stdout);
    } catch {
      return Response.json(
        {
          error: "Failed to parse prediction output.",
          details: processResult.stdout,
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    if (parsed?.error) {
      return Response.json(
        { error: parsed.error },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    return Response.json(parsed, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Failed to generate bond predictions:", error);
    return Response.json(
      { error: "Failed to generate bond predictions." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
