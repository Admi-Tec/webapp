---
name: exercise-markdown-format
description: Use this skill whenever the user asks to extract, generate, or convert exam exercises/questions from a PDF (or any other source) into markdown files for import into their admission-exam prep web app. Trigger this any time the user mentions "ejercicios en markdown", "formato de ejercicio", "extraer ejercicios del PDF", "generar archivos .md de preguntas", or asks to process a PDF containing solved exercises for their exam-prep platform. This skill defines the exact frontmatter fields, markdown/LaTeX structure, and file/image naming conventions that must be followed so the output can be imported directly by the app's admin import feature.
---

# Formato de Ejercicio en Markdown (Admin Import)

Este skill define el formato **exacto** que debe seguir cada ejercicio generado en markdown, para que sea compatible con la funcionalidad de importación del panel de administrador de la aplicación. Este formato es un contrato: si no se sigue con precisión, la importación fallará o insertará datos incorrectos.

Úsalo cada vez que el usuario pida extraer ejercicios de un PDF (u otra fuente) y convertirlos a este formato.

## Preferencias de exportación de Admi-Tec

- **Clasificación indicada por el usuario:** para el libro *Prepárate del Pronabec, segunda edición, Razonamiento Matemático* de esta muestra, exporta `universidad: BECA18` en todos los ejercicios. Es una categoría de destino de Admi-Tec, no una afirmación de que Beca 18 sea una universidad ni de que las preguntas sean de un examen oficial. Conserva las atribuciones originales a simulacros PUCP/UNMSM en comentarios de procedencia o en un informe externo. Omite `anio_examen` si no se conoce un año de examen de BECA18; no uses el año del simulacro original como año de BECA18. Para otros documentos, sigue la clasificación que indique el usuario, sin imponer BECA18 globalmente.
- **Numeración visible:** cada paso de la solución debe ser un párrafo separado que empiece literalmente por `**1.**`, `**2.**`, etc. No uses listas Markdown automáticas (`1. texto`). Separa los pasos con líneas en blanco y conserva tablas/fórmulas como bloques normales, sin sangría de lista.
- **Tablas legibles:** exporta las tablas del enunciado y de la solución como bloques LaTeX con `array`, siguiendo la sección «Tablas en Markdown + LaTeX». No uses tablas Markdown con barras (`| Mes | Días |`), ya que actualmente sus celdas se muestran sin separación en la app.
- **Imágenes propias:** recrea las figuras necesarias con una composición original, fiel a los datos, etiquetas, medidas, relaciones geométricas y significado del PDF. Las imágenes del PDF solo sirven como referencia; no entregues recortes ni simples filtros de la ilustración original.
- **Marca de agua:** usa el logo real de `public/brand/logo.png` (o la variante adecuada de `public/brand/`) de forma discreta, sin tapar datos. Inspecciona el resultado: ninguna etiqueta ni medida puede cambiar o quedar oculta. Identifica las figuras como recreadas, sin atribuir el nuevo dibujo al libro.

## Tablas en Markdown + LaTeX

Inserta cada tabla entre delimitadores `$$` en líneas independientes, con una línea en blanco antes y después del bloque. No incluyas cercas de código en el ejercicio exportado: las cercas del ejemplo solo sirven para documentar la sintaxis.

- Usa `\begin{array}{...}` y `\end{array}`. Define una alineación por columna: `l` para texto, `r` para cantidades o `c` para matrices/tablas numéricas centradas. Separa columnas con `|` cuando necesiten líneas verticales.
- Separa las celdas con `&` y termina cada fila salvo la última con `\\`.
- Escribe encabezados y etiquetas de texto con `\text{...}`, conservando tildes. Escapa los caracteres especiales de LaTeX cuando corresponda.
- Añade `\hline` después del encabezado y antes de una fila de total. En tablas de doble entrada, puedes añadirlo entre las filas de datos para formar una cuadrícula.
- Conserva todos los datos originales y comprueba que cada fila tenga el mismo número de columnas. No rasterices una tabla que pueda representarse de esta forma.

Ejemplo de texto y cantidades:

```latex
$$
\begin{array}{l|r}
\text{Mes} & \text{Días} \\
\hline
\text{Agosto} & 1 \\
\text{Setiembre} & 30 \\
\text{Octubre} & 31 \\
\text{Noviembre} & 30 \\
\text{Diciembre} & 25 \\
\hline
\text{Total} & 117
\end{array}
$$
```

Para una tabla numérica de doble entrada de cuatro columnas, usa `{c|c|c|c}`; por ejemplo, `\text{Caja B / Caja A} & 3 & 4 & 5 \\` como encabezado y `6 & 9 & 10 & 11 \\` como fila de datos.

## Regla general

