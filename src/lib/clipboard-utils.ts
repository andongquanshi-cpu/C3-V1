export async function copyTextToClipboard(text: string) {
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

export function buildContentCopyText(input: {
  selectedTitle: string;
  selectedCoverText?: string;
  content: string;
  tags?: string[];
  riskReminder?: string;
  interactionGuide?: string;
}) {
  const parts = [
    input.selectedTitle,
    "",
    input.content,
    "",
    input.tags?.length ? input.tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ") : "",
    input.interactionGuide || "",
  ];
  return parts.filter((line, index, arr) => line !== "" || (index > 0 && arr[index - 1] !== "")).join("\n").trim();
}
