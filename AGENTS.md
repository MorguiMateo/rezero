# Code conventions

- **Language:** all code comments, variable names, and function names must be written in English.
- **File names:** use `kebab-case` (e.g. `user-profile.tsx`, `format-date.ts`).
- **Variables and functions:** use `camelCase` (e.g. `userName`, `getUserById`).
- **Design tokens:** Tailwind theme tokens (colors, fonts) and custom `@utility` names must be in English and `kebab-case` (e.g. `emilia-violet-500`, `font-reading`). User-facing text stays in Spanish.
- **Colors and themes:** raw character palettes live in `src/styles/palettes.css` (one commented block per character); themes live in `src/styles/themes.css` and are selected with `data-theme` (Satella is the default). A single header button shows the current character's image and cycles themes on each click (Satella → Emilia → Beatrice → Subaru → Echidna → Rem → Shaula → Ram → Satella; dark and light alternate, each group ordered from most to least protagonist); the choice is saved in `localStorage` (allowed only for the theme and the reading progress, see section 1) and applied before first paint by a tiny inline script in `<head>` (see section 1). Components must use the semantic tokens (`bg-background`, `text-foreground`, `text-primary`, `bg-button`…), never raw palette tokens like `bg-rem-hair`, so every theme keeps working.

# Reglas de arquitectura: pre-render con React Router sobre Cloudflare

Este proyecto es un lector de novela ligera y manga. El contenido se pre-renderiza durante el build y se sirve como estático desde Cloudflare. No hay cuentas, sesión, favoritos ni historial; en el navegador solo se guardan el tema y el progreso de lectura.

## Stack (no cambiar sin preguntar)

- **Decisión autorizada:** React 19, TypeScript, Tailwind CSS 4, React Router en Framework Mode y Vite. No volver a introducir Next.js, OpenNext ni un router paralelo.
- Tailwind usa su plugin nativo `@tailwindcss/vite`.
- `react-router.config.ts` usa `ssr: false` y `prerender`; esto desactiva SSR en tiempo de request, no el renderizado de HTML durante el build.
- Despliegue previsto en Cloudflare Workers Static Assets, servido desde `build/client` mediante `wrangler.jsonc`. No hay Worker SSR ni backend, y no está previsto.
- No agregar `@cloudflare/vite-plugin` a esta configuración: actualmente no admite el prerender de React Router. No añadir backend sin preguntar.
- Contenido (capítulos, metadatos): las novelas se descargan una vez y se convierten a Markdown (ver sección 4). No se hace `fetch` a una fuente externa durante el build; `src/lib/content/` lee los archivos locales con APIs de Node. `content/` es el submódulo git del repositorio privado `MorguiMateo/rezero-content`: el repo de la app solo guarda el puntero al commit, nunca el texto de las novelas. Los cambios de contenido se commitean en el submódulo y luego se actualiza el puntero en este repo. El CI (`.github/workflows/deploy.yml`) clona el submódulo con un token de solo lectura (`CONTENT_REPO_TOKEN`), verifica y publica `main` con `wrangler deploy`.
- Hosting gratuito: el sitio se publica en el subdominio `*.workers.dev` de Cloudflare; no hay dominio propio ni gastos.
- Imágenes de novela (portadas e ilustraciones): descargar, convertir a `.webp` y guardarlas en `content/images/` (repo privado de contenido). El build las publica con el sitio bajo `/img/` como assets estáticos (mismo dominio, CDN de Cloudflare, peticiones gratis e ilimitadas).
- Páginas de manga: demasiadas para el repo y para el límite de archivos del sitio (20.000 por versión en Workers Free). **PENDIENTE:** se servirán desde uno o más proyectos de Workers aparte, solo con assets estáticos, cada uno en su `*.workers.dev`; ver sección 3.
- Caché de páginas: Static Assets, sin ISR. Nuevos capítulos: commitearlos en `content/`, actualizar el puntero del submódulo y hacer rebuild + deploy (automático con GitHub Actions al hacer push a `main`).
- Empezar con Workers Free mientras alcance; revisar los límites vigentes de cantidad y tamaño de assets antes de añadir dependencias pesadas o muchas rutas.

## 1. Qué es estático y qué es dinámico

Estático, siempre pre-renderizado:

