// Amazon Bedrock helpers for Maple. Region: ca-central-1 (Canada Central).
// Secrets (set with `supabase secrets set`): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
// AWS_REGION (ca-central-1), MAPLE_SMALL_MODEL, MAPLE_LARGE_MODEL, MAPLE_EMBED_MODEL.
// Copy the exact model and inference-profile IDs from the Bedrock console: Model catalog.
import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
} from 'npm:@aws-sdk/client-bedrock-runtime@3'

const region = Deno.env.get('AWS_REGION') ?? 'ca-central-1'
export const bedrock = new BedrockRuntimeClient({ region })

export const MODELS = {
  // Cheap, fast model for most AI answers (a cross-Region inference profile from Canada).
  small: Deno.env.get('MAPLE_SMALL_MODEL') ?? '',
  // Stronger model, only when the small one says the question needs it.
  large: Deno.env.get('MAPLE_LARGE_MODEL') ?? '',
  // Multilingual embeddings (English and French) that run in Canada.
  embed: Deno.env.get('MAPLE_EMBED_MODEL') ?? 'amazon.titan-embed-text-v2:0',
}

/** 512-number "meaning fingerprint" of a short text, used to find matching library answers. */
export async function embed(text: string): Promise<number[]> {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: MODELS.embed,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: text.slice(0, 2000), dimensions: 512, normalize: true }),
  }))
  const out = JSON.parse(new TextDecoder().decode(res.body))
  return out.embedding as number[]
}

export type Usage = { input: number; output: number; cached: number }

/** One short chat call. maxTokens keeps answers (and output cost) small. */
export async function chat(
  modelId: string,
  system: string,
  user: string,
  maxTokens = 350,
): Promise<{ text: string; usage: Usage }> {
  const res = await bedrock.send(new ConverseCommand({
    modelId,
    // If the system text ever grows past the model's minimum cache size (about 1,000 tokens
    // or more, depending on the model), add { cachePoint: { type: 'default' } } after it,
    // so repeat calls pay the much cheaper cached rate. Today it is kept short instead.
    system: [{ text: system }],
    messages: [{ role: 'user', content: [{ text: user }] }],
    inferenceConfig: { maxTokens, temperature: 0.2 },
  }))
  const text = (res.output?.message?.content ?? [])
    .map((c) => ('text' in c ? c.text : ''))
    .join('')
    .trim()
  const u = res.usage
  return {
    text,
    usage: {
      input: u?.inputTokens ?? 0,
      output: u?.outputTokens ?? 0,
      cached: (u as { cacheReadInputTokens?: number } | undefined)?.cacheReadInputTokens ?? 0,
    },
  }
}
