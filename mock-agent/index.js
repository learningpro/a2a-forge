/**
 * Mock A2A Agent — zero-dependency Node.js server for demo/testing.
 *
 * Endpoints:
 *   GET  /.well-known/agent.json  → Agent card
 *   GET  /static/*                → Static files (images, etc.)
 *   GET  /proxy?url=<url>         → CORS proxy (GET)
 *   POST /proxy?url=<url>         → CORS proxy (POST)
 *   POST /a2a                     → JSON-RPC 2.0 handler
 *   OPTIONS *                     → CORS preflight
 */

import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "9700", 10);

// Preload the architecture SVG
const ARCHITECTURE_SVG = readFileSync(join(__dirname, "architecture.svg"));

// ---------------------------------------------------------------------------
// Agent Card
// ---------------------------------------------------------------------------

const AGENT_CARD = {
  name: "Mock Agent",
  description: "A demo A2A agent for testing. Supports echo, reverse, and image generation skills.",
  url: `http://localhost:${PORT}`,
  version: "1.0.0",
  protocolVersion: "1.0",
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  skills: [
    {
      id: "echo",
      name: "Echo",
      description: "Echoes back whatever you send",
      tags: ["demo", "text"],
      inputModes: ["text"],
      outputModes: ["text"],
      examples: ["Hello world", "Testing 1 2 3"],
    },
    {
      id: "reverse",
      name: "Reverse",
      description: "Reverses the input text",
      tags: ["demo", "text"],
      inputModes: ["text"],
      outputModes: ["text"],
      examples: ["Hello world"],
    },
    {
      id: "image_generate",
      name: "Image Generate",
      description: "Generates an architecture diagram image (simulates a text-to-image AI call with 3s delay)",
      tags: ["demo", "image", "async"],
      inputModes: ["text"],
      outputModes: ["image"],
      examples: ["Generate architecture diagram", "Draw system overview"],
    },
  ],
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  provider: {
    organization: "A2A Forge Demo",
    url: "https://cnb.cool/orange-opensource/a2a-forge",
  },
};

// ---------------------------------------------------------------------------
// In-memory task store (for async polling demo)
// ---------------------------------------------------------------------------

const tasks = new Map();

// ---------------------------------------------------------------------------
// Skill handlers
// ---------------------------------------------------------------------------

function extractText(params) {
  const msg = params?.message;
  if (msg?.parts?.[0]?.text) return msg.parts[0].text;
  if (msg?.text) return msg.text;
  if (params?.input?.text) return params.input.text;
  if (params?.input?.prompt) return params.input.prompt;
  if (typeof params?.input === "string") return params.input;
  return JSON.stringify(params);
}

function makeTextResult(taskId, text, rpcId) {
  return {
    jsonrpc: "2.0",
    result: {
      id: taskId,
      status: { state: "completed" },
      message: {
        role: "agent",
        parts: [{ type: "text", text }],
      },
      artifacts: [{ parts: [{ type: "text", text }] }],
    },
    id: rpcId,
  };
}

function makeImageResult(taskId, imageUrl, prompt, rpcId) {
  return {
    jsonrpc: "2.0",
    result: {
      id: taskId,
      status: { state: "completed" },
      message: {
        role: "agent",
        parts: [
          { type: "text", text: `Generated architecture diagram for: "${prompt}"` },
          { type: "file", mimeType: "image/svg+xml", file: { uri: imageUrl } },
        ],
      },
      artifacts: [{
        parts: [
          { type: "text", text: `Generated architecture diagram for: "${prompt}"` },
          { type: "file", mimeType: "image/svg+xml", file: { uri: imageUrl } },
        ],
      }],
    },
    id: rpcId,
  };
}

// ---------------------------------------------------------------------------
// JSON-RPC dispatcher
// ---------------------------------------------------------------------------

