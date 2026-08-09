# Plan Funcional: Gestión de Estudiantes (Administrador)

## Contexto

El administrador ya puede gestionar universidades, temas, ejercicios, exámenes/templates y reportes de calidad. Falta una sección para **ver y administrar directamente a los estudiantes** registrados — útil para soporte, moderación, y entender quién usa la plataforma.

---

## 1. Listado de estudiantes

- Tabla con todos los estudiantes registrados, mostrando: nombre, correo, pseudónimo, universidad(es) objetivo, fecha de registro, plan actual (Gratis / Premium / Prueba activa), última actividad
- **Filtros**:
  - Por universidad objetivo
  - Por plan (Gratis / Premium / en prueba gratuita)
  - Por rango de fecha de registro
  - Por actividad reciente (ej. activos en los últimos 7/30 días vs. inactivos)
- **Búsqueda** por nombre, correo o pseudónimo
- Este listado es la base para todo lo demás — cualquier acción sobre un estudiante específico se hace entrando a su detalle desde aquí

---

## 2. Vista de detalle de un estudiante

Al entrar al perfil de un estudiante específico, el administrador debe poder ver (de solo lectura, salvo lo indicado en el punto 3):

- **Datos de perfil**: nombre, correo, pseudónimo, universidad(es) objetivo, carrera(s), fecha de examen, fecha de registro, método de login (email/password, Google, o ambos vinculados)
- **Plan actual**: Gratis / Premium / en prueba gratuita (con fecha de vencimiento si aplica) — **editable directamente desde esta vista** (ver punto 3)
- **Actividad**: historial de exámenes oficiales y simulacros rendidos (fecha, puntaje, tipo), metas semanales y su cumplimiento
- **Interacciones con contenido**: preguntas marcadas como favoritas, calificaciones con estrellas dadas, reportes de problemas enviados (con su estado: pendiente/resuelto/descartado)

---

## 3. Acciones disponibles sobre un estudiante

- **Cambiar el plan (`plan_type`)**: el administrador debe poder cambiar manualmente el plan de un estudiante entre **Gratis** y **Premium** directamente desde esta vista — esto reemplaza el manejo manual vía Supabase que se había definido antes, ya que ahora queda centralizado en el panel de administrador
  - Al asignar Premium manualmente, definir si tiene fecha de vencimiento (ej. "Premium por X días", útil para casos de soporte o cortesías) o si queda indefinido hasta que se cambie manualmente de nuevo
  - Si el estudiante tiene una prueba gratuita de 7 días en curso, mostrarlo claramente distinguido de un Premium asignado manualmente por el administrador (son dos orígenes distintos del mismo acceso)
- **Suspender / reactivar cuenta**: para casos de mal uso (ej. reportes falsos repetidos, comportamiento abusivo) — una cuenta suspendida no puede iniciar sesión, pero sus datos no se eliminan. **La suspensión siempre es reversible** — no existe un bloqueo permanente, el administrador puede reactivar la cuenta en cualquier momento
- **Resetear o forzar cambio de pseudónimo**: si un pseudónimo inapropiado se filtró de la validación automática (ya definida en el plan de perfil), el administrador debe poder forzar que el estudiante elija uno nuevo, o asignarle uno genérico temporal
- Todas estas acciones deben pasar por el mismo sistema de **confirmación y feedback de éxito/error** ya definido para el resto del panel de administrador (nada de acciones silenciosas)
- Acciones destructivas (suspender, eliminar) deben pedir una **confirmación explícita** antes de ejecutarse (ej. un modal tipo "¿Estás seguro? Esta acción no se puede deshacer" para eliminar)

---

## 4. Lo que NO incluye este plan (a propósito, por consistencia con decisiones previas)

- **No se agrega una acción de "Eliminar cuenta" en el panel** — no se considera necesaria por ahora. Si en algún momento llega una solicitud puntual de eliminación de datos (ya contemplada como requisito legal en el plan de ciberseguridad/privacidad), se puede resolver manualmente en Supabase directamente, sin necesidad de una función dedicada en la interfaz
- **No se agrega envío de mensajes/notificaciones manuales a un estudiante específico desde el panel** — las notificaciones ya definidas (reportes resueltos, prueba por vencer, etc.) son automáticas y contextuales, no hay un "enviar mensaje libre" por ahora
- **No se agrega exportación a CSV/Excel** del listado de estudiantes, consistente con la misma decisión tomada para otros reportes del panel

**Nota:** el cambio de `plan_type` desde el panel (punto 3) **reemplaza** la decisión anterior de manejarlo directamente en Supabase — ese enfoque manual queda obsoleto a partir de este plan. Los planes de implementación freemium y modelo de negocio deben actualizarse para reflejar este cambio (ver nota al final de este documento).

---

## 5. Consideraciones de privacidad y seguridad

- El acceso a esta sección debe estar restringido solo al rol de administrador, verificado del lado del servidor (mismo requisito ya definido en el plan de ciberseguridad)
- El administrador nunca debe poder ver la contraseña del estudiante (esto ni siquiera es técnicamente posible con Supabase Auth, ya que las contraseñas se almacenan hasheadas, pero vale la pena confirmarlo como principio)
- Las acciones sensibles (suspender, eliminar cuenta) deberían quedar registradas en algún tipo de log básico (ya mencionado como recomendación en el plan de ciberseguridad), para tener trazabilidad de quién hizo qué y cuándo

---

## 6. Decisiones confirmadas

- **Suspensión**: siempre reversible, sin bloqueo permanente — el administrador puede reactivar la cuenta cuando quiera
- **Eliminación de cuenta**: no se implementa como acción del panel — no se considera necesaria por ahora (ver punto 4)

