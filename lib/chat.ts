// Pure helpers for the support assistant: request validation, demo replies, rate limiting.
// Kept free of SDK/network code so they can be unit-tested (lib/chat.test.ts).

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const MAX_MESSAGES = 20;
export const MAX_CHARS = 1000;
export const MAX_BODY_BYTES = 64_000; // a full valid chat (20 x 1000 chars) is far smaller

/** Reads a request body as text, giving up (null) past maxBytes so oversized uploads can't exhaust memory. */
export async function readBodyLimited(req: Request, maxBytes = MAX_BODY_BYTES): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    size += r.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(r.value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Returns the conversation if it is well-formed, otherwise null. Never trust the client. */
export function parseChatRequest(body: unknown): ChatMessage[] | null {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;

  const clean: ChatMessage[] = [];
  for (const [i, m] of messages.entries()) {
    const { role, content } = (m ?? {}) as Record<string, unknown>;
    const expected: ChatMessage["role"] = i % 2 === 0 ? "user" : "assistant"; // must alternate, starting with the user
    if (role !== expected || typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > MAX_CHARS) return null;
    clean.push({ role: expected, content: text });
  }
  return clean.at(-1)?.role === "user" ? clean : null;
}

const DEMO_ANSWERS: [RegExp, string][] = [
  [/lost|stolen|fraud|freeze|lock/i,
    "Sorry to hear that. You can freeze your card instantly from **My Banks → Cards → Freeze**. If you see charges you don't recognize, call the 24/7 fraud line on the back of your card. We will never ask for your password or full card number."],
  [/transfer|send|pay|zelle|wire/i,
    "To move money, open **Transfer Funds** in the sidebar, pick the source account, enter the recipient's email or account, and confirm. Transfers between your own Horizon accounts are instant; external transfers take 1–3 business days."],
  [/balance|how much|available/i,
    "Your total balance is on the **Home** page, and each account's current and available balance is under **My Banks**. Available balance excludes pending transactions."],
  [/fee|charge|cost|overdraft/i,
    "Horizon has no monthly maintenance fees and no fees for transfers between your own accounts. Check your account agreement for any out-of-network ATM or wire fees."],
  [/password|login|sign in|log in|2fa|security/i,
    "You can reset your password from the **Sign in** page with “Forgot password”. For your safety, never share your password or one-time codes with anyone, including this assistant."],
  [/\b(hi|hello|hey)\b/i,
    "Hi! I'm the Horizon Assistant. Ask me about balances, transfers, cards, or fees."],
];

/** Free, offline answers used when no ANTHROPIC_API_KEY is configured. */
export function demoReply(question: string): string {
  const hit = DEMO_ANSWERS.find(([pattern]) => pattern.test(question));
  return hit?.[1] ??
    "I can help with balances, transfers, lost or stolen cards, fees, and signing in. Could you rephrase your question around one of those? For anything account-specific, please contact support.";
}

// ponytail: in-memory limiter, resets on restart and isn't shared across server instances;
// move to a shared store (e.g. Redis, Vercel Firewall rate limiting) before production.
const hits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;

/**
 * Sliding-window limits across several buckets (e.g. per-IP and global). Checks every bucket first and
 * records the request only if all allow it, so rejected requests never use up anyone's budget.
 * Memory stays bounded: least-recently-seen keys are evicted past MAX_TRACKED_KEYS.
 */
export function isRateLimited(buckets: [key: string, limit: number][], windowMs = 10 * 60_000, now = Date.now()) {
  const windows = buckets.map(([key]) => (hits.get(key) ?? []).filter((t) => now - t < windowMs));
  if (buckets.some(([, limit], i) => windows[i].length >= limit)) return true;

  buckets.forEach(([key], i) => {
    hits.delete(key); // re-insert so Map order tracks recency
    hits.set(key, [...windows[i], now]);
  });
  while (hits.size > MAX_TRACKED_KEYS) hits.delete(hits.keys().next().value!);
  return false;
}

export const trackedKeyCount = () => hits.size;
