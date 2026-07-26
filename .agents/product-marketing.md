# Product Marketing Context

*Last updated: 2026-07-14*
*Auto-drafted from PRODUCT.md, DESIGN.md, src/lib/plan.ts, and the landing page (src/routes/index.tsx) — sections marked "(inferred)" are educated guesses, not confirmed facts. Review and correct before treating this as ground truth.*

## Product Overview
**One-liner:** Admi-Tec ayuda a postulantes peruanos a prepararse para su examen de admisión con exámenes oficiales reales, simulacros de todos sus cursos, y un ranking anónimo que les dice si hoy ingresarían.

**What it does:** Da acceso a exámenes oficiales pasados (renderizados digitalmente, no PDFs escaneados) y simulacros que se corrigen exactamente como el examen real (con el mismo sistema de puntos, positivo y negativo). Cubre todos los cursos que entra el examen de la universidad objetivo del estudiante, no solo matemáticas. Un ranking público pero pseudónimo compara el desempeño del estudiante contra otros postulantes a la misma universidad.

**Product category:** Preparación para examen de admisión universitaria (test-prep / exam-prep) para el mercado peruano — la estantería es "academias preuniversitarias" y apps de preparación para UNI/San Marcos/PUCP/UNALM/UNFV, no ed-tech genérico.

**Product type:** Web app, B2C, freemium.

**Business model:** Freemium por suscripción. Plan gratuito permanente (práctica por curso, plantillas generales de simulacro, reto del día, cuenta regresiva). Premium: S/14.99/mes o S/35.99/trimestre (equivalente a S/12.00/mes, 20% de descuento), con 7 días de prueba gratis. Premium desbloquea exámenes oficiales completos, simulacros específicos por universidad, ranking completo y recomendaciones personalizadas — ver `src/lib/plan.ts` para la lista exacta.

## Target Audience
**Target companies:** No aplica (B2C).

**Decision-makers:** El propio postulante suele ser el usuario y quien decide registrarse gratis; el pago de Premium probablemente lo decide el estudiante o sus padres (inferred — no confirmado).

**Primary use case:** Saber con certeza si hoy ingresarías a tu universidad y carrera objetivo, practicando bajo condiciones reales de examen en vez de material genérico.

**Jobs to be done:**
- "Dime si hoy ingresaría" — rendir exámenes/simulacros reales corregidos como el examen oficial, comparado contra el puntaje mínimo de ingreso de mi carrera.
- "Dime dónde enfocar mis horas de estudio" — ver qué temas se repiten más en el examen real de mi universidad.
- "Dime dónde estoy parado frente a otros postulantes" — ranking anónimo contra otros que apuntan a la misma universidad.

**Use cases:**
- Práctica diaria por tema/curso, sin cronómetro.
- Simulacro completo cronometrado, específico por universidad (Premium) o con plantilla general (gratis).
- Revisión de exámenes oficiales de años anteriores.
- Reto del día: un ejercicio compartido, el mismo para todos, con precisión en vivo de quienes lo intentaron hoy.
- Metas semanales, racha, y cuenta regresiva a la fecha del examen.

## Personas
B2C — no hay stakeholders de compra B2B que capturar. Nota: el estudiante es casi siempre el usuario; quien paga Premium podría ser un padre/madre (inferred, sin confirmar). Revisar si vale la pena separar "postulante" vs. "padre/madre que paga" como dos personas si el dato se confirma.

## Problems & Pain Points
**Core problem:** El postulante no sabe con certeza si está listo para su examen específico — el material genérico (solucionarios, academias) no está corregido como el examen real, no cubre necesariamente todos sus cursos, y no da ninguna señal de dónde está parado frente a otros postulantes.

**Why alternatives fall short (inferred):**
- Simulacros de academias presenciales no siempre tienen versión digital con corrección instantánea.
- Bancos de ejercicios/solucionarios genéricos no usan el sistema de puntaje real (positivo y negativo) ni el formato exacto de la universidad.
- Ninguna alternativa conocida ofrece un ranking anónimo comparable contra otros postulantes al mismo examen.

**What it costs them:** Horas de estudio en temas de bajo rendimiento (poco frecuentes en el examen real), llegar al examen sin saber si el nivel alcanzado alcanza el puntaje mínimo de ingreso.

**Emotional tension:** Urgencia real ("modo examen") — hay una fecha de examen concreta y cupos limitados; la ansiedad viene de no saber dónde se está parado hasta que ya es tarde.

## Competitive Landscape
*(inferred — no investigación competitiva formal capturada aún; validar con el usuario)*

**Direct:** Otras apps/plataformas de simulacros online para admisión UNI/San Marcos — se quedan cortas si no corrigen con el sistema de puntos real o no cubren todos los cursos del examen.

**Secondary:** Academias preuniversitarias presenciales y sus propios simulacros en papel — resuelven el mismo problema pero sin digitalización, corrección instantánea, ni ranking comparativo.

**Indirect:** Solucionarios/bancos de ejercicios genéricos (PDFs, grupos de Facebook/WhatsApp) — resuelven "necesito practicar" pero no "necesito saber si ya ingresaría a mi carrera específica."

## Differentiation
**Key differentiators:**
- Exámenes oficiales reales de años anteriores, no ejercicios inventados.
- Cobertura completa de todos los cursos del examen de la universidad objetivo, no solo matemáticas.
- Simulacros corregidos exactamente con el sistema de puntos del examen real (positivo y negativo), comparado contra el puntaje mínimo de ingreso por carrera.
- Ranking público pero pseudónimo contra otros postulantes a la misma universidad — nunca expone el nombre real.
- Análisis de qué temas se repiten más en el examen real de cada universidad.

