/**
 * Curl command generator for A2A requests.
 *
 * Produces a copy-pasteable curl command for debugging agent calls.
 */

export function generateCurlCommand(
  agentUrl: string,
  payload: object,
  authHeader?: string,
  extraHeaders?: Record<string, string>,
): string {
  // Strip trailing slash
  const url = agentUrl.replace(/\/+$/, "");

  const parts: string[] = [`curl -X POST '${url}/a2a'`];

  parts.push(`  -H 'Content-Type: application/json'`);

  if (authHeader) {
    parts.push(`  -H '${authHeader}'`);
  }

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      parts.push(`  -H '${key}: ${value}'`);
    }
  }

  parts.push(`  -d '${JSON.stringify(payload)}'`);

  return parts.join(" \\\n");
}
