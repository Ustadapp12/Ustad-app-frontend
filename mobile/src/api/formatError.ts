/** Parse FastAPI / API error bodies into user-facing text. */
export function formatApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') {
    return fallback;
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
  return formatApiError(body, `Request failed (${status})`);
}

