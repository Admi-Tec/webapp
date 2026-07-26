-- max_attempts pasa a ser la única fuente de verdad para el límite de
-- intentos de un examen: null/vacío = ilimitados, un número N = tope de N.
-- El switch allow_multiple_attempts generaba un default (false) que bloqueaba
-- exámenes nuevos a un solo intento aunque max_attempts quedara sin definir.
ALTER TABLE public.exams
  DROP COLUMN IF EXISTS allow_multiple_attempts;
