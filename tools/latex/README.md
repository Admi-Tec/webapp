# Figuras de ejercicios — estándar

Toda imagen de ejercicio (geometría, gráficas de funciones, diagramas) se
genera con [`plantilla.tex`](./plantilla.tex) y se sube al bucket
`exercise-images` **en formato SVG**. Este documento es la referencia del
flujo y de las reglas de estilo.

## Flujo de trabajo

1. **Overleaf**: crea un proyecto (o reutiliza uno "Figuras MatePre") y pega
   `plantilla.tex` como `main.tex`.
2. Dibuja la figura dentro del `tikzpicture` usando **solo los estilos de la
   plantilla** (`figura`, `auxiliar`, `resalte`, `punto`, `eje`, `cota`).
3. Compila y exporta a SVG por una de estas dos vías:

   **A. PDF → Inkscape (recomendada)**
   - Descarga el PDF (la clase `standalone` lo recorta al tamaño exacto).
   - `inkscape figura.pdf --export-type=svg --export-filename=figura.svg`
     (o abrir el PDF en Inkscape y "Guardar como → SVG plano").

   **B. SVG directo en Overleaf (dvisvgm)**
   - Cambia la primera línea a
     `\documentclass[dvisvgm, tikz, border=4pt]{standalone}`.
   - Crea un archivo llamado `latexmkrc` (sin extensión) con:

     ```perl
     $dvi_mode = 1;
     $pdf_mode = 0;
     $success_cmd = 'dvisvgm --no-fonts --exact %R.dvi';
     ```

   - Recompila (el visor de PDF queda vacío: es normal) y descarga el `.svg`
     desde **Logs and output files → Other logs and output files**.

4. **Verifica** el SVG arrastrándolo a una pestaña del navegador: lo que ves
   ahí es exactamente lo que verá el estudiante.
5. Súbelo desde el admin. Nombre sugerido: `<tema>-<descripcion-corta>.svg`
   (ej. `geometria-triangulo-altura.svg`).

## Reglas de estilo

- **Fidelidad geométrica**: los ángulos y proporciones del dibujo son los
  reales del enunciado. Si el ángulo es 60°, se dibuja de 60°.
- **Un solo resalte**: el color ámbar (`resalte` / `relleno resalte`) marca
  únicamente el elemento que el ejercicio pregunta (el área a calcular, el
  ángulo incógnita). Todo lo demás va en tinta, azul o gris auxiliar.
- **Etiquetas siempre en modo matemático**: `$A$`, `$x$`, `$8$` — nunca texto
  plano. La fuente resultante (Computer Modern) es la misma familia que KaTeX
  usa en el enunciado, así figura y texto se ven como un solo sistema.
- **Sin decoración**: nada de sombras, degradados ni colores fuera de la
  paleta de la plantilla.
- **Fondo transparente** (el SVG lo trae por defecto): el papel del cuaderno
  de la app se ve detrás.
- Tamaño de referencia: figuras de ~5–7 cm de ancho en coordenadas TikZ. El
  `border=4pt` de la clase da el margen uniforme; no agregues márgenes extra.

## Paleta

| Estilo | Color | Uso |
| --- | --- | --- |
| `tinta` | `#20242E` | Trazos principales, puntos, etiquetas |
| `azul` | `#33418F` | Marcas secundarias: arcos de ángulo, curvas de funciones |
| `ambar` | `#E8A33D` | Solo el elemento preguntado (uno por figura) |
| `grisaux` | `#9AA0AB` | Líneas auxiliares punteadas y cotas |

Estos valores son la traducción a hex de los tokens OKLCH del design system
de la app (`app-ink`, `app-primary`, `app-highlighter`); si la paleta de la
app cambia, actualizar aquí y en `plantilla.tex`.
