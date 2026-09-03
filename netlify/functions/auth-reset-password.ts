import { handleResetPassword } from "../../server/routes/passwordReset";
import { runExpressHandler } from "./_shared/express-shim";

type NetlifyEvent = {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  rawUrl?: string;
  path?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
};

function toRequest(event: Request | NetlifyEvent): Request {
  if (event instanceof Request) return event;

  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers || {})) {
    if (value !== undefined) headers.set(name, value);
  }

  let body: string | undefined;
  if (event.body) {
    body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
  }

  const url = new URL(event.rawUrl || `https://mon-shm.netlify.app${event.path || "/"}`);
  for (const [name, value] of Object.entries(event.queryStringParameters || {})) {
    if (value !== undefined) url.searchParams.set(name, value);
  }

  return new Request(url, {
    method: event.httpMethod || "GET",
    headers,
    body: event.httpMethod === "GET" || event.httpMethod === "HEAD" ? undefined : body,
  });
}

export const handler = async (event: Request | NetlifyEvent): Promise<Response> => {
  return runExpressHandler(handleResetPassword, toRequest(event));
};

export default handler;
