/** Parse FastAPI / API error bodies into user-facing text. */
export function formatApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') {
    return fallback;
  }
  // Structured `AppError` responses: { success: false, error: { code, message } }
  const structuredError = (body as { error?: unknown }).error;
  if (structuredError && typeof structuredError === 'object' && typeof (structuredError as { message?: unknown }).message === 'string') {
    return (structuredError as { message: string }).message;
  }
  // Plain-code shape used by a few simple POST endpoints (waitlist, feedback):
  // { error: "invalid_email" } — turn the snake_case code into a sentence
  // rather than surfacing it verbatim or falling through to a generic
  // "Request failed (400)".
  if (typeof structuredError === 'string' && structuredError) {
    const words = structuredError.replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1) + '.';
  }
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return String(item);
      })
      .join('\n');
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: string }).message);
  }
  return fallback;
}

export function messageForStatus(status: number, body: unknown): string {
  if (status === 409) {
    return formatApiError(body, 'You already have a lesson in progress. Finish or leave it first.');
  }
  if (status === 401) {
    return formatApiError(body, 'Session expired. Please log in again.');
  }
  if (status === 404) {
    return formatApiError(body, 'Content not found for this surah or lesson.');
  }
  if (status === 429) {
    return formatApiError(body, 'Too many attempts, please wait a bit and try again.');
  }
  return formatApiError(body, `Request failed (${status})`);
}

