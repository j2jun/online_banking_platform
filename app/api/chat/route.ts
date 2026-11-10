import Anthropic from "@anthropic-ai/sdk";

import { demoReply, isRateLimited, parseChatRequest } from "@/lib/chat";

// Kept byte-for-byte stable so it can be prompt-cached once it grows past the minimum cacheable size.
const SYSTEM_PROMPT = `You are Horizon Assistant, the customer support assistant for Horizon, a consumer banking app.

Help customers with: understanding balances, moving money (Transfer Funds page), cards (freezing lost or stolen cards from My Banks), fees, signing in, and navigating the app (Home, My Banks, Transaction History, Transfer Funds).

Rules:
- You cannot see or change the customer's accounts. Never claim to have done so.
- Never ask for passwords, one-time codes, full card numbers, PINs, or Social Security numbers. If a customer shares one, tell them not to and to contact support.
- For fraud, disputes, or anything account-specific, direct them to the 24/7 support line on the back of their card.
- Don't give investment, tax, or legal advice.
- Keep answers short: two to four sentences, plain language, Markdown bold for page names.`;

const client = new Anthropic();
const encoder = new TextEncoder();

const headers = (mode: "demo" | "ai") => ({
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Assistant-Mode": mode,
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isRateLimited(ip)) {
    return new Response("Too many messages. Please wait a few minutes and try again.", { status: 429 });
  }

  const messages = parseChatRequest(await req.json().catch(() => null));
  if (!messages) {
    return new Response("Invalid chat request.", { status: 400 });
  }

  // Free demo mode unless a key is configured, so the app never spends money by accident.
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(demoReply(messages.at(-1)!.content), { headers: headers("demo") });
  }

  const stream = client.beta.messages.stream(
    {
      model: "claude-opus-5-5",
      max_tokens: 4096,
      output_config: { effort: "low" }, // short support answers don't need deep reasoning
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if the model declines, the API retries on a fallback model
      system: SYSTEM_PROMPT,
      messages,
    },
    { signal: req.signal } // stop generating (and billing) when the customer closes the chat
  );

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("I can't help with that here. Please contact Horizon support."));
        }
      } catch (error) {
        if (!req.signal.aborted) {
          console.error("chat stream failed:", error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
          controller.enqueue(encoder.encode("\n\nThe assistant is unavailable right now. Please try again in a moment."));
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed because the client went away
        }
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: headers("ai") });
}
