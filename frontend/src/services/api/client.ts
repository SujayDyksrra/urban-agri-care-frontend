export type ApiErrorCode = 'configuration' | 'timeout' | 'network' | 'missing' | 'image' | 'unavailable' | 'server' | 'http' | 'non-json' | 'format' | 'cancelled';
export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message: string, public status?: number) { super(message); }
}

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
/** `live` sends scans and guidance requests to the backend; anything else keeps the on-device demo data. */
export const guidanceMode = process.env.EXPO_PUBLIC_GUIDANCE_MODE === 'live' ? 'live' : 'mock';
export const apiMode = guidanceMode;
export const timeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) > 0 ? Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) : 12000;

/** FastAPI puts the reason in `detail`. Returns it when the body is that shape. */
export function errorDetail(raw: string): string | undefined {
  try {
    const detail = (JSON.parse(raw) as { detail?: unknown }).detail;
    return typeof detail === 'string' && detail.trim() ? detail.trim() : undefined;
  } catch { return undefined; }
}

/** Maps a failed backend status to an error code. 400/413/415/422 are about the uploaded image. */
export function errorForStatus(status: number, detail?: string): ApiError {
  if (status === 404) return new ApiError('missing', detail ?? 'No matching record was found.', 404);
  if ([400, 413, 415, 422].includes(status)) return new ApiError('image', detail ?? 'The photo could not be analysed.', status);
  if (status === 503) return new ApiError('unavailable', detail ?? 'The service is not available right now.', 503);
  return new ApiError(status >= 500 ? 'server' : 'http', detail ?? `Backend returned HTTP ${status}.`, status);
}

export async function requestJson(path: string, init: RequestInit = {}, signal?: AbortSignal, timeout = timeoutMs): Promise<unknown> {
  if (!apiBaseUrl) throw new ApiError('configuration', 'Set EXPO_PUBLIC_API_BASE_URL to a phone-reachable backend URL.');
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { ...init, signal: controller.signal });
    const raw = await response.text();
    if (!response.ok) throw errorForStatus(response.status, errorDetail(raw));
    try { return JSON.parse(raw); } catch { throw new ApiError('non-json', 'Backend returned a non-JSON response.'); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError('timeout', 'The request timed out.');
    if (signal?.aborted) throw new ApiError('cancelled', 'Request cancelled.');
    throw new ApiError('network', 'Cannot reach the backend. Check the phone and server network.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