- Home, catálogo, obra e índice de volúmenes.
- Cada capítulo de novela.
- Carcasa del lector de manga: título, navegación y lista de páginas.
- Página 404 propia. No hay pie de página, créditos ni sección de proyectos.

Dinámico, solo en el cliente:

- Cambio de tema con el botón de personajes, guardado en `localStorage`. Sin valor guardado, el tema es Satella.
- Progreso de lectura de novela, guardado solo en el navegador (`localStorage`, clave `reading-progress`, acceso único mediante `src/lib/reading-progress.ts`): posición por bloque de cada capítulo, capítulos terminados y último capítulo por obra. Se usa para el aviso «Continuar donde lo dejaste», «Continuar leyendo» y las marcas del índice. Se lee después de hidratar; el HTML prerenderizado nunca depende de él.

Fuera de alcance (no implementar sin preguntar):

- Cuentas, inicio de sesión, sincronización entre dispositivos, favoritos, historial y cualquier otra preferencia guardada (tamaño de letra, etc.). No usar `localStorage` para nada salvo el tema y el progreso de lectura, ni cookies ni APIs.

Reglas:

- Las rutas de contenido son módulos React Router con HTML completo generado en el build. Cargar contenido con `loader` de build, no con `clientLoader`, efectos ni fetch de request.
- Componentes de ruta normales se renderizan también durante el build: no usar `window`, `document` ni `localStorage` durante el render. El HTML se genera siempre con el tema Satella.
- Excepción única: un script inline pequeño y síncrono en `<head>` de `src/root.tsx` lee el tema de `localStorage` (dentro de `try/catch`, validando que sea un tema conocido) y fija `data-theme` en `<html>` antes del primer pintado, para evitar el destello de Satella. `<html>` lleva `suppressHydrationWarning` solo por ese atributo. El botón lee el tema actual de `document.documentElement` después de hidratar, nunca durante el render.
- El hosting estático no ejecuta `action`, `headers` ni endpoints de servidor de React Router; no usarlos.

## 2. Rutas: segmentos, no query params

- Identidad del contenido en el path:
  - `/novela/:work` (obra)
  - `/novela/:work/:volume` (volumen)
  - `/novela/:work/:volume/:chapter` (capítulo)
  - `/manga/:work/:volume/:chapter` (obra, tomo, capítulo)
- Los slugs son los nombres de carpeta y archivo de `content/` (minúsculas, dígitos y guiones), por ejemplo `/novela/re-zero/volumen-01/capitulo-01`.
- Declarar rutas en `src/routes.ts`. Registrar **cada URL existente** en `prerender`: `react-router.config.ts` las enumera con `getNovelPaths()` de `src/lib/content/`. `prerender: true` solo enumera rutas sin parámetros.
- No usar query params para decidir qué contenido se carga en un loader de build. Reservarlos para filtros, orden o pestañas de UI con `useSearchParams` en el cliente.
- Slugs inexistentes deben devolver HTTP 404. Mantener `assets.not_found_handling: "none"`; no configurar fallback SPA ni una redirección comodín a `index.html` o `__spa-fallback.html`.
- Mantener `routeDiscovery: { mode: "initial" }` para no depender de un endpoint de manifiesto de rutas en runtime.
- Cada ruta de contenido define `meta` (título, descripción, canonical y Open Graph) a partir de los mismos datos del loader. El dominio canonical aún debe decidirse.

## 3. Imágenes

- Usar `<img>` o `<picture>`, sin optimización de imágenes en runtime. No activar Cloudflare Images sin preguntar.
- Imágenes de contenido ya optimizadas, en `.webp` y tamaños necesarios.
- Páginas de manga con `width`, `height`, `loading="lazy"` y `decoding="async"`; primeras 1–2 páginas con prioridad (`fetchPriority="high"`, sin lazy loading).
- Novela: `content/images/` se sirve en `/img/` (en dev con un middleware de `vite.config.ts`; en el build se copia a `build/client/img/`). `public/_headers` les da caché de un día porque su URL no cambia al reemplazarlas.
- Manga: las páginas no van en ningún repositorio. Se suben con `wrangler deploy` a proyectos de Workers solo de assets (sin script), fuera de este sitio. No usar `*.r2.dev` ni enlazar imágenes de sitios ajenos (hotlinking).
- No guardar imágenes de contenido en `public/` ni en el repositorio de la app. `public/` solo contiene `favicon.svg`, `_headers` y otros assets de interfaz; los retratos del botón de tema están en `src/assets/characters/*.webp` y se incrustan en el CSS (variable `--theme-portrait` de cada tema, utilidad `theme-portrait`) para que aparezcan en el primer pintado; el logo es SVG en línea en `src/components/`; las fuentes se empaquetan desde Fontsource.

