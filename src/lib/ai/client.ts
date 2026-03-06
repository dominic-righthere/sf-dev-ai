import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";

type Client = Anthropic | AnthropicBedrock;

let client: Client | null = null;

const isBedrock = process.env.AI_PROVIDER === "bedrock";

export function getAnthropicClient(): Client {
  if (!client) {
    if (isBedrock) {
      client = new AnthropicBedrock({
        awsRegion: process.env.AWS_REGION || "us-east-1",
      });
    } else {
      client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }
  return client;
}

export const MODEL =
  process.env.BEDROCK_MODEL_ID ||
  (isBedrock
    ? "us.anthropic.claude-sonnet-4-20250514-v1:0"
    : "claude-sonnet-4-20250514");

export const MAX_TOKENS = 8192;
