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

function normalizeImageApiUrl(apiUrl: string, format: "volcengine" | "openai") {
  let trimmed = apiUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return format === "volcengine"
      ? "https://ark.cn-beijing.volces.com/api/v3/images/generations"
      : "https://api.openai.com/v1/images/generations";
  }

  if (format === "volcengine") {
    // 常见误配：/v1/images/generations（OpenAI 风格）→ 方舟应为 /api/v3/images/generations
    trimmed = trimmed.replace(
      /^(https?:\/\/ark\.cn-beijing\.volces\.com)\/v1\/images\/generations$/i,
      "$1/api/v3/images/generations",
    );
    trimmed = trimmed.replace(
      /^(https?:\/\/ark\.cn-beijing\.volces\.com)\/v1$/i,
      "$1/api/v3",
    );
  }

  if (trimmed.endsWith("/images/generations")) return trimmed;
  if (format === "volcengine" && /\/api\/v3$/i.test(trimmed)) {
    return `${trimmed}/images/generations`;
  }
  if (format === "openai" && /\/v1$/i.test(trimmed)) {
    return `${trimmed}/images/generations`;
  }
  return trimmed;
}

export function getImageConfig(): ServerImageConfig {
  const format = (process.env.IMAGE_API_FORMAT || "volcengine") as "volcengine" | "openai";
  const defaultUrl =
    format === "volcengine"
      ? "https://ark.cn-beijing.volces.com/api/v3/images/generations"
      : "https://api.openai.com/v1/images/generations";
  return {
    apiUrl: normalizeImageApiUrl(process.env.IMAGE_API_URL || defaultUrl, format),
    apiKey: process.env.IMAGE_API_KEY || "",
    model:
      process.env.IMAGE_MODEL ||
      (format === "volcengine" ? "doubao-seedream-4-5-251128" : "dall-e-3"),
    format,
  };
}

export function getEastMoneyApiKey() {
  return (process.env.EASTMONEY_API_KEY || process.env.EASTMONEY_APIKEY || process.env.MX_APIKEY || "").trim();
}

/** @deprecated 热点搜索已切换至东方财富，保留别名避免旧代码报错 */
export function getHotspotApiKey() {
  return getEastMoneyApiKey();
}

export function getServerApiStatus() {
  const text = getTextLlmConfig();
  const image = getImageConfig();
  const hotspot = getHotspotApiKey();
  return {
    text: Boolean(text.apiKey && text.apiUrl && text.model),
    image: Boolean(image.apiKey),
    imageModel: image.model,
    imageFormat: image.format,
    imageApiUrl: image.apiUrl,
    hotspot: Boolean(hotspot),
    ready: Boolean(text.apiKey && text.apiUrl && text.model),
    model: text.model,
  };
}