function handleRpc(body, baseUrl) {
  const { method, params, id: rpcId } = body;

  // tasks/get — poll for async task
  if (method === "tasks/get") {
    const taskId = params?.id || params?.task_id;
    const task = tasks.get(taskId);
    if (!task) {
      return { jsonrpc: "2.0", error: { code: -32001, message: "Task not found" }, id: rpcId };
    }
    if (Date.now() - task.startedAt > 3000) {
      task.status = "completed";
      if (task.type === "image") {
        return makeImageResult(taskId, task.imageUrl, task.prompt, rpcId);
      }
      return makeTextResult(taskId, task.resultText, rpcId);
    }
    return {
      jsonrpc: "2.0",
      result: {
        id: taskId,
        status: { state: task.status, message: "Generating image, please wait..." },
      },
      id: rpcId,
    };
  }

  // tasks/send or tasks/sendSubscribe
  if (method === "tasks/send" || method === "tasks/sendSubscribe") {
    const skillId = params?.skill_id || params?.skillId || "echo";
    const text = extractText(params);
    const taskId = params?.id || `task-${Date.now()}`;

    // Image generate — async, returns after 3s polling
    if (skillId === "image_generate") {
      const imageUrl = `${baseUrl}/static/architecture.svg`;
      tasks.set(taskId, {
        type: "image",
        status: "working",
        startedAt: Date.now(),
        imageUrl,
        prompt: text,
      });
      return {
        jsonrpc: "2.0",
        result: {
          id: taskId,
          status: { state: "working", message: "Generating image..." },
        },
        id: rpcId,
      };
    }

    // Sync skills
    let resultText;
    switch (skillId) {
      case "reverse":
        resultText = `Reversed: ${[...text].reverse().join("")}`;
        break;
      case "echo":
      default:
        resultText = `Echo: ${text}`;
        break;
    }

    return makeTextResult(taskId, resultText, rpcId);
  }

  return {
    jsonrpc: "2.0",
    error: { code: -32601, message: `Method not found: ${method}` },
    id: rpcId,
  };
}

// ---------------------------------------------------------------------------
// CORS Proxy — forwards requests to third-party agents
// ---------------------------------------------------------------------------

function proxyRequest(targetUrl, method, headers, body, res) {
  const parsed = new URL(targetUrl);
  const transport = parsed.protocol === "https:" ? httpsRequest : httpRequest;

  // Forward relevant headers, skip host/origin
  const fwdHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (["host", "origin", "referer", "connection"].includes(lower)) continue;
    fwdHeaders[k] = v;
  }

  const opts = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method,
    headers: fwdHeaders,
  };

  console.log(`[PROXY ${method}] ${targetUrl}`);

  const proxyReq = transport(opts, (proxyRes) => {
    const respHeaders = { ...CORS_HEADERS };
    // Forward content-type and other safe headers
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      const lower = k.toLowerCase();
      if (["content-type", "content-length", "cache-control", "etag", "last-modified"].includes(lower)) {
        respHeaders[k] = v;
      }
    }
    res.writeHead(proxyRes.statusCode, respHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[PROXY] Error: ${err.message}`);
    res.writeHead(502, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
  });

  // Set a timeout
  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    res.writeHead(504, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Proxy timeout" }));
  });

  if (body) {
    proxyReq.write(body);
  }
  proxyReq.end();
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, { ...CORS_HEADERS, "Content-Type": "application/json" });
  res.end(body);
}

const server = createServer(async (req, res) => {
  // Derive base URL from request headers (handles cnb.run proxy)
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers["x-forwarded-proto"] || "http";
  const baseUrl = `${proto}://${host}`;

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Agent card
  if (url.pathname === "/.well-known/agent.json" && req.method === "GET") {
    // Return card with dynamic URL based on how we're accessed
    const card = { ...AGENT_CARD, url: baseUrl };
    json(res, card);
    return;
  }

  // Static files
  if (url.pathname === "/static/architecture.svg" && req.method === "GET") {
    res.writeHead(200, {
      ...CORS_HEADERS,
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    });
    res.end(ARCHITECTURE_SVG);
    return;
  }

  // CORS Proxy — /proxy?url=<encoded_url>
  if (url.pathname === "/proxy") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      res.writeHead(400, { ...CORS_HEADERS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing ?url= parameter" }));
      return;
    }
    try {
      new URL(targetUrl); // validate
    } catch {
      res.writeHead(400, { ...CORS_HEADERS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid URL" }));
      return;
    }

    if (req.method === "GET") {
      proxyRequest(targetUrl, "GET", req.headers, null, res);
      return;
    }
    if (req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      proxyRequest(targetUrl, "POST", req.headers, body, res);
      return;
    }
  }

  // A2A endpoint — accept POST on any path
  if (req.method === "POST") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      console.log(`[POST ${url.pathname}] body: ${raw.slice(0, 500)}`);
      const body = JSON.parse(raw);
      const result = handleRpc(body, baseUrl);
      json(res, result);
    } catch (err) {
      console.error("[POST] Parse error:", err.message);
      json(res, { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
    }
    return;
  }

  res.writeHead(404, CORS_HEADERS);
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  Mock A2A Agent running at http://localhost:${PORT}`);
  console.log(`  Agent card:    http://localhost:${PORT}/.well-known/agent.json`);
  console.log(`  A2A endpoint:  POST http://localhost:${PORT}/a2a`);
  console.log(`  Architecture:  http://localhost:${PORT}/static/architecture.svg`);
  console.log(`\n  Skills: echo, reverse, image_generate (3s async)\n`);
});