- **Un archivo `.md` por ejercicio.** Nunca combines varios ejercicios en un solo archivo.
- Nombra cada archivo de forma descriptiva y única, por ejemplo:
  `{universidad}-{anio_examen}-{tema}-{numero}.md`
  Ejemplo: `uninacional-2023-aritmetica-01.md`
  Si el ejercicio es **genérico** (sin universidad asociada), usa `general` en lugar de la universidad en el nombre del archivo (esto es solo para el nombre del archivo; el frontmatter no debe llevar el campo `universidad` en ese caso):
  `general-aritmetica-01.md`
- Si el ejercicio tiene imágenes asociadas (enunciado y/o solución), colócalas en una subcarpeta `img/` junto a los archivos `.md`, y nómbralas igual que el archivo del ejercicio con un sufijo:
  - `{nombre-base}-enunciado.png`
  - `{nombre-base}-solucion.png`
- Entrega siempre el resultado como una estructura de carpetas:
  ```
  ejercicios/
  ├── uninacional-2023-aritmetica-01.md
  ├── uninacional-2023-aritmetica-02.md
  └── img/
      ├── uninacional-2023-aritmetica-01-enunciado.png
      └── uninacional-2023-aritmetica-02-solucion.png
  ```

## Estructura de cada archivo

Cada archivo tiene dos partes: **frontmatter YAML** (metadata) y **cuerpo en markdown** (contenido).

```markdown
---
tema: <string>
subtema: <string>
universidad: <string>
anio_examen: <número>
dificultad: facil | media | dificil
etiquetas: [<string>, <string>, ...]
respuesta_correcta: <letra de la alternativa correcta, ej. A/B/C/D>
formato_version: 1
imagen_enunciado: <ruta relativa, opcional>
imagen_solucion: <ruta relativa, opcional>
---

## Enunciado

<Texto del enunciado en markdown. Usa LaTeX para fórmulas: `$...$` inline, `$$...$$` en bloque.>

## Alternativas

A) <alternativa>
B) <alternativa>
C) <alternativa>
D) <alternativa>

## Solución paso a paso

**1.** <Primer paso, en markdown + LaTeX.>

**2.** <Segundo paso. Continuar con un párrafo separado por paso.>
```

### Reglas de cada campo del frontmatter

| Campo | Obligatorio | Reglas |
|---|---|---|
| `tema` | Sí | Debe ser uno de los temas ya existentes en el catálogo de la app (ver `references/catalogo.md` si el usuario lo proporciona). Si no estás seguro de que el tema exista en su catálogo, pregúntale al usuario antes de asumirlo, o dejarlo tal como aparece en el PDF y avisar que debe verificarse. |
| `subtema` | No, pero recomendado | Igual que `tema`: debe corresponder al catálogo existente. Si el PDF no lo indica explícitamente, puedes inferirlo del contenido, pero indícalo al usuario para que lo confirme. |
| `universidad` | No | Usa la categoría de destino que indique el usuario; para el libro Pronabec de esta muestra, `BECA18`. Si no hay una clasificación indicada, usa la universidad de origen del PDF cuando conste; en ejercicios genéricos omite el campo. Conserva la procedencia original por separado cuando difiera del destino. |
| `anio_examen` | No | Año del examen de origen, como número (ej. `2023`), no como texto. |
| `dificultad` | Sí | Únicamente uno de estos tres valores: `facil`, `media`, `dificil`. Si el PDF no indica dificultad, infiere un valor razonable según la complejidad del ejercicio, y menciónalo al usuario como una estimación tuya, no un dato confirmado. |
| `etiquetas` | No | Lista en formato YAML inline: `[etiqueta1, etiqueta2]`. Usa términos cortos y relevantes (ej. temas específicos, tipo de operación). |
| `respuesta_correcta` | Sí | Una sola letra correspondiente a la alternativa correcta (`A`, `B`, `C`, o `D`, según corresponda). Debe coincidir exactamente con una de las alternativas listadas en el cuerpo. |
| `formato_version` | Sí | Siempre `1` (versión actual del formato, ver nota al final). |
| `imagen_enunciado` | No | Solo si el ejercicio requiere una imagen para el enunciado (ej. diagrama, gráfico). Ruta relativa dentro de `img/`. |
| `imagen_solucion` | No | Solo si la solución requiere una imagen (ej. gráfico de la resolución). Ruta relativa dentro de `img/`. |

## Reglas de contenido

