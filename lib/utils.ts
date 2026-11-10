import { type ClassValue, clsx } from "clsx";
import qs from "query-string";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: Date | string) {
  const d = new Date(date);
  const format = (options: Intl.DateTimeFormatOptions) => d.toLocaleString("en-US", options);
  const time = { hour: "numeric", minute: "numeric", hour12: true } as const;

  return {
    dateTime: format({ weekday: "short", month: "short", day: "numeric", ...time }), // Mon, Oct 25, 8:30 AM
    dateDay: format({ weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" }), // Mon, 10/25/2023
    dateOnly: format({ month: "short", year: "numeric", day: "numeric" }), // Oct 25, 2023
    timeOnly: format(time), // 8:30 AM
  };
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatAmount(amount: number): string {
  return usd.format(amount);
}

/** Deep-copies a value into plain JSON (e.g. to pass server data to client components). */
export function parseStringify<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function removeSpecialCharacters(value: string) {
  return value.replace(/[^\w\s]/g, "");
}

interface UrlQueryParams {
  params: string;
  key: string;
  value: string;
}

/** Client-only: returns the current path with `key` set to `value` in the query string. */
export function formUrlQuery({ params, key, value }: UrlQueryParams) {
  return qs.stringifyUrl(
    { url: window.location.pathname, query: { ...qs.parse(params), [key]: value } },
    { skipNull: true }
  );
}

export function getAccountTypeColors(type: AccountTypes) {
  switch (type) {
    case "depository":
      return { bg: "bg-blue-25", lightBg: "bg-blue-100", title: "text-blue-900", subText: "text-blue-700" };
    case "credit":
      return { bg: "bg-success-25", lightBg: "bg-success-100", title: "text-success-900", subText: "text-success-700" };
    default:
      return { bg: "bg-green-50", lightBg: "bg-green-100", title: "text-green-900", subText: "text-green-700" };
  }
}

/** Counts transactions per category, most frequent first. */
export function countTransactionCategories(transactions: Transaction[] = []): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const { category } of transactions) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count, totalCount: transactions.length }))
    .sort((a, b) => b.count - a.count);
}

export function extractCustomerIdFromUrl(url: string) {
  return url.split("/").pop() ?? "";
}

// Base64 encoding to make IDs URL-friendly. This is NOT encryption: anyone can decode it,
// so never rely on it to hide or protect data.
export function encodeId(id: string) {
  return btoa(id);
}

export function decodeId(id: string) {
  return atob(id);
}

/** Transactions from the last two days are still "Processing". */
export function getTransactionStatus(date: Date) {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  return date > twoDaysAgo ? "Processing" : "Success";
}