**How we do it differently:** En vez de contenido genérico por índice de libro, todo se ancla al examen oficial y a la universidad/carrera específica que el postulante eligió.

**Why that's better:** El estudiante deja de adivinar — sabe si hoy ingresaría, no solo si "le fue bien" en un ejercicio.

**Why customers choose us:** Credibilidad (los exámenes son reales) + gratis y fácil de empezar + prueba visible de qué tan listo está (ranking + comparación contra el puntaje mínimo).

## Objections
*(inferred — validar en conversaciones reales con usuarios/padres)*

| Objection | Response |
|-----------|----------|
| "¿Los ejercicios son inventados como en otras apps?" | Todos los exámenes son oficiales, de años anteriores, renderizados tal cual — no ejercicios genéricos. |
| "Ya pago una academia preuniversitaria, ¿para qué esto también?" | No reemplaza la academia: da exámenes oficiales completos, simulacros ilimitados por universidad y un ranking que la mayoría de academias no ofrece digitalmente. |
| "¿El ranking va a exponer mi nombre o mis resultados?" | El ranking es pseudónimo — nadie ve el nombre real, ni siquiera Admi-Tec lo muestra. |

**Anti-persona:** Alguien sin una universidad/carrera objetivo definida, o que busca contenido educativo genérico no ligado a un examen de admisión concreto — Admi-Tec funciona mejor cuando hay un examen y una fecha reales.

## Switching Dynamics
*(inferred)*

**Push:** Ansiedad de no saber si están listos; material de práctica que no se siente "real"; cero retroalimentación sobre dónde están parados frente a otros postulantes.

**Pull:** Exámenes oficiales reales + puntaje exacto que falta para la carrera + ranking anónimo; empezar es gratis y sin fricción (sin tarjeta).

**Habit:** Ya vienen usando el material de su academia, solucionarios fotocopiados, o simulacros presenciales de toda la vida.

**Anxiety:** ¿Los exámenes oficiales están completos y actualizados? ¿El ranking refleja postulantes reales y no números inflados?

## Customer Language
**How they describe the problem:** No hay lenguaje verbatim capturado todavía — no se ha hecho investigación de clientes (entrevistas, reviews, tickets de soporte). Revisar con `customer-research` cuando exista.

**How they describe us:** Mismo caso — sin citas verbatim capturadas aún.

**Words to use:** postulante, simulacro, examen oficial, puntaje mínimo de ingreso, ranking anónimo, reto del día, "ingresarías".

**Words to avoid:** lenguaje de gamificación ("logros", "insignias", "puntos de experiencia", "niveles") — el registro del producto es competitivo/instrumentación real, no un juego (ver PRODUCT.md, Anti-references). También evitar "curso online" genérico — Admi-Tec no es un curso, es preparación anclada a un examen específico.

**Glossary:**
| Term | Meaning |
|------|---------|
| Postulante | Estudiante preparándose para un examen de admisión universitaria específico |
| Simulacro | Examen completo cronometrado, corregido exactamente como el examen oficial real |
| Examen oficial | Un examen de admisión real de un año anterior, disponible para rendir tal cual |
| Ranking anónimo | Tabla de posiciones pseudónima, comparando puntaje/ritmo contra otros postulantes a la misma universidad |
| Puntaje mínimo de ingreso | El puntaje histórico mínimo requerido para ingresar a una carrera específica |
| Reto del día | Un ejercicio compartido, el mismo para todos los visitantes ese día, con precisión en vivo |

## Brand Voice
**Tone:** En la landing/página pública: audaz y competitivo ("modo examen") — urgencia real de examen, sin ser gimmicky ni gamificado. Dentro de la app (una vez logueado): más calmado, registro de "cuaderno de estudio" para practicar enfocado.

**Style:** Directo, con datos e instrumentación (cifras tabulares, puntajes, cronómetros) por delante de adjetivos vacíos; segunda persona ("tú").

**Personality:** Audaz, competitivo, creíble, sustantivo — cálido pero serio (no juguetón; ver decisión de producto de mantener el registro "bold/competitive" en vez de "playful" en la landing).

## Proof Points
**Metrics:** Ninguna métrica de negocio capturada aún (usuarios, tasas de conversión, etc.) — no inventar cifras. La landing sí muestra conteos reales en vivo (ejercicios, cursos, universidades disponibles) vía `useCountUp`, pero eso es dato de producto, no proof point de marketing.

**Customers:** Ninguno confirmado — sin logos de academias/universidades ni testimonios todavía (ver PRODUCT.md, "Proof on hand: none captured yet").

**Testimonials:** Ninguno capturado.

**Value themes:**
| Theme | Proof |
|-------|-------|
| Los exámenes son reales, no inventados | Exámenes oficiales de años anteriores renderizados digitalmente; simulacros corregidos con el sistema de puntos real |
| Cobertura completa, no solo matemáticas | Todos los cursos del examen de la universidad objetivo — visible en el ticker de cursos y el conteo de la landing |
| Sabes dónde estás parado | Puntaje exacto que falta para el mínimo de ingreso + ranking anónimo contra otros postulantes |
| Empezar es gratis y sin fricción | Plan gratuito permanente, sin tarjeta; 7 días de prueba en Premium |

## Goals
**Primary business goal:** Conseguir nuevos usuarios registrados gratis, y convertir de gratis a Premium.

**Conversion action:** CTA primario "Crear cuenta gratis"; CTA secundario "Ver ranking completo" para visitantes que aún no están listos para registrarse (ver PRODUCT.md, Conversion & proof).

**Current metrics:** Ninguna conocida/trackeada todavía.
