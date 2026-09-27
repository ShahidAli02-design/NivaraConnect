// Deterministic "initials on a colored circle" avatar — like Gmail/Slack use
// for accounts without an uploaded photo. Generated offline as an inline SVG
// data URI, so every person gets their OWN look instead of a random stock
// photo of a stranger (which made every new account look identical/fake).

const PALETTE = [
  '#D97706', // amber-600
  '#0EA5E9', // sky-500
  '#059669', // emerald-600
  '#E11D48', // rose-600
  '#7C3AED', // violet-600
  '#DB2777', // pink-600
  '#0D9488', // teal-600
  '#EA580C', // orange-600
  '#4F46E5', // indigo-600
  '#65A30D', // lime-600
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'shri', 'smt']);

function getInitials(name: string): string {
  // Strip punctuation (so "Prof." doesn't leave a stray "." as its own word)
  // and any "(Head Guard)"-style suffix before splitting into words and
  // dropping honorific titles.
  const words = String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !TITLES.has(w.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function generateAvatar(name: string): string {
  const initials = getInitials(name);
  const color = PALETTE[hashString(String(name || '')) % PALETTE.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">` +
    `<rect width="150" height="150" rx="75" fill="${color}"/>` +
    `<text x="75" y="90" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" ` +
    `fill="#ffffff" text-anchor="middle">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