## 4. Contenido fuera del bundle

- Capítulos y metadatos viven en `content/`, fuera de `src/`; nunca importarlos como módulos ni como JSON dentro de `src/`.
- Formato: un archivo Markdown (CommonMark + notas al pie GFM) por capítulo, con frontmatter YAML (`title`, `number`). Metadatos de obra y volumen en `work.yaml` y `volume.yaml`:

  ```
  content/novela/<obra>/work.yaml
  content/novela/<obra>/<volumen>/volume.yaml
  content/novela/<obra>/<volumen>/<capitulo>.md
  ```

- `work.yaml` admite dos campos opcionales: `label` (etiqueta sobre el libro en el inicio: «Principal», «Precuela»…) y `cover` (ruta de la portada dentro de `content/images/`, con la misma validación que las ilustraciones). Sin `cover`, el inicio dibuja una portada genérica con los colores del tema.
- Las novelas descargadas (normalmente EPUB, que por dentro es XHTML + imágenes) se convierten una sola vez a este formato, por ejemplo con `pandoc`, limpiando clases y estilos del editor. El build no parsea EPUB.
- Convenciones Markdown: cursiva para énfasis y pensamientos, `***` para cambios de escena, `[^n]` para notas del traductor, `![alt](ruta)` para ilustraciones. No usar MDX ni HTML crudo dentro del Markdown.
- Las ilustraciones viven en `content/images/` como WebP. El Markdown guarda una ruta relativa a esa carpeta (`re-zero/v01/ilust-03.webp`) y `content/images.json` mapea cada ruta a `{ "width", "height" }`. El build antepone `/img/` y añade `width`, `height`, `loading="lazy"` y `decoding="async"`. Falla si el archivo no existe, si no está en el manifiesto o si la imagen es una URL externa.
- El Markdown se convierte a HTML en el `loader` de build (por ejemplo con `remark`/`rehype`); el parser no debe llegar al bundle del cliente.
- Acceso único mediante `src/lib/content/novels.server.ts`: `getWorks()`, `getWork(work)`, `getVolume(work, volume)`, `getChapter(work, volume, chapter)` y `getNovelPaths()`. Valida los YAML y frontmatter y falla el build ante datos inválidos, números repetidos o el submódulo sin inicializar. Las rutas no leen `content/` directamente.
- Separar acceso exclusivo de build en módulos `.server.ts` cuando corresponda; ningún secreto debe entrar al bundle cliente ni a datos serializados.
- HTML y archivos `.data` prerenderizados son salida pública del build, no una base de datos privada.
- Código exclusivo de build puede usar APIs de Node (`fs`) para leer `content/`.
- Antes de añadir dependencias pesadas, verificar su impacto; funcionalidades no críticas pueden cargarse con import dinámico en cliente.

## 5. Publicación de capítulos

- Contenido nuevo o corregido requiere build + deploy; no hay ISR ni invalidación on-demand.
- El proceso debe convertir las novelas nuevas a Markdown, guardar sus imágenes en `content/images/`, enumerar todas las rutas y publicar los assets generados.
- No desplegar un bundle de servidor ni sustituir páginas ausentes con SSR por request.
- Un cambio a caché dinámica/ISR exige una decisión de arquitectura explícita, fuera de esta base estática.

## 6. Verificación obligatoria

Después de cambios de rutas, root o datos:

- Ejecutar `pnpm lint`, `pnpm typecheck` y `pnpm build`.
- Revisar el output y los HTML de `build/client`: cada ruta de contenido debe tener su documento completo, no solo una carcasa para JavaScript.
- Ejecutar `pnpm preview` (Wrangler local) y comprobar rutas conocidas, CSS/JS/fuentes/`favicon.svg` y HTTP 404 de una ruta inexistente. `pnpm dev` no sustituye esta verificación.
- Comprobar archivos `.data` cuando haya loaders y navegación cliente; detener los servidores iniciados durante la verificación.

## Ante la duda

Si una funcionalidad parece requerir contenido dinámico por request, proponer primero prerender + componente cliente y consultar antes de cambiar el modelo.
