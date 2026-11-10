# Importar un EPUB offline

Guardar los originales, recetas e informes **fuera de cualquier repositorio**, en `../rezero-library/`. Todo el contenido actual sale de un único paquete de EPUB: el original está en `originals/cleandrop-2026-10-19/` y las recetas, informes y staging en `imports-2026-10-19/` (detalle en `content/PENDIENTES.md`). La novela ligera (`re-zero`) y la novela web (`re-zero-novela-web`) son obras separadas: nunca mezclar sus volúmenes.

La herramienta requiere Python 3, Pandoc y `cwebp` instalados localmente. No añade dependencias al lector ni descarga contenido durante el build.

```sh
python3 scripts/import-epub.py \
  "../rezero-library/originals/cleandrop-2026-10-19/extracted/Re Zero/Re Zero WN/Re.Zero Arco 5-1.epub" \
  ../rezero-library/imports-2026-10-19/wn-16-recipe.json \
  ../rezero-library/imports-2026-10-19/wn-16-reimport --quality 90
```

`../rezero-library/tools/epub-recipe.py` genera la receta agrupando el spine por el primer `<h1>` de cada documento (Prólogo, Capítulo N, Capítulo 54B, Interludio, Posfacio…) e imprime un resumen; `--work-slug`, `--work-title`, `--label`, `--description` y `--volume-title` eligen la obra y el volumen. Los EPUB sin títulos usables se arman a mano o a partir del índice del EPUB. Revisar la receta antes de importar: los números de sección deben crecer en el orden del spine.

El destino debe ser nuevo. La receta enumera todos los documentos del spine, sus agrupaciones por capítulo y las imágenes; cualquier omisión, duplicación o cambio del orden falla. El script conserva énfasis y notas al pie, convierte imágenes a WebP (sin pérdida por defecto; el contenido actual usa `--quality 90` porque los originales son JPG) y valida texto, imágenes y notas mediante un round-trip de Markdown. Si el EPUB enlaza mal una nota, la receta la corrige con `noteLinks` (`"<archivo>#<id del marcador>": "<id de la nota>"`); las notas de plantilla que ningún capítulo enlaza se declaran en `unusedNotes`. El informe registra procedencia y SHA-256 del EPUB. Revisar también la conversión en navegador: estas comprobaciones no evalúan la fidelidad de la traducción.

Tras revisar el staging, copiar `novela/` e `images/` al submódulo, **fusionando** `images.json` con el manifiesto existente sin perder otras obras. No copiar el EPUB ni el informe a assets públicos. Ejecutar las verificaciones anteriores y revisar el contenido con sus secciones habilitadas antes de publicar. El importador no modifica el submódulo, hace commits ni despliega automáticamente.
