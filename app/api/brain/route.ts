import Anthropic from '@anthropic-ai/sdk';
import { AnthropicStream, StreamingTextResponse } from "ai";
import { systemContent } from "../../lib/constants";

// Optional, but recommended: run on the edge runtime.
// See https://vercel.com/docs/concepts/functions/edge-functions
export const runtime = "edge";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();
  const start = Date.now();

  // Request the Claude API for the response based on the prompt
  try {
    const response = await anthropic.messages.stream({
      messages: messages,
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      system: systemContent // Claude requires the system prompt here
    });

    const stream = AnthropicStream(response);

    return new StreamingTextResponse(stream, {
      headers: {
        "X-LLM-Start": `${start}`,
        "X-LLM-Response": `${Date.now()}`,
      },
    });
  } catch (error) {
    console.error("test", error);
  }
}
