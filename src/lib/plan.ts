// Contenido del modelo freemium compartido entre la página de Planes, el
// diálogo de desbloqueo y la landing. Los precios son los valores finales
// confirmados en el plan de negocio (no un rango).

export const PLAN_PRICES = {
  monthly: { label: "Mensual", amount: "14.99", per: "/ mes" },
  quarterly: {
    label: "Trimestral",
    amount: "35.99",
    per: "/ trimestre",
    monthlyEquivalent: "11.99",
    fullPrice: "44.99", // 14.99 × 3 — lo que costaría pagar los 3 meses por separado
    discountPct: 20,
  },
} as const;

export const TRIAL_DAYS = 7;

export const FREE_FEATURES = [
  "Práctica por curso con solución paso a paso",
  "Simulacros con plantillas generales",
  "Historial básico de tus resultados",
  "Cuenta regresiva a tu fecha de examen",
  "Reto del día y metas semanales",
] as const;

export const PREMIUM_FEATURES = [
  "Exámenes oficiales completos de años anteriores",
  "Simulacros ilimitados específicos de tu universidad",
  "Historial completo con análisis de tiempo por pregunta",
  "Comparación con el promedio de otros postulantes",
  "Ranking completo: tu puesto y el top 100",
  "Recomendaciones personalizadas y el puntaje exacto que te falta para tu carrera",
] as const;

// Tabla comparativa de /planes: cada fila dice si la funcionalidad está en
// el plan gratuito, en premium, o en ambos (free: "partial" = con límites).
export const PLAN_COMPARISON: Array<{
  feature: string;
  free: boolean | "partial";
  freeNote?: string;
}> = [
  { feature: "Práctica por curso, sin cronómetro", free: true },
  { feature: "Reto del día", free: true },
  { feature: "Metas semanales y racha", free: true },
  { feature: "Cuenta regresiva a tu examen", free: true },
  { feature: "Simulacros con plantillas generales", free: true },
  { feature: "Simulacros específicos por universidad", free: false },
  { feature: "Exámenes oficiales de años anteriores", free: false },
  { feature: "Historial con análisis de tiempo por pregunta", free: "partial", freeNote: "Básico" },
  { feature: "Comparación con el promedio de otros postulantes", free: false },
  { feature: "Ranking completo (tu puesto + top 100)", free: false },
  { feature: "Puntaje mínimo de ingreso por carrera", free: false },
  { feature: "Recomendaciones personalizadas", free: false },
];
