import "jsr:@std/dotenv/load";
import { z } from "npm:zod";

export const env = z.object({
  CLAUDE_API_KEY: z.string(),
}).parse(Deno.env.toObject());
