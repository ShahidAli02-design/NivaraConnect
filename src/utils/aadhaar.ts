const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Real Aadhaar numbers: 12 digits, first digit 2-9, last digit is a Verhoeff check digit.
// This validates structure only — it cannot confirm the number is actually issued (needs UIDAI).
export function isValidAadhaar(value: string): boolean {
  const num = String(value || '').trim();
  if (!/^[2-9]\d{11}$/.test(num)) return false;

  // The Verhoeff checksum only guarantees catching single-digit and adjacent-
  // transposition errors — it does NOT guarantee rejecting a placeholder like
  // "999999999999" or "234567890123" (some of these pass the checksum purely
  // by coincidence). Reject obviously-fake patterns outright before even
  // running the checksum, since a real UIDAI-issued number is never one of
  // these.
  if (/^(\d)\1{11}$/.test(num)) return false; // all 12 digits identical
  if (isSequential(num)) return false;

  let c = 0;
  const digits = num.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = D[c][P[i % 8][digits[i]]];
  }
  return c === 0;
}

// True for 12 digits that are a run of consecutive numbers, ascending or
// descending, wrapping 9 -> 0 (e.g. "234567890123" or "987654321098").
function isSequential(num: string): boolean {
  const digits = num.split('').map(Number);
  const ascendingRun = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 1) % 10);
  const descendingRun = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 9) % 10);
  return ascendingRun || descendingRun;
}

export const AADHAAR_ERROR =
  'Invalid Aadhaar number. It must be 12 digits, start with 2-9, and pass the Aadhaar checksum.';
