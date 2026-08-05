/**
 * Friendly, human-readable error messages for the auth flow.
 *
 * Errors surfaced by the ORPC client are `ORPCError` instances shaped like
 * `{ code, status, message }`. Known, descriptive messages from the server
 * (e.g. "No account found…", "Incorrect password…") pass through untouched so
 * they can be shown inline next to the offending field. Everything else —
 * unexpected "Internal server error", network failures, generic validation
 * rejections — is mapped to a clear, descriptive message the user can act on.
 */

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
};

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as ErrorLike).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return String(err ?? "Unknown error");
}

export function getErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as ErrorLike).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/** True when the failure happened while talking to the server (fetch threw). */
function isNetworkFailure(err: unknown): boolean {
  const cause = (err as ErrorLike)?.cause;
  if (cause instanceof TypeError) return true;
  if (cause && typeof cause === "object" && (cause as { name?: unknown }).name === "TypeError") {
    return true;
  }
  return getErrorMessage(err).toLowerCase().includes("failed to fetch");
}

const FRIENDLY_MESSAGES = {
  connection:
    "We couldn't reach the server. Please check your internet connection and try again.",
  server:
    "Something went wrong on our end. Please try again in a moment. If the problem keeps happening, refresh the page and try again.",
  input: "Some of the information you entered looks incorrect. Please review it and try again.",
  timeout: "The server took too long to respond. Please try again.",
  rateLimited: "Too many attempts. Please wait a moment and try again.",
} as const;

/** Messages the server already sends in plain, user-friendly language. */
const KNOWN_SERVER_MESSAGES = [
  "No account found",
  "Incorrect password",
  "already registered",
  "Current password is incorrect",
];

/**
 * Returns a clear, descriptive message for an auth-flow error, never raw
 * framework text like "Internal server error".
 */
export function getAuthErrorMessage(err: unknown): string {
  const message = getErrorMessage(err);
  const code = getErrorCode(err);

  if (KNOWN_SERVER_MESSAGES.some((known) => message.includes(known))) {
    return message;
  }

  switch (code) {
    case "BAD_REQUEST":
    case "UNPROCESSABLE_CONTENT":
    case "PRECONDITION_FAILED":
      return FRIENDLY_MESSAGES.input;
    case "TIMEOUT":
      return FRIENDLY_MESSAGES.timeout;
    case "TOO_MANY_REQUESTS":
      return FRIENDLY_MESSAGES.rateLimited;
    case "INTERNAL_SERVER_ERROR":
    case "NOT_IMPLEMENTED":
    case "BAD_GATEWAY":
    case "SERVICE_UNAVAILABLE":
    case "GATEWAY_TIMEOUT":
      return isNetworkFailure(err) ? FRIENDLY_MESSAGES.connection : FRIENDLY_MESSAGES.server;
    default:
      // Unknown code or plain Error — treat as an unexpected failure.
      return isNetworkFailure(err) ? FRIENDLY_MESSAGES.connection : FRIENDLY_MESSAGES.server;
  }
}
