# Plan de implementación --- Ciclos de Preparación Admi-Tec

## 0. Objetivo

Implementar en Admi-Tec un nuevo módulo de **Ciclos de Preparación** que
permita al administrador construir rutas de estudio específicas para
cada universidad.

Ejemplo:

> Universidad Nacional Mayor de San Marcos (UNMSM) → Ciclo San Marcos
> 2027-I → Cursos → Temas → Clase teórica → Práctica de 5 preguntas.

La finalidad es ampliar Admi-Tec desde la práctica de preguntas,
simulacros y exámenes hacia una experiencia completa:

**Aprender → Practicar → Medir dominio → Continuar preparación**

La implementación debe reutilizar al máximo las entidades, banco de
preguntas, motor de ejercicios, cursos, temas, universidades y sistema
de resultados que ya existan en el proyecto.

**Antes de modificar código, inspeccionar el repositorio y adaptar este
plan a la arquitectura, modelos y convenciones existentes. No crear
sistemas paralelos si ya existe una entidad o servicio equivalente.**

------------------------------------------------------------------------

# 1. Principios de producto

## 1.1 Un ciclo pertenece a una universidad

Cada ciclo debe tener un contexto universitario explícito.

Ejemplos:

-   UNMSM --- Ciclo 2027-I
-   UNI --- Ciclo 2027-I
-   UNFV --- Ciclo Intensivo 2027

No mezclar contextos de universidades en la interfaz del estudiante.

## 1.2 El ciclo es una ruta, no una copia del contenido

Los cursos, temas y preguntas deben seguir siendo entidades
reutilizables.

Un ciclo define:

-   qué cursos estudiar;
-   qué temas estudiar;
-   en qué orden;
-   qué contenido teórico usar;
-   qué práctica lanzar después de cada tema.

No duplicar cursos/temas/preguntas por cada ciclo salvo que la
arquitectura actual lo requiera de forma justificada.

## 1.3 Teoría y práctica deben estar conectadas

Cada unidad de estudio debe seguir el flujo:

1.  Ver/aprender teoría.
2.  Marcar teoría como completada.
3.  Lanzar práctica del tema.
4.  Resolver 5 preguntas por defecto.
5.  Guardar resultado.
6.  Calcular estado de dominio.
7.  Permitir continuar o practicar nuevamente.

## 1.4 No gamificar

El progreso debe sentirse académico y útil.

Usar conceptos como:

-   No iniciado
-   Teoría completada
-   Práctica realizada
-   Necesita refuerzo
-   Dominado

Evitar badges, XP, monedas, niveles artificiales u otras mecánicas de
videojuego.

------------------------------------------------------------------------

# 2. Alcance del MVP

Construir inicialmente:

-   CRUD de ciclos de preparación para Admin.
-   Asociación ciclo ↔ universidad.
-   Asociación ciclo ↔ cursos.
-   Orden de cursos dentro del ciclo.
-   Asociación curso del ciclo ↔ temas.
-   Orden de temas.
-   Video de teoría por tema mediante URL de YouTube.
-   Configuración de práctica por tema.
-   5 preguntas por defecto.
-   Selección automática de preguntas desde el banco existente.
-   Pantalla del estudiante con su ruta de preparación.
-   Reproductor/embed de YouTube.
-   Acción para marcar teoría como completada.
-   Botón **Practicar este tema**.
-   Ejecución de práctica reutilizando el motor actual.
-   Registro de resultados.
-   Progreso por tema y curso.
-   Estado de dominio.

No implementar todavía:

-   clases en vivo;
-   subida/hosting propio de videos;
-   PDFs/materiales adicionales;
-   prerequisitos obligatorios;
-   desbloqueo semanal;
-   calendario;
-   recomendaciones con IA;
-   certificados;
-   pagos específicos por ciclo;
-   múltiples clases teóricas por tema;
-   algoritmos adaptativos complejos.

Diseñar el modelo de forma que estas extensiones puedan añadirse después
sin rehacer el módulo.

------------------------------------------------------------------------

# 3. Fase 0 --- Auditoría del proyecto

Antes de escribir migraciones o componentes:

## 3.1 Identificar stack y arquitectura

Revisar:

-   framework frontend;
-   framework/backend;
-   ORM;
-   base de datos;
-   autenticación;
-   roles;
-   estructura de rutas;
-   componentes UI;
-   servicios;
-   tests;
-   convenciones de nombres.

## 3.2 Localizar entidades existentes

