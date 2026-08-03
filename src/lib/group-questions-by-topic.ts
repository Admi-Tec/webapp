export interface QuestionGroup<T> {
  name: string;
  items: Array<{ question: T; index: number }>;
}

// Agrupa visualmente las preguntas de un examen/simulacro por curso,
// preservando el índice global (posición real en question_ids) de cada una —
// las preguntas pueden llegar mezcladas entre cursos (los simulacros siempre
// las baraja; los exámenes estándar también si question_order es "random").
//
// Orden de los grupos: si se pasa `topicOrder` (los topic_id en el orden en
// que el admin armó las reglas del simulacro, vía exam_template_rules), los
// grupos siguen exactamente ese orden. Si no (examen estándar, sin reglas de
// plantilla) se cae al orden de primera aparición, que para esos exámenes ya
// coincide con el orden del admin salvo que question_order sea "random".
export function groupQuestionsByTopic<
  T extends { topic?: { id?: string; name?: string | null } | null },
>(questions: T[], topicOrder: string[] = []): QuestionGroup<T>[] {
  const map = new Map<string, QuestionGroup<T>["items"]>();
  const topicIdByName = new Map<string, string>();
  questions.forEach((question, index) => {
    const name = question.topic?.name ?? "Otros";
    const id = question.topic?.id;
    if (id && !topicIdByName.has(name)) topicIdByName.set(name, id);
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push({ question, index });
  });
  return Array.from(map.entries())
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => {
      const rankA = topicOrder.indexOf(topicIdByName.get(a.name) ?? "");
      const rankB = topicOrder.indexOf(topicIdByName.get(b.name) ?? "");
      if (rankA === -1 && rankB === -1) return a.items[0].index - b.items[0].index;
      if (rankA === -1) return 1;
      if (rankB === -1) return -1;
      return rankA - rankB;
    });
}
