// Parser for the individual-exercise Markdown format used by the admin bulk
// importer (see plan-importar-ejercicios-markdown.md). This is the "contract"
// between what an admin (or, later, an automated PDF-to-exercises pipeline)
// produces and what the app can import — kept deliberately catalog-agnostic
// (no topic/subtopic/university DB lookups here) so it can run identically in
// the browser (for live preview) and be reused unchanged if that generation
// pipeline is built later.

export type ParsedDifficulty = "facil" | "medio" | "dificil";

export interface ParsedExerciseFrontmatter {
  tema: string | null;
  subtema: string | null;
  universidad: string | null;
  anio_examen: number | null;
  dificultad: string | null;
  etiquetas: string[];
  respuesta_correcta: string | null;
  formato_version: number | null;
  imagen_enunciado: string | null;
  imagen_solucion: string | null;
}

export interface ParsedExercise {
  filename: string;
  frontmatter: ParsedExerciseFrontmatter;
  statement_md: string | null;
  choices: string[];
  choiceLetters: string[];
  solution_md: string | null;
  difficulty: ParsedDifficulty | null;
  correctChoiceIndex: number | null;
  /** Structural/content problems — independent of the app's topic/subtopic catalog. */
  errors: string[];
}

const SUPPORTED_FORMAT_VERSION = 1;

const DIFFICULTY_MAP: Record<string, ParsedDifficulty> = {
  facil: "facil",
  fácil: "facil",
  media: "medio",
  medio: "medio",
  dificil: "dificil",
  difícil: "dificil",
};

const COMBINING_DIACRITICS_RE = /[̀-ͯ]/g;

export function normalizeForMatch(s: string): string {
  return s.normalize("NFD").replace(COMBINING_DIACRITICS_RE, "").toLowerCase().trim();
}

export function normalizeDifficulty(raw: string | null): ParsedDifficulty | null {
  if (!raw) return null;
  return DIFFICULTY_MAP[normalizeForMatch(raw)] ?? null;
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseFrontmatterBlock(block: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      result[key] = rawValue
        .slice(1, -1)
        .split(",")
        .map((x) => stripQuotes(x))
        .filter((x) => x.length > 0);
    } else {
      result[key] = stripQuotes(rawValue);
    }
  }
  return result;
}

function findSection(body: string, ...titles: string[]): string | null {
  const wanted = titles.map(normalizeForMatch);
  const lines = body.split(/\r?\n/);
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    if (start === -1) {
      if (wanted.includes(normalizeForMatch(m[1]))) start = i + 1;
      continue;
    }
    end = i;
    break;
  }
  if (start === -1) return null;
  const section = lines.slice(start, end).join("\n").trim();
  return section.length > 0 ? section : null;
}

function parseChoices(section: string | null): { choices: string[]; letters: string[] } {
  if (!section) return { choices: [], letters: [] };
  const choices: string[] = [];
  const letters: string[] = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Za-z])[\.\)]\s*(.+)$/);
    if (!m) continue;
    letters.push(m[1].toUpperCase());
    choices.push(m[2].trim());
  }
  return { choices, letters };
}

export function parseExerciseMarkdown(filename: string, raw: string): ParsedExercise {
  const errors: string[] = [];
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    errors.push("No se encontró el bloque de frontmatter (--- ... ---) al inicio del archivo.");
    return {
      filename,
      frontmatter: {
        tema: null,
        subtema: null,
        universidad: null,
        anio_examen: null,
        dificultad: null,
        etiquetas: [],
        respuesta_correcta: null,
        formato_version: null,
        imagen_enunciado: null,
        imagen_solucion: null,
      },
      statement_md: null,
      choices: [],
      choiceLetters: [],
      solution_md: null,
      difficulty: null,
      correctChoiceIndex: null,
      errors,
    };
  }

  const fm = parseFrontmatterBlock(match[1]);
  const body = match[2];

  const asString = (v: string | string[] | undefined): string | null =>
    v === undefined ? null : Array.isArray(v) ? v.join(", ") : v || null;
  const asArray = (v: string | string[] | undefined): string[] =>
    v === undefined ? [] : Array.isArray(v) ? v : v ? [v] : [];

  const anioRaw = asString(fm.anio_examen);
  const anio = anioRaw ? Number(anioRaw) : null;
  if (anioRaw && Number.isNaN(anio)) errors.push(`anio_examen inválido: "${anioRaw}".`);

  const formatoRaw = asString(fm.formato_version);
  const formatoVersion = formatoRaw ? Number(formatoRaw) : null;
  if (formatoRaw && Number.isNaN(formatoVersion)) {
    errors.push(`formato_version inválido: "${formatoRaw}".`);
  } else if (formatoVersion !== null && formatoVersion !== SUPPORTED_FORMAT_VERSION) {
    errors.push(
      `formato_version no soportado: ${formatoVersion} (esta versión de la app solo soporta ${SUPPORTED_FORMAT_VERSION}).`,
    );
  }

  const frontmatter: ParsedExerciseFrontmatter = {
    tema: asString(fm.tema),
    subtema: asString(fm.subtema),
    universidad: asString(fm.universidad),
    anio_examen: anio && !Number.isNaN(anio) ? anio : null,
    dificultad: asString(fm.dificultad),
    etiquetas: asArray(fm.etiquetas),
    respuesta_correcta: asString(fm.respuesta_correcta),
    formato_version: formatoVersion && !Number.isNaN(formatoVersion) ? formatoVersion : null,
    imagen_enunciado: asString(fm.imagen_enunciado),
    imagen_solucion: asString(fm.imagen_solucion),
  };

  if (!frontmatter.tema) errors.push("Falta el campo 'tema' en el frontmatter.");

  const difficulty = normalizeDifficulty(frontmatter.dificultad);
  if (!frontmatter.dificultad) {
    errors.push("Falta el campo 'dificultad' en el frontmatter.");
  } else if (!difficulty) {
    errors.push(
      `Dificultad no reconocida: "${frontmatter.dificultad}" (usa facil, media/medio o dificil).`,
    );
  }

  const statement_md = findSection(body, "Enunciado");
  if (!statement_md) errors.push("Falta la sección '## Enunciado' o está vacía.");

  const alternativasSection = findSection(body, "Alternativas");
  const { choices, letters } = parseChoices(alternativasSection);
  if (choices.length < 2) {
    errors.push(
      "Faltan alternativas — se necesitan al menos 2 en la sección '## Alternativas' (formato 'A) texto').",
    );
  }

  const solution_md = findSection(
    body,
    "Solución paso a paso",
    "Solucion paso a paso",
    "Solución",
    "Solucion",
  );
  if (!solution_md) errors.push("Falta la sección '## Solución paso a paso' o está vacía.");

  let correctChoiceIndex: number | null = null;
  if (!frontmatter.respuesta_correcta) {
    errors.push("Falta el campo 'respuesta_correcta' en el frontmatter.");
  } else {
    const idx = letters.findIndex((l) => l === frontmatter.respuesta_correcta!.toUpperCase());
    if (idx === -1) {
      errors.push(
        `'respuesta_correcta: ${frontmatter.respuesta_correcta}' no coincide con ninguna alternativa detectada.`,
      );
    } else {
      correctChoiceIndex = idx;
    }
  }

  return {
    filename,
    frontmatter,
    statement_md,
    choices,
    choiceLetters: letters,
    solution_md,
    difficulty,
    correctChoiceIndex,
    errors,
  };
}