Buscar específicamente:

-   University / Universidad
-   Course / Curso
-   Topic / Tema
-   Question / Pregunta
-   Exam / Examen
-   Practice / PracticeSession / Ejercicio
-   Answer / Response
-   Result / Score
-   User
-   Admin / roles
-   Student progress

## 3.3 Reutilización obligatoria

Antes de crear una entidad nueva, comprobar si ya existe una
equivalente.

Especialmente:

-   NO crear una segunda tabla de universidades.
-   NO crear un segundo catálogo de cursos.
-   NO crear un segundo catálogo de temas.
-   NO duplicar preguntas.
-   NO crear un nuevo motor de resolución si el flujo de ejercicios
    existente puede reutilizarse.

## 3.4 Entregable de esta fase

Antes de implementar, dejar documentado brevemente:

-   entidades existentes que serán reutilizadas;
-   nuevas entidades necesarias;
-   rutas/páginas afectadas;
-   servicios existentes reutilizados;
-   migraciones necesarias.

Después continuar con la implementación.

------------------------------------------------------------------------

# 4. Modelo de datos propuesto

Los nombres son conceptuales. Adaptarlos a las convenciones reales del
repositorio.

## 4.1 PreparationCycle

Representa un ciclo/ruta de preparación.

Campos sugeridos:

``` text
id
universityId
name
slug
description?
status
createdAt
updatedAt
```

`status`:

``` text
DRAFT
PUBLISHED
ARCHIVED
```

Ejemplo:

``` text
name: "Ciclo San Marcos 2027-I"
universityId: <UNMSM>
status: PUBLISHED
```

------------------------------------------------------------------------

## 4.2 PreparationCycleCourse

Relaciona cursos existentes con un ciclo y define su orden.

``` text
id
cycleId
courseId
position
createdAt
updatedAt
```

Restricciones:

-   un curso no debe repetirse dentro del mismo ciclo;
-   `position` determina el orden mostrado.

------------------------------------------------------------------------

## 4.3 PreparationCycleTopic

Relaciona un tema existente con un curso dentro del ciclo.

``` text
id
cycleCourseId
topicId
position
titleOverride?
youtubeUrl?
youtubeVideoId?
videoDurationSeconds?
practiceQuestionCount
practiceSelectionMode
isPublished
createdAt
updatedAt
```

Defaults:

``` text
practiceQuestionCount = 5
practiceSelectionMode = AUTOMATIC
isPublished = false
```

Para MVP, una unidad/tema tendrá como máximo una clase teórica
principal.

------------------------------------------------------------------------

## 4.4 Configuración futura de práctica

Preparar el diseño para soportar posteriormente:

``` text
difficultyDistribution
prioritizeUniversityQuestions
officialExamOnly
manualQuestionIds
```

No es obligatorio implementar todo esto en V1.

En V1:

``` text
practiceSelectionMode = AUTOMATIC
practiceQuestionCount = 5
```

------------------------------------------------------------------------

## 4.5 StudentTopicProgress

Guardar progreso del estudiante por unidad del ciclo.

``` text
id
userId
cycleTopicId
theoryCompletedAt?
practiceCompletedAt?
bestScore?
lastScore?
masteryStatus
createdAt
updatedAt
```

Estados sugeridos:

``` text
NOT_STARTED
THEORY_COMPLETED
PRACTICE_COMPLETED
NEEDS_REVIEW
MASTERED
```

Si el sistema actual ya guarda suficiente información para derivar parte
de estos estados, evitar duplicarla.

------------------------------------------------------------------------

# 5. Reglas de dominio

## 5.1 Teoría completada

Para el MVP, NO intentar detectar automáticamente que YouTube fue visto
al 100%.

El estudiante debe poder pulsar:

**Marcar teoría como completada**

Registrar:

``` text
theoryCompletedAt
```

Más adelante se puede integrar YouTube Player API si se considera
necesario.

## 5.2 Lanzamiento de práctica

Cuando la teoría esté completada, mostrar como CTA principal:

**Practicar este tema**

Al pulsarlo:

1.  obtener `cycleTopic`;
2.  obtener su `topicId`;
3.  determinar universidad desde el ciclo;
4.  solicitar `practiceQuestionCount` preguntas;
5.  crear/reutilizar una sesión de práctica;
6.  abrir el flujo existente de resolución.

Default:

``` text
5 preguntas
```

## 5.3 Selección automática de preguntas

Reutilizar el selector de preguntas existente si existe.

