-- Hallazgo de seguridad (revisión de ciberseguridad, ver
-- plan-revision-ciberseguridad.md): la política "Users manage own exam
-- sessions update" (auth.uid() = user_id) no restringía QUÉ columnas podía
-- cambiar un estudiante. Sin este trigger, cualquiera podía ejecutar desde la
-- consola del navegador algo como:
--   supabase.from('exam_sessions').update({status:'graded', score:9999, ...})
-- sin pasar nunca por submitExamSession, falsificando su puntaje — y con él
-- el ranking, ya que get_exam_leaderboard/get_university_leaderboard leen
-- exam_sessions.score directo.
--
-- Este trigger bloquea que el rol `authenticated` cambie las columnas de
-- calificación/identidad de una sesión. answers/flagged (el autoguardado de
-- respuestas mientras status='in_progress', vía saveExamAnswers) siguen
-- siendo libremente editables por el propio estudiante — solo se protegen
-- los campos que determinan el resultado final y la configuración de la
-- sesión. El código del servidor que sí necesita escribir estas columnas
-- (expirar una sesión vieja en startExamSession, calificar en
-- submitExamSession) ahora usa el cliente service-role (supabaseAdmin), que
-- corre como el rol `service_role` y por lo tanto no activa este bloqueo.
CREATE OR REPLACE FUNCTION public.protect_exam_session_grading_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') = 'authenticated' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.score IS DISTINCT FROM OLD.score
      OR NEW.total IS DISTINCT FROM OLD.total
      OR NEW.correct_count IS DISTINCT FROM OLD.correct_count
      OR NEW.incorrect_count IS DISTINCT FROM OLD.incorrect_count
      OR NEW.empty_count IS DISTINCT FROM OLD.empty_count
      OR NEW.max_score IS DISTINCT FROM OLD.max_score
      OR NEW.finished_at IS DISTINCT FROM OLD.finished_at
      OR NEW.question_ids IS DISTINCT FROM OLD.question_ids
      OR NEW.exam_id IS DISTINCT FROM OLD.exam_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.university_id IS DISTINCT FROM OLD.university_id
      OR NEW.time_limit_min IS DISTINCT FROM OLD.time_limit_min
      OR NEW.started_at IS DISTINCT FROM OLD.started_at
    THEN
      RAISE EXCEPTION 'exam_sessions grading/identity columns can only be changed by server-side grading logic';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_exam_session_grading_columns_trigger ON public.exam_sessions;
CREATE TRIGGER protect_exam_session_grading_columns_trigger
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_exam_session_grading_columns();

-- attempts: la política "attempts self all" (FOR ALL) permitía insertar
-- directamente filas con is_correct=true para ejercicios nunca respondidos
-- realmente, sin pasar por recordAttempt/submitExamSession (los únicos que
-- calculan is_correct de forma confiable comparando contra
-- exercises.correct_choice). Se reemplaza por: lectura y borrado propios
-- (el borrado ya lo usa deleteExamSession para limpiar intentos huérfanos),
-- pero solo el rol service_role puede insertar/actualizar filas de attempts.
DROP POLICY IF EXISTS "attempts self all" ON public.attempts;
CREATE POLICY "attempts self read" ON public.attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "attempts self delete" ON public.attempts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
