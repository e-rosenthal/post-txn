/** fetch() + JSON parsing that never leaves a caller hanging on a rejected promise with no message. */
export async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(`Couldn't reach ${url} — check your connection.`);
  }

  if (!res.ok) {
    let message = `Request to ${url} failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Response wasn't JSON (e.g. a server error page) — fall back to the generic message above.
    }
    throw new Error(message);
  }

  return res.json();
}
