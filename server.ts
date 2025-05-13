import { Hono } from "npm:hono";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { env } from "./env.ts";
import { z } from "npm:zod";
import Anthropic from "npm:@anthropic-ai/sdk";

const apiResponseSchema = z.object({
  business_name: z.string(),
  business_type: z.string(),
  products: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
    }),
  ),
});
export type APIResponse = z.infer<typeof apiResponseSchema>;

const imageTypesSchema = z.union([
  z.literal("image/jpeg"),
  z.literal("image/png"),
  z.literal("image/gif"),
  z.literal("image/webp"),
]);
export type ImageTypes = z.infer<typeof imageTypesSchema>;

const pdfType = z.literal("application/pdf");
export type PDFType = z.infer<typeof pdfType>;

const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

const app = new Hono();

const jsonStructure = `{
  business_name: string,
  business_type: string,
  products: Array<{
    name: string,
    price: string, // include currency symbol. include the subunit (e.g. cents), even if it's 0
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

  const responseText = await (() => {
    if (imageTypesSchema.safeParse(file.type).success) return handleImage(file);
    if (pdfType.safeParse(file.type).success) return handlePDF(file);
  })();

  if (!responseText) return c.json({ error: "Unsupported file type" }, 400);

  try {
    const parsedResponse = z.string()
      .transform((str) => JSON.parse(str))
      .pipe(apiResponseSchema)
      .parse(responseText);

    return c.json(parsedResponse, 200);
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    console.log("Error parsing claude response:", error);
    return c.json({ error: "Invalid response" }, 500);
  }
});

Deno.serve(app.fetch);

async function handleImage(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64Image = encodeBase64(new Uint8Array(arrayBuffer));

  const message = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: file.type as ImageTypes,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `return the content of this image in this JSON format (without a code-fence): ${jsonStructure}.`,
          },
        ],
      },
    ],
  });

  const responseText = (message.content[0] as { text: string }).text;
  return responseText;
}

async function handlePDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64PDF = encodeBase64(new Uint8Array(arrayBuffer));

  const message = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: file.type as PDFType,
              data: base64PDF,
            },
          },
          {
            type: "text",
            text: `return the content of this PDF in this JSON format (without a code-fence): ${jsonStructure}.`,
          },
        ],
      },
    ],
  });

  const responseText = (message.content[0] as { text: string }).text;
  return responseText;
}