Criterio mínimo:

``` text
topic = tema actual
```

Cuando el modelo de datos actual lo permita, priorizar:

``` text
topic = tema actual
AND university = universidad del ciclo
```

Si no existen 5 preguntas específicas para esa universidad, hacer
fallback a preguntas del mismo tema de otras fuentes según las reglas
actuales del banco.

Evitar preguntas que el estudiante acaba de resolver cuando haya
suficiente inventario.

No bloquear la práctica si existen menos de 5 preguntas; usar las
disponibles y manejar el estado de forma segura.

## 5.4 Resultado

Al finalizar:

``` text
score = correctAnswers / totalQuestions
```

Regla inicial de dominio:

``` text
score >= 80% → MASTERED
score < 80% → NEEDS_REVIEW
```

Guardar `lastScore`.

Actualizar `bestScore` solo cuando el nuevo resultado sea superior.

## 5.5 Reintento

Después de una práctica con resultado insuficiente:

**Necesita refuerzo**

Mostrar:

-   Repasar teoría
-   Practicar 5 preguntas más

No bloquear el resto de temas del ciclo.

------------------------------------------------------------------------

# 6. Admin --- Navegación

Añadir al área administrativa:

``` text
Preparación
└── Ciclos
```

Ruta conceptual:

``` text
/admin/preparation-cycles
```

Adaptar a la estructura real del proyecto.

------------------------------------------------------------------------

# 7. Admin --- Lista de ciclos

Crear pantalla:

**Ciclos de preparación**

Mostrar:

-   nombre;
-   universidad;
-   número de cursos;
-   número de temas;
-   estado;
-   última modificación;
-   acciones.

Acciones:

-   Crear ciclo
-   Editar
-   Duplicar, solo si es sencillo con la arquitectura actual
-   Publicar / pasar a borrador
-   Archivar

CTA:

**Crear ciclo**

------------------------------------------------------------------------

# 8. Admin --- Crear/editar ciclo

Formulario:

``` text
Nombre *
Universidad *
Descripción
Estado
```

Ejemplo:

``` text
Nombre: Ciclo San Marcos 2027-I
Universidad: UNMSM
Descripción: Ruta completa de preparación...
Estado: Borrador
```

Guardar primero el ciclo antes de construir su contenido.

------------------------------------------------------------------------

# 9. Admin --- Constructor del ciclo

Después de crear el ciclo, abrir un builder.

Header:

``` text
Ciclo San Marcos 2027-I
UNMSM
Borrador
```

Secciones principales:

``` text
Cursos
Configuración
Vista previa
```

## 9.1 Cursos

Permitir añadir cursos existentes.

Ejemplo:

``` text
1. Aritmética
2. Álgebra
3. Geometría
4. Trigonometría
5. Física
6. Química
```

Permitir:

-   añadir curso;
-   eliminar del ciclo;
-   cambiar orden.

Si el proyecto ya dispone de una librería segura de drag & drop, usarla.

Si no, implementar primero controles sencillos:

``` text
↑
↓
```

No añadir una dependencia pesada solo por drag & drop.

------------------------------------------------------------------------

# 10. Admin --- Temas de un curso

Al abrir un curso:

``` text
Álgebra
```

Mostrar los temas añadidos:

``` text
1. Leyes de exponentes
2. Polinomios
3. Productos notables
4. Factorización
5. Ecuaciones
6. Inecuaciones
```

Permitir:

-   añadir temas existentes;
-   quitar tema;
-   ordenar;
-   editar configuración de la unidad;
-   publicar/despublicar tema.

No crear automáticamente temas duplicados.

------------------------------------------------------------------------

# 11. Admin --- Editor de unidad/tema

Al seleccionar un tema:

## Información

``` text
Tema: Factorización
Curso: Álgebra
```

## Teoría

``` text
Título visible
URL de YouTube
Duración (opcional)
```

Validar URL.

Aceptar URLs habituales de YouTube:

``` text
youtube.com/watch?v=...
youtu.be/...
youtube.com/embed/...
```

Extraer y almacenar `videoId` cuando sea conveniente.

Nunca renderizar HTML arbitrario introducido por el admin.

## Práctica

``` text
Número de preguntas: 5
Modo: Automático
```

Para MVP, mantener la interfaz sencilla.

Mostrar, si es posible:

``` text
Preguntas disponibles para este tema: X
```

Si el banco actual permite distinguir universidad:

``` text
Preguntas UNMSM disponibles: X
Total del tema: Y
```

