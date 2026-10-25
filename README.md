# Biblioteca de Pléyades

Lector de novela ligera y manga de Re:Zero en español, todavía en construcción.

## Stack

React 19, TypeScript, Tailwind CSS 4, React Router 8 en Framework Mode y Vite 8. Cloudflare Workers Static Assets sirve el resultado estático; no hay servidor SSR en producción.

## Requisitos

- Node.js 22.22+ en la rama 22, o 24+ (ver `engines` en `package.json`).
- pnpm 10.5.2 (versión fijada en `package.json`).
- Python 3 para las pruebas del importador (Pandoc y `cwebp` solo para importar EPUB).

## Desarrollo

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abrir la URL que indique Vite (por defecto `http://localhost:5173`).

Al añadir, retirar o editar Markdown/YAML de `content/novela/`, YAML de `content/manga/` o `content/images.json`, Vite reinicia automáticamente el servidor para actualizar las rutas de prerender y sus datos de navegación. Esto solo afecta al desarrollo: en producción sigue siendo necesario hacer build + deploy.

## Verificación y preview local

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:smoke
```

`typecheck` genera los tipos de las rutas registradas antes de ejecutar TypeScript; solo los dos catálogos están excluidos mientras permanezcan ocultos. `test` ejecuta las pruebas de Node (`node:test` mediante `tsx`) y las del importador en Python.

Con la configuración actual, `build` genera HTML completo para `/`, `/estilos` y cada obra, volumen/serie y capítulo de novela y manga, además del documento 404, JS, CSS y fuentes en `build/client`. La ruta comodín renderiza la página de error y `buildEnd` mueve `/404/index.html` a `build/client/404.html`; `assets.not_found_handling: "404-page"` permite que Cloudflare lo sirva con HTTP 404, sin fallback SPA.

La 404 conserva su HTML estático, navegación nativa y cambio de tema sin iniciar el router: los datos generados para `/404` no corresponden a una URL parametrizada inexistente. Las demás páginas se hidratan normalmente.

`test:smoke` inicia y detiene Wrangler local para comprobar rutas prerenderizadas, HTTP 404, assets y archivos `.data`. Para una revisión visual e hidratación, ejecutar `pnpm preview` (por defecto `http://localhost:8787`) y detenerlo al terminar. No publica nada; `pnpm start` es un alias. Repetir el build después de modificar código.

## Estructura

- `src/root.tsx`: documento HTML, estilos globales e hidratación.
- `src/entry.client.tsx`: hidratación normal y mejora progresiva del tema en la 404 estática.
- `src/routes.ts`: registro de rutas; `src/routes/`: home, guía de estilos, página 404 y catálogos/lectores de novela y manga.
- `src/lib/content/`: lectura de `content/` en build (YAML + Markdown → HTML); `src/lib/seo.ts`: metadatos compartidos.
- `src/styles/`: paletas, temas semánticos y utilidades Tailwind.
- `public/`: `favicon.svg` y futuros assets de interfaz, nunca imágenes de capítulos.
- `react-router.config.ts`: `ssr: false`, URLs de prerender y manifiesto de rutas inicial.
- `vite.config.ts`: plugins React Router y Tailwind, y publicación de `content/images/` en `/img/`.
- `.github/workflows/deploy.yml`: CI que verifica cada cambio y publica `main` en Cloudflare.
- `wrangler.jsonc`: hosting de `build/client` como Static Assets.

Las cuatro fuentes se empaquetan localmente con Fontsource, sin requests a Google Fonts. Los temas usan `data-theme`; Satella es el predeterminado. Un botón con la imagen del personaje rota entre temas y guarda la elección en `localStorage`. Los componentes usan tokens semánticos, no colores de personajes directamente.

## Estado y secciones ocultas

Implementado: home provisional, guía de estilos temporal (noindex), ocho temas, catálogos y recorridos obra → volumen/serie → capítulo de novela y manga. Las novelas incluyen modo lectura, progreso local y conversión offline de EPUB. Cuentas, sincronización, favoritos y otras preferencias guardadas están fuera de alcance.

Los catálogos independientes y sus pestañas «Novela» y «Manga» están **ocultos intencionalmente**. Inicio muestra las novelas y los mangas, y las rutas de obra, volumen/serie y capítulo se prerenderizan siempre. Para habilitar también los catálogos:

1. Cambiar `contentSectionsEnabled` a `true` en `src/lib/sections.ts`.
2. Retirar `src/routes/novel-catalog.tsx` y `src/routes/manga-catalog.tsx` de `exclude` en `tsconfig.json`.
3. Ejecutar las verificaciones anteriores. El build añadirá `/novela` y `/manga` a las rutas de contenido ya existentes.

No hay backend. Las portadas e ilustraciones viven en `content/images/` y se publican en `/img/`; las páginas de manga se sirven desde un Worker estático aparte (ver `AGENTS.md`). El build usa Vite y el preview/despliegue usa Wrangler, sin `@cloudflare/vite-plugin`.

Consultar [PLAN.md](PLAN.md) y [AGENTS.md](AGENTS.md). Referencias: [prerender de React Router](https://reactrouter.com/how-to/pre-rendering) y [React Router en Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/).

## Contenido (submódulo privado)

El texto de las novelas vive en el repo privado `MorguiMateo/rezero-content`, montado en `content/`.

- Clonar todo: `git clone --recurse-submodules https://github.com/MorguiMateo/rezero.git`
- Si ya clonaste sin submódulos: `git submodule update --init`
- Publicar contenido nuevo: commit + push dentro de `content/`, luego en la raíz `git add content && git commit` para actualizar el puntero.

### Importar un EPUB offline

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

## Despliegue (GitHub Actions → Cloudflare)

Cada push a `main` ejecuta lint, typecheck, pruebas, build y smoke del preview, y publica `build/client` en `https://biblioteca-de-pleyades.<subdominio>.workers.dev`. Los pull requests solo se verifican. También se puede lanzar a mano desde la pestaña Actions («Run workflow»).

Para publicar contenido nuevo: commit + push en `content/`, luego actualizar el puntero en este repo (ver arriba) y hacer push a `main`.

Configuración inicial (una sola vez):

1. En el panel de Cloudflare, abrir **Workers & Pages** y elegir el subdominio `*.workers.dev` de la cuenta.
2. Crear un API token en **My Profile → API Tokens → Create Token** con la plantilla **Edit Cloudflare Workers**. Copiar también el **Account ID** (aparece en Workers & Pages).
3. Crear un token de GitHub de grano fino en **Settings → Developer settings → Fine-grained tokens**: solo el repositorio `MorguiMateo/rezero-content`, permiso **Contents: Read-only**.
4. Guardar los tres valores como secretos de este repositorio (Settings → Secrets and variables → Actions), o con `gh secret set <NOMBRE>`:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CONTENT_REPO_TOKEN`

El token de contenido caduca según la fecha elegida al crearlo; al renovarlo, actualizar el secreto.
