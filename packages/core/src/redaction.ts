const SECRET_PATTERNS = [
  /(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/gi,
  /(cookie\s*[:=])[^\r\n]+/gi,
  /((?:api[_-]?key|secret|token|password)\s*[:=]\s*)[^\s,;]+/gi,
];

export function redactText(input: string): string {
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, "$1[REDACTED]"), input);
}
