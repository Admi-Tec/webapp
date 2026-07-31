// Pseudonym rules shared by the profile update schema (updateFullProfile in
// profile.functions.ts) and its tests — no Supabase/server imports here, so
// the format/blocklist checks can be unit tested directly (uniqueness still
// requires a DB round-trip and stays in profile.functions.ts). See
// pseudonym.test.ts.

export const PSEUDONYM_MIN_LENGTH = 3;
export const PSEUDONYM_MAX_LENGTH = 30;
export const PSEUDONYM_FORMAT_REGEX = /^[a-zA-Z0-9_-]+$/;

export function isValidPseudonymFormat(value: string): boolean {
  return (
    value.length >= PSEUDONYM_MIN_LENGTH &&
    value.length <= PSEUDONYM_MAX_LENGTH &&
    PSEUDONYM_FORMAT_REGEX.test(value)
  );
}

// Blocked words for pseudonyms: covers common Spanish/English vulgarity and slurs.
// Checked server-side (in addition to the format regex) so it can't be bypassed from the client.
export const PSEUDONYM_BLOCKLIST = [
  "puta",
  "puto",
  "putita",
  "putito",
  "mierda",
  "pendejo",
  "pendeja",
  "cabron",
  "cabrona",
  "verga",
  "chinga",
  "chingar",
  "carajo",
  "culero",
  "culera",
  "maricon",
  "marica",
  "gilipollas",
  "hijueputa",
  "hdp",
  "conchatumadre",
  "conchasumadre",
  "conchesumadre",
  "huevon",
  "huevona",
  "malparido",
  "malparida",
  "estupido",
  "estupida",
  "idiota",
  "imbecil",
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "whore",
  "slut",
  "cunt",
  "nigger",
  "faggot",
  "nazi",
  "hitler",
];

export function containsBlockedWord(value: string): boolean {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return PSEUDONYM_BLOCKLIST.some((word) => normalized.includes(word));
}