- **Nunca inventes la respuesta correcta si el PDF la indica explícitamente.** Solo genera una respuesta calculada por ti cuando el PDF no la incluya (ver sección "Ejercicios sin solución en el PDF" más abajo).
- **Nunca inventes el tema/subtema si no es evidente.** Si tienes dudas razonables, infiere el valor más probable pero indícalo explícitamente en tu resumen para que el usuario lo confirme antes de importar.
- **Preserva las fórmulas matemáticas en LaTeX**, no las conviertas a texto plano ni a imágenes salvo que el PDF ya las presente como imagen (en cuyo caso, usa `imagen_enunciado` o `imagen_solucion`).
- **Recrea imágenes solo cuando sean necesarias** para entender el enunciado o la solución (ej. diagramas geométricos, gráficos). No generes capturas de texto que puedas transcribir directamente como markdown/LaTeX.
- Si un ejercicio del PDF viene incompleto por razones distintas a la solución (ej. falta una alternativa, el enunciado está cortado), **no lo generes con datos faltantes inventados** — inclúyelo en una lista aparte de "ejercicios incompletos, no generados" en tu resumen final.

## Recreación de imágenes (enunciado / solución)

Cuando un ejercicio requiera imagen (diagrama, gráfico, figura geométrica, etc.):

- Lee y verifica la figura original como referencia; renderiza la página si es necesario. Crea una ilustración nueva, no una copia de los píxeles o un simple cambio de colores.
- Conserva todos los datos relevantes; no añadas pistas de la solución dentro de una imagen de enunciado. Para diagramas exactos prioriza una construcción verificable; para ilustraciones usa la herramienta de generación de imágenes disponible.
- Usa un fondo limpio, composición ajustada y etiquetas legibles. Añade la marca de agua del logo real de Admi-Tec y comprueba visualmente la fidelidad matemática antes de entregar.
- Guarda cada imagen en `img/` siguiendo la convención de nombres ya indicada (`{nombre-base}-enunciado.png` / `{nombre-base}-solucion.png`)
- Si un ejercicio no requiere imagen (el enunciado/solución se puede transcribir completamente en markdown/LaTeX), no generes una imagen innecesaria — prioriza texto real sobre imágenes siempre que sea fiel al contenido original

## Ejercicios sin solución en el PDF

Algunos PDFs solo traen el enunciado y las alternativas, sin desarrollo de solución ni respuesta correcta indicada. En ese caso:

1. **Intenta resolver el ejercicio tú mismo**, razonando paso a paso como lo harías normalmente
2. Si logras resolverlo con confianza:
   - Completa `respuesta_correcta` con la alternativa que corresponda a tu resultado
   - Escribe la sección "Solución paso a paso" con tu desarrollo
   - Marca este ejercicio en tu resumen final como **"resuelto por IA, no venía en el PDF original"**, para que el usuario sepa que esa solución no proviene de la fuente original y pueda verificarla si quiere
3. Si **no logras resolverlo con confianza** (ejercicio ambiguo, faltan datos, fuera de tu capacidad de verificarlo con seguridad):
   - Deja la sección "Solución paso a paso" **en blanco** (o con una nota breve tipo "_Solución pendiente de completar_")
   - Deja `respuesta_correcta` vacío o con un valor claramente marcado como no confirmado (ej. `respuesta_correcta: null`)
   - Inclúyelo en tu resumen final como **"sin solución, requiere revisión manual"**
- Nunca mezcles ambos casos sin dejarlo explícito: el usuario debe poder distinguir fácilmente, mirando tu resumen, cuáles soluciones vienen del PDF original, cuáles las resolviste tú, y cuáles quedaron sin resolver

## Flujo de trabajo recomendado

1. Lee el PDF y extrae solo la cantidad o selección solicitada, recreando las imágenes necesarias según las reglas anteriores.
2. Para cada ejercicio sin solución en el PDF, intenta resolverlo tú mismo según las reglas de la sección "Ejercicios sin solución en el PDF".
3. Antes de generar los archivos, muestra al usuario un resumen claro, agrupando los ejercicios en:
   - Completos, tal como vienen en el PDF (enunciado + alternativas + solución + respuesta correcta)
   - Resueltos por IA (el PDF no traía solución/respuesta, pero se resolvió con confianza)
   - Sin solución, requieren revisión manual (no se pudo resolver con confianza)
   - Incompletos, no generados (falta enunciado, alternativas u otro dato esencial más allá de la solución)
   - Además, indica cuántos ejercicios llevan imagen recreada y de cuáles se infirió tema/subtema/dificultad
4. Genera un archivo `.md` por ejercicio siguiendo esta estructura exacta, con los pasos `**1.**`, y las imágenes recreadas en `img/`. Si el usuario ya autorizó la extracción y su alcance está claro, continúa sin pedir una confirmación adicional; consulta solo decisiones necesarias que falten.
5. Entrega todo en la estructura de carpetas indicada arriba, lista para que el usuario la suba al importador de su app.

## Nota sobre versionado

El campo `formato_version` existe para poder identificar con qué versión de este formato fue generado cada ejercicio, en caso de que el formato cambie en el futuro (nuevos campos, cambios de estructura). Usa siempre `1` a menos que el usuario indique explícitamente que está usando una versión distinta de este skill.
