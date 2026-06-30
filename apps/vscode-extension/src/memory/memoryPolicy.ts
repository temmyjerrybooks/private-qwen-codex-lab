import { isSecretPath, normalizeRelativePath } from "../tools/readFile";

const maxTextLength = 4000;
const secretValuePatterns = [
  /\b(sk-[a-zA-Z0-9_-]{16,})\b/g,
  /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|passwd|pwd)\s*[:=]\s*["']?[^"'\s,;]+/gi,
  /\b(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|HF_TOKEN|OPENAI_API_KEY|LITELLM_MASTER_KEY|BORGER_[A-Z0-9_]*KEY)\s*[:=]\s*["']?[^"'\s,;]+/g
];

const secretPathPatterns = [
  /(^|\s)(\.env(\.[a-z0-9_.-]+)?)(\s|$)/gi,
  /\b(id_rsa|id_dsa|id_ecdsa|id_ed25519|\.pem|\.p12|\.pfx|\.key)\b/gi,
  /\b(provider|remote-host|credential|credentials|token|tokens|secret|secrets)\S*\.(json|jsonl|txt|env|key|pem)\b/gi
];

const blockedMaterialPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /-----BEGIN OPENSSH PRIVATE KEY-----/i,
  /\b(private[_-]?key|client[_-]?secret|password|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s,;]{8,}/i
];

export interface MemoryPolicyResult {
  allowed: boolean;
  text: string;
  warnings: string[];
}

export function sanitizeMemoryText(value: string, maxLength = maxTextLength): MemoryPolicyResult {
  const warnings: string[] = [];
  let text = value.replace(/\0/g, "").trim();
  for (const pattern of blockedMaterialPatterns) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        text: "",
        warnings: ["Text appears to contain private keys, credentials, tokens, or passwords."]
      };
    }
  }

  for (const pattern of secretValuePatterns) {
    text = text.replace(pattern, (match) => {
      warnings.push(`Redacted secret-like value: ${match.slice(0, 24)}`);
      return "[REDACTED_SECRET]";
    });
  }

  for (const pattern of secretPathPatterns) {
    text = text.replace(pattern, (match) => {
      warnings.push(`Redacted secret-like path/name: ${match.trim()}`);
      return " [REDACTED_SECRET_PATH] ";
    });
  }

  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
    warnings.push(`Text was truncated to ${maxLength} characters.`);
  }

  return {
    allowed: true,
    text,
    warnings: [...new Set(warnings)]
  };
}

export function assertMemoryTextAllowed(value: string, label: string): string {
  const result = sanitizeMemoryText(value);
  if (!result.allowed) {
    throw new Error(`${label} is blocked by memory policy: ${result.warnings.join("; ")}`);
  }
  return result.text;
}

export function isMemorySafeRelativePath(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);
  if (normalized === ".env.example") {
    return true;
  }
  return !isSecretPath(normalized) && !normalized.startsWith(".borger/action-log") && !normalized.includes("secrets.local");
}

export function sanitizeMemoryList(values: string[], maxItems = 12, itemMaxLength = 260): string[] {
  return values
    .map((value) => sanitizeMemoryText(value, itemMaxLength))
    .filter((result) => result.allowed && result.text.length > 0)
    .map((result) => result.text)
    .slice(0, maxItems);
}

export function sanitizeTags(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")).filter(Boolean))].slice(0, 12);
}
