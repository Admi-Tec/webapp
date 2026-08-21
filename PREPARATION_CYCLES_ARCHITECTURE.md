# Ciclos de preparación — adaptación al proyecto

## Entidades reutilizadas

- `universities`: contexto universitario del ciclo.
- `topics`: catálogo de cursos.
- `subtopics`: catálogo de temas.
- `exercises`: banco único de preguntas.
- `attempts`: respuestas individuales y corrección existente.
- `student_universities`: universidades elegidas por el estudiante.

## Entidades nuevas

- `preparation_cycles`: ruta publicable por universidad.
- `preparation_cycle_courses`: cursos y orden dentro del ciclo.
- `preparation_cycle_topics`: temas, teoría de YouTube y configuración de práctica.
- `preparation_practice_sessions`: ronda contextual de preguntas seleccionadas.
- `student_cycle_topic_progress`: teoría, último/mejor resultado y dominio.

## Integración

- Admin: `/admin/ciclos` y `/admin/ciclos/$cycleId`.
- Estudiante: `/preparacion`, `/preparacion/$cycleSlug` y
  `/preparacion/$cycleSlug/$cycleTopicId`.
- Práctica: se reutiliza `/practica/$topicSlug`; el parámetro
  `cycleTopic` activa una ronda de ciclo de hasta cinco preguntas.
- No se crean catálogos, preguntas ni un reproductor de ejercicios paralelos.