Esto ayuda al administrador a detectar temas sin suficiente banco de
ejercicios.

------------------------------------------------------------------------

# 12. Publicación

Un ciclo en `DRAFT` no debe aparecer a estudiantes.

Un ciclo `PUBLISHED` sí.

Dentro de un ciclo publicado:

-   temas no publicados no aparecen;
-   cursos sin temas publicados pueden ocultarse.

Antes de publicar, mostrar warnings si:

-   no tiene cursos;
-   un curso no tiene temas;
-   un tema no tiene video;
-   un tema no tiene preguntas disponibles.

Los warnings no tienen por qué bloquear siempre la publicación;
distinguir errores críticos de advertencias.

------------------------------------------------------------------------

# 13. Estudiante --- Acceso a preparación

Añadir una entrada clara dentro del producto autenticado:

**Mi preparación** o **Preparación**

No usar la estética oscura del landing.

Esta funcionalidad pertenece al área de estudio y debe seguir el
**Product Surface** de Admi-Tec:

-   fondo `app-paper`;
-   texto `app-ink`;
-   azul `app-primary`;
-   ámbar `app-highlighter` con moderación;
-   tipografía Fraunces para títulos;
-   Inter para UI/cuerpo;
-   tarjetas claras;
-   experiencia calmada para estudio.

Consultar `DESIGN.md` y reutilizar los componentes existentes antes de
crear nuevos estilos.

------------------------------------------------------------------------

# 14. Estudiante --- Selector/contexto de universidad

Mantener siempre visible qué universidad se está preparando.

Ejemplo:

``` text
Preparación
San Marcos · UNMSM
```

Si un estudiante tiene más de una universidad/contexto, reutilizar el
mecanismo existente para cambiar contexto.

No mezclar progreso de UNI con UNMSM en una misma ruta.

------------------------------------------------------------------------

# 15. Estudiante --- Vista del ciclo

Pantalla conceptual:

``` text
Ciclo San Marcos 2027-I

Tu progreso
18 / 64 temas

Álgebra
4 / 12 temas

✓ Leyes de exponentes
✓ Polinomios
✓ Productos notables
→ Factorización
○ Ecuaciones
○ Inecuaciones
```

Cada tema debe mostrar su estado.

Estados visuales:

``` text
No iniciado
Teoría completada
Práctica realizada
Necesita refuerzo
Dominado
```

El progreso debe ser informativo, no gamificado.

------------------------------------------------------------------------

# 16. Estudiante --- Página de tema

Ejemplo:

``` text
Álgebra
Factorización

Clase teórica
18 min

[ YouTube player ]

[ Marcar teoría como completada ]
```

Después:

``` text
✓ Teoría completada

Ahora comprueba lo aprendido.

[ Practicar este tema → ]
5 preguntas
```

Si ya hizo práctica:

``` text
Último resultado: 4/5
Dominado

[ Practicar nuevamente ]
```

o:

``` text
Último resultado: 2/5
Necesita refuerzo

[ Repasar teoría ]
[ Practicar 5 preguntas más ]
```

------------------------------------------------------------------------

# 17. Integración con YouTube

Para MVP:

-   usar embed oficial de YouTube;
-   almacenar URL/videoId;
-   no descargar ni rehostear video;
-   no construir infraestructura propia de streaming.

Considerar privacidad y CSP existentes.

Crear un componente reutilizable si no existe:

``` text
TheoryVideoPlayer
```

Responsabilidades:

-   recibir videoId;
-   renderizar iframe seguro;
-   aspect ratio responsive;
-   título accesible;
-   fallback si URL/video no es válido.

------------------------------------------------------------------------

# 18. Integración con el motor de práctica

Esta es una condición importante de implementación.

**No construir una segunda interfaz de preguntas si ya existe una.**

Crear un punto de entrada desde el ciclo hacia el sistema actual.

Conceptualmente:

``` text
startTopicPractice({
  userId,
  universityId,
  topicId,
  questionCount: 5,
  source: "PREPARATION_CYCLE",
  cycleTopicId
})
```

Los nombres exactos deben adaptarse al código actual.

La sesión debe conservar suficiente contexto para saber que fue iniciada
desde un ciclo y actualizar progreso al finalizar.

------------------------------------------------------------------------

# 19. Progreso agregado

## Por tema

Derivar/mostrar:

``` text
estado
último resultado
mejor resultado
```

## Por curso

Ejemplo:

``` text
4 / 12 temas dominados
```

