// Thin, typed wrapper over `supabase.functions.invoke`. The `path` may include route segments
// and a query string (e.g. "emergency-service/evidence?type=audio") — functions-js concatenates
// it onto the functions base URL, which is how we reach the routers inside each edge function.
import { supabase, ensureSession } from "./supabase";
import { getAdminToken } from "./adminToken";

export class FunctionError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FunctionError";
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export async function callFn<T>(path: string, opts?: { method?: Method; body?: unknown }): Promise<T> {
  await ensureSession();
  // Attach the admin session token (if signed in) so admin routes on user-service can authorize.
  // Harmless on non-admin calls, which simply ignore the header.
  const adminToken = getAdminToken();
  const { data, error } = await supabase.functions.invoke(path, {
    method: opts?.method ?? "GET",
    body: opts?.body as object | undefined,
    headers: adminToken ? { "x-admin-token": adminToken } : undefined,
  });
  if (error) {
    // functions-js reports every non-2xx as the same generic "returned a non-2xx status code".
    // The real reason (e.g. "forbidden — admin only") is in the JSON body on error.context (a
    // Response). Read it so callers surface the actual cause instead of the opaque default.
    const { message, status } = await extractFunctionError(error);
    throw new FunctionError(message, status);
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: unknown }).error) {
    throw new FunctionError(String((data as { error: unknown }).error));
  }
  return data as T;
}

/** Pull the real message + status out of a functions-js error, whose `context` is the raw Response. */
async function extractFunctionError(error: unknown): Promise<{ message: string; status?: number }> {
  const ctx = (error as { context?: unknown }).context;
  const fallback = (error as { message?: string }).message ?? "request failed";
  if (ctx && typeof (ctx as Response).text === "function") {
    const res = ctx as Response;
    try {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      const msg = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : text;
      return { message: msg || fallback, status: res.status };
    } catch {
      return { message: fallback, status: res.status };
    }
  }
  return { message: fallback };
}
