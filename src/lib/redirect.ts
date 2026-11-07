// Only allow redirects to pages on this site (stops "?next=https://evil.com")
export const safeNext = (next: string | null | undefined, fallback = "/") =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
