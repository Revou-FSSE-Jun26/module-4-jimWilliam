/** Typed error thrown by apiClient for every non-2xx response (R21.5). */
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

/** User-facing message for a status code; the server message wins when it is specific. */
export function messageForStatus(statusCode: number, serverMessage?: string): string {
  if (serverMessage && statusCode >= 400 && statusCode < 500) return serverMessage;
  switch (statusCode) {
    case 0:
      return "Can't reach RevoTask. Check your connection and try again.";
    case 400:
      return "Some details are missing or invalid.";
    case 401:
      return "Your session ended. Log in again to continue.";
    case 403:
      return "You don't have access to that.";
    case 404:
      return "That item no longer exists.";
    case 409:
      return "That conflicts with something that already exists.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    default:
      return statusCode >= 500 ? "Something went wrong on our side. Try again in a moment." : "Request failed.";
  }
}
