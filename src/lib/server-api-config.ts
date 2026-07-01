export interface ServerTextLlmConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface ServerImageConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  format: "volcengine" | "openai";
}

export function getTextLlmConfig(): ServerTextLlmConfig {
  return {
    apiUrl: process.env.LLM_API_URL || "https://api.deepseek.com/v1/chat/completions",
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || "deepseek-chat",
  };
}

export function getImageConfig(): ServerImageConfig {
  const format = (process.env.IMAGE_API_FORMAT || "volcengine") as "volcengine" | "openai";
  return {
    apiUrl:
      process.env.IMAGE_API_URL ||
      (format === "volcengine"
        ? "https://ark.cn-beijing.volces.com/api/v3/images/generations"
        : "https://api.openai.com/v1/images/generations"),
    apiKey: process.env.IMAGE_API_KEY || "",
    model:
      process.env.IMAGE_MODEL ||
      (format === "volcengine" ? "doubao-seedream-3.0-t2i" : "dall-e-3"),
    format,
  };
}

export function getHotspotApiKey() {
  return process.env.TAVILY_API_KEY || "";
}

export function getServerApiStatus() {
  const text = getTextLlmConfig();
  const image = getImageConfig();
  const hotspot = getHotspotApiKey();
  return {
    text: Boolean(text.apiKey && text.apiUrl && text.model),
    image: Boolean(image.apiKey),
    hotspot: Boolean(hotspot),
    ready: Boolean(text.apiKey && text.apiUrl && text.model),
    model: text.model,
  };
}
