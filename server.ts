import { Hono } from "https://deno.land/x/hono@v3.11.4/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { env } from "./env.ts";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

const app = new Hono();

const jsonStructure = `{
  business_name: string,
  business_type: string,
  products: Array<{
    name: string,
    description: string,
    price: number,
  }>
}`;

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Headers", "*");
  c.header("Access-Control-Allow-Methods", "*");
  await next();
});

app.options("*", (c) => c.body(null, 204));

app.post("/analyze", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  if (!file) return c.json({ error: "Missing file" }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const base64Image = encodeBase64(new Uint8Array(arrayBuffer));

  const message = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: file.type as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64Image,
            },
          },
          {
            type: "text",
            text:
              `return the content of this image in this JSON format (without a code-fence): ${jsonStructure}.`,
          },
        ],
      },
    ],
  });

  const responseText = (message.content[0] as { text: string }).text;
  return c.text(responseText);
});

Deno.serve(app.fetch);
