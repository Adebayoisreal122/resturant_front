// Lagos calendar days (UTC+1, no daylight saving), matching the reports API.
export const lagosToday = () => new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10);

export const lagosDaysAgo = (n: number) => new Date(Date.now() + 3600 * 1000 - n * 86400000).toISOString().slice(0, 10);

export const shortDay = (iso: string) => new Date(iso + "T12:00:00+01:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" });