## Por ciclo

Ejemplo:

``` text
18 / 64 temas dominados
```

No utilizar simplemente "videos vistos" como métrica principal de
preparación.

El dominio debe depender de práctica/resultados.

------------------------------------------------------------------------

# 20. API / Server actions

Adaptar al patrón existente.

Operaciones necesarias:

## Admin

``` text
listPreparationCycles
getPreparationCycle
createPreparationCycle
updatePreparationCycle
archivePreparationCycle

addCourseToCycle
removeCourseFromCycle
reorderCycleCourses

addTopicToCycleCourse
removeTopicFromCycleCourse
reorderCycleTopics
updateCycleTopic
```

## Student

``` text
getPublishedPreparationCycle
getStudentCycleProgress
getCycleTopic
markTheoryCompleted
startCycleTopicPractice
completeCycleTopicPractice
```

No exponer operaciones admin a usuarios normales.

Validar permisos en servidor, no solo ocultar botones.

------------------------------------------------------------------------

# 21. Seguridad y validación

Implementar:

-   autorización de admin en todas las mutaciones administrativas;
-   validación de IDs;
-   validación de pertenencia ciclo → universidad;
-   validación de curso/tema;
-   sanitización/validación de URLs de YouTube;
-   protección contra HTML arbitrario;
-   transacciones cuando se reordenen múltiples elementos;
-   constraints de unicidad cuando corresponda;
-   manejo de ciclos archivados;
-   evitar que estudiantes accedan a drafts mediante URL directa.

------------------------------------------------------------------------

# 22. Estados vacíos y errores

Diseñar explícitamente:

## Admin

Sin ciclos:

``` text
Todavía no hay ciclos de preparación.
Crea el primero para organizar una ruta de estudio por universidad.
```

Tema sin preguntas:

``` text
No hay preguntas disponibles para este tema.
```

Video inválido:

``` text
No se pudo cargar este video.
```

## Estudiante

Sin ciclo publicado:

``` text
Aún no hay un ciclo de preparación disponible para esta universidad.
```

Práctica sin suficientes preguntas:

Usar las disponibles si existe al menos una.

Si no existe ninguna:

``` text
Todavía no hay ejercicios disponibles para este tema.
```

No producir errores 500 por falta de inventario.

------------------------------------------------------------------------

# 23. Responsive y accesibilidad

Todas las nuevas pantallas deben funcionar en:

-   desktop;
-   tablet;
-   móvil.

Cumplir como mínimo:

-   controles táctiles cómodos;
-   navegación por teclado;
-   labels asociados;
-   focus visible;
-   contraste compatible con el sistema existente;
-   títulos correctos del iframe;
-   estados que no dependan únicamente del color;
-   `prefers-reduced-motion` cuando se introduzca movimiento.

------------------------------------------------------------------------

# 24. Tests

Añadir tests siguiendo la estrategia existente del repositorio.

Prioridad:

## Unit/domain

-   cálculo de `MASTERED`;
-   cálculo de `NEEDS_REVIEW`;
-   `bestScore`;
-   selección de preguntas;
-   fallback cuando no existen 5;
-   validación YouTube.

## Integration

-   admin crea ciclo;
-   añade curso;
-   añade tema;
-   configura video;
-   publica;
-   estudiante puede verlo;
-   estudiante marca teoría;
-   inicia práctica;
-   termina práctica;
-   progreso se actualiza.

## Permissions

Verificar:

-   estudiante no puede crear/editar ciclos;
-   estudiante no puede ver drafts;
-   admin sí puede gestionarlos.

------------------------------------------------------------------------

# 25. Migraciones y seed

Crear migraciones compatibles con la base existente.

No eliminar ni modificar datos existentes de forma destructiva.

Si existe seed de desarrollo, añadir un ciclo de ejemplo únicamente en
desarrollo:

``` text
UNMSM
Ciclo San Marcos Demo
Álgebra
  - Productos notables
  - Factorización
  - Ecuaciones
```

Usar cursos/temas existentes del seed si los hay.

No insertar datos ficticios en producción.

------------------------------------------------------------------------

# 26. Observabilidad

Si el proyecto ya tiene analytics/event tracking, añadir eventos
siguiendo sus convenciones:

``` text
preparation_cycle_viewed
theory_started
theory_completed
topic_practice_started
topic_practice_completed
topic_mastered
```

No introducir una nueva plataforma de analytics para esta feature.

------------------------------------------------------------------------

