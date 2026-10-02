import { EnvVariable } from './types';

export type DetectedKind = 'env' | 'code' | 'json' | 'url' | 'markdown' | 'text';

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'json'
  | 'bash'
  | 'sql'
  | 'html'
  | 'css'
  | 'markdown'
  | 'yaml'
  | 'plaintext';

export interface CodeDetectionResult {
  kind: DetectedKind;
  language: SupportedLanguage;
  displayName: string;
  confidence: number;
  urls?: string[];
  envVars?: EnvVariable[];
  secretCount?: number;
  isJsonValid?: boolean;
}

export function extractUrls(text: string): string[] {
  if (!text) return [];
  // Match standard http/https links
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`[\]]+)/gi;
  const matches = text.match(urlRegex) || [];

  // Clean trailing punctuation frequently attached when pasting
  const cleaned = matches.map((u) => u.replace(/[.,;:!?)>]+$/, '').trim());

  // Deduplicate while preserving order
  return Array.from(
    new Set(cleaned.filter((u) => u.startsWith('http://') || u.startsWith('https://')))
  );
}

const SECRET_KEY_PATTERNS = [
  /SECRET/i,
  /KEY/i,
  /TOKEN/i,
  /PASSWORD/i,
  /PASSWD/i,
  /PWD/i,
  /AUTH/i,
  /CREDENTIAL/i,
  /PRIVATE/i,
  /DATABASE_URL/i,
  /MONGO_URI/i,
  /REDIS_URL/i,
  /API_KEY/i,
  /ACCESS_KEY/i,
  /SIGNING_KEY/i,
  /HASH/i,
];

export function parseEnvContent(text: string): { envVars: EnvVariable[]; secretCount: number } {
  const lines = text.split('\n');
  const envVars: EnvVariable[] = [];
  let secretCount = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Handle comments
    if (trimmed.startsWith('#')) {
      envVars.push({
        key: '',
        value: '',
        isSecret: false,
        comment: trimmed,
        rawLine,
      });
      continue;
    }

    // Handle KEY=VALUE or export KEY=VALUE
    const cleanLine = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eqIdx = cleanLine.indexOf('=');

    if (eqIdx > 0) {
      const key = cleanLine.slice(0, eqIdx).trim();
      let value = cleanLine.slice(eqIdx + 1).trim();

      // Remove surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Check if key implies a secret
      const isSecret = SECRET_KEY_PATTERNS.some((pat) => pat.test(key));
      if (isSecret) secretCount++;

      envVars.push({
        key,
        value,
        isSecret,
        rawLine,
      });
    }
  }

  return { envVars, secretCount };
}

export function detectContent(text: string): CodeDetectionResult {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      kind: 'text',
      language: 'plaintext',
      displayName: 'Plain Text',
      confidence: 1,
    };
  }

  // 1. URL Extraction & Multi-URL Check
  const foundUrls = extractUrls(trimmed);
  const nonBlankLines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const areAllLinesUrls =
    nonBlankLines.length > 0 &&
    nonBlankLines.every((l) => /^https?:\/\/[^\s]+$/.test(l));

  if (areAllLinesUrls && foundUrls.length > 0) {
    return {
      kind: 'url',
      language: 'plaintext',
      displayName: foundUrls.length === 1 ? 'Link / URL' : `${foundUrls.length} Links`,
      confidence: 1,
      urls: foundUrls,
    };
  }

  // 2. Check for .env file (KEY=VALUE pattern with multiple uppercase/identifier keys)
  const lines = trimmed.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const envLineMatches = lines.filter((l) => {
    const clean = l.startsWith('export ') ? l.slice(7).trim() : l;
    return /^[A-Za-z0-9_.-]+\s*=\s*.*$/.test(clean);
  });

  // If at least 2 lines and >= 60% match KEY=VALUE, or 1 strong line like API_KEY=..., detect as .env
  const isEnv =
    (lines.length >= 2 && envLineMatches.length / lines.length >= 0.6) ||
    (lines.length === 1 && envLineMatches.length === 1 && /^[A-Z0-9_]{3,}\s*=/.test(lines[0]));

  if (isEnv) {
    const { envVars, secretCount } = parseEnvContent(text);
    return {
      kind: 'env',
      language: 'bash',
      displayName: '.env Config',
      confidence: 0.95,
      envVars,
      secretCount,
    };
  }

  // 3. JSON check
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      JSON.parse(trimmed);
      return {
        kind: 'json',
        language: 'json',
        displayName: 'JSON Data',
        confidence: 1,
        isJsonValid: true,
      };
    } catch {
      // Possible malformed JSON or object snippet
    }
  }

  // 4. SQL check
  if (/\b(SELECT\s+[\s\S]+\s+FROM|INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+TABLE|UPDATE\s+[\s\S]+\s+SET|DELETE\s+FROM)\b/i.test(trimmed)) {
    return {
      kind: 'code',
      language: 'sql',
      displayName: 'SQL Query',
      confidence: 0.9,
    };
  }

  // 5. Python check
  if (
    /\b(def\s+[a-zA-Z_]\w*\s*\(|class\s+[a-zA-Z_]\w*(\s*\(|\s*:)|import\s+[\w_]+|from\s+[\w_.]+\s+import|if\s+__name__\s*==\s*['"]__main__['"]|elif\s+|print\(|async\s+def\s+)/m.test(trimmed)
  ) {
    return {
      kind: 'code',
      language: 'python',
      displayName: 'Python',
      confidence: 0.9,
    };
  }

  // 6. HTML / XML check
  if (/<!DOCTYPE\s+html|<html[\s>]|<div[\s>]|<script[\s>]|<\/[a-z]+>/i.test(trimmed)) {
    return {
      kind: 'code',
      language: 'html',
      displayName: 'HTML',
      confidence: 0.9,
    };
  }

  // 7. CSS check
  if (/[a-zA-Z0-9_.-]+\s*\{\s*[\w-]+\s*:\s*[^}]+\}/m.test(trimmed)) {
    return {
      kind: 'code',
      language: 'css',
      displayName: 'CSS',
      confidence: 0.85,
    };
  }

  // 8. Bash / Shell check
  if (
    /^(#!\/bin\/(bash|sh|zsh)|curl\s+-|npm\s+(i|install|run|test)|pnpm\s+|yarn\s+|git\s+(commit|push|pull|clone|checkout)|docker\s+(run|build|compose)|sudo\s+|chmod\s+)/m.test(
      trimmed
    )
  ) {
    return {
      kind: 'code',
      language: 'bash',
      displayName: 'Shell / Bash',
      confidence: 0.9,
    };
  }

  // 9. TypeScript / JavaScript check
  if (
    /\b(import\s+.*\s+from\s+['"]|export\s+(default|const|let|function|interface|type|class)|interface\s+[A-Z]\w*|type\s+[A-Z]\w*\s*=|console\.(log|error|warn)|const\s+\w+\s*:\s*[A-Z]\w*|const\s+\[\w+,\s*set\w+\]\s*=|const\s+\w+\s*=\s*(\(.*\)|async\s*\(.*\))\s*=>|function\s+\w+\s*\(|async\s+function)/m.test(
      trimmed
    )
  ) {
    const isTs = /interface\s+[A-Z]|type\s+[A-Z]\w*\s*=|:\s*(string|number|boolean|any|void|React\.)/m.test(trimmed);
    return {
      kind: 'code',
      language: isTs ? 'typescript' : 'javascript',
      displayName: isTs ? 'TypeScript' : 'JavaScript',
      confidence: 0.9,
    };
  }

  // 10. Markdown check
  if (/^#{1,6}\s+.+|\*{1,2}.+\*{1,2}|\[.+\]\(https?:\/\/.+\)|^```[a-z]*\n[\s\S]*?\n```/m.test(trimmed)) {
    return {
      kind: 'markdown',
      language: 'markdown',
      displayName: 'Markdown',
      confidence: 0.8,
    };
  }

  // Fallback
  return {
    kind: foundUrls.length > 0 ? 'url' : 'text',
    language: 'plaintext',
    displayName:
      foundUrls.length > 0
        ? foundUrls.length === 1
          ? 'Link / URL'
          : `${foundUrls.length} Links`
        : 'Plain Text',
    confidence: 0.5,
    urls: foundUrls,
  };
}

export function formatJsonText(text: string): { formatted: string; success: boolean } {
  try {
    const parsed = JSON.parse(text);
    return { formatted: JSON.stringify(parsed, null, 2), success: true };
  } catch {
    return { formatted: text, success: false };
  }
}