# 27. Diseño visual

Seguir `DESIGN.md`.

Esta feature pertenece al **Product Surface**, no al landing `.at`.

Reglas:

-   usar componentes UI existentes;
-   mantener experiencia de estudio clara y calmada;
-   Fraunces para títulos cuando corresponda;
-   Inter para interfaz;
-   `app-paper` como superficie;
-   `app-primary` como color de autoridad;
-   ámbar solo como énfasis;
-   evitar sombras/decoración excesiva;
-   no usar JetBrains Mono/estética de hoja nocturna del landing;
-   no introducir mascots, confetti o badges de gamificación.

El progreso debe verse como información académica.

------------------------------------------------------------------------

# 28. Orden recomendado de implementación

Implementar en este orden:

### Paso 1

Auditar arquitectura y entidades existentes.

### Paso 2

Crear modelo/migraciones para ciclos, cursos del ciclo, temas del ciclo
y progreso que realmente hagan falta.

### Paso 3

Implementar servicios/API y autorización Admin.

### Paso 4

Construir lista + creación/edición de ciclos en Admin.

### Paso 5

Construir builder de cursos y temas.

### Paso 6

Añadir configuración de YouTube y práctica.

### Paso 7

Construir vista de preparación del estudiante.

### Paso 8

Construir página de teoría.

### Paso 9

Conectar botón **Practicar este tema** al motor existente.

### Paso 10

Actualizar progreso al finalizar práctica.

### Paso 11

Añadir estados de dominio y progreso agregado.

### Paso 12

Añadir tests, estados vacíos, errores y responsive.

### Paso 13

Ejecutar lint, typecheck, tests y build.

------------------------------------------------------------------------

# 29. Criterios de aceptación del MVP

La feature se considera terminada cuando se puede ejecutar este flujo
completo:

1.  Un admin abre **Ciclos de preparación**.
2.  Crea **Ciclo San Marcos 2027-I**.
3.  Selecciona UNMSM.
4.  Añade Álgebra.
5.  Añade Factorización.
6.  Configura una URL válida de YouTube.
7.  Deja práctica automática de 5 preguntas.
8.  Publica el ciclo.
9.  Un estudiante de contexto UNMSM abre **Preparación**.
10. Ve el ciclo y el curso Álgebra.
11. Entra en Factorización.
12. Ve la clase de YouTube.
13. Marca la teoría como completada.
14. Aparece **Practicar este tema**.
15. Al pulsarlo se inicia una práctica usando preguntas existentes de
    Factorización.
16. Resuelve hasta 5 preguntas.
17. El resultado queda guardado.
18. Con ≥80%, el tema aparece como **Dominado**.
19. Con \<80%, aparece como **Necesita refuerzo**.
20. El progreso del curso y del ciclo se actualiza.
21. El estudiante puede volver a practicar.
22. Un estudiante no puede acceder a ciclos borrador ni modificar
    configuración administrativa.

------------------------------------------------------------------------

# 30. Requisitos de calidad para Codex

Durante la implementación:

-   No asumir la arquitectura: inspeccionarla primero.
-   No reemplazar sistemas existentes que puedan reutilizarse.
-   Mantener cambios pequeños y coherentes.
-   Respetar convenciones del repositorio.
-   Evitar dependencias nuevas innecesarias.
-   Mantener TypeScript estricto si el proyecto lo usa.
-   No usar `any` para resolver rápidamente errores de tipos salvo caso
    justificado.
-   No introducir datos mock en producción.
-   No romper los flujos actuales de ejercicios, simulacros, exámenes o
    ranking.
-   Ejecutar los tests relevantes después de cada bloque importante.
-   Al finalizar, ejecutar los checks generales disponibles en el
    proyecto.
-   Documentar cualquier decisión que se aparte de este plan por
    limitaciones de la arquitectura existente.

------------------------------------------------------------------------

# 31. Entregable final esperado de Codex

Al terminar, devolver un resumen con:

``` text
1. Qué se implementó
2. Archivos principales creados/modificados
3. Migraciones realizadas
4. Cómo funciona el flujo Admin
5. Cómo funciona el flujo Student
6. Cómo se reutilizó el banco/motor de preguntas existente
7. Tests añadidos
8. Comandos de validación ejecutados
9. Limitaciones o TODOs pendientes
10. Pasos manuales necesarios para probar la feature
```

No considerar la tarea completa únicamente porque compile. Validar el
flujo funcional completo descrito en los criterios de aceptación.
