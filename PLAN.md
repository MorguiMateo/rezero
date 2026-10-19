# Plan — Rezero

## Decisión arquitectónica resuelta

El usuario autorizó reemplazar Next.js por **React 19 + TypeScript + Tailwind CSS 4 + React Router (Framework Mode) + Vite**. La base migrada utiliza React Router 8 y Vite 8, versiones estables verificadas en el registry. Este plan y `AGENTS.md` comparten ahora la misma arquitectura.

El objetivo sigue siendo HTML completo en la primera respuesta, SEO y navegación rápida. **No habrá SSR de contenido en tiempo de request:** `ssr: false` + `prerender` genera el HTML durante el build. Cloudflare Workers Static Assets sirve `build/client`; Wrangler permite comprobar el runtime local sin desplegar.

No se utiliza `@cloudflare/vite-plugin`: la documentación de Cloudflare indica que no admite SPA mode ni prerender de React Router. Se separa el build Vite del servicio de assets estáticos.

Referencias: [prerender de React Router](https://reactrouter.com/how-to/pre-rendering), [limitación del plugin Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/), [Static Assets y 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

## Estado y alcance

Estado al 19 de octubre de 2026.

- Publicado en https://biblioteca-de-pleyades.morguimateo1.workers.dev. Cada push a `main` pasa lint, typecheck y build en GitHub Actions y se despliega con `wrangler deploy` (`.github/workflows/deploy.yml`). Sin dominio propio ni backend.
- Home con carruseles de obras, portadas (o portada genérica con los colores del tema) y etiqueta por obra; `/estilos` como guía de estilo.
- Recorrido de novela prerenderizado: obra → volumen → capítulo con navegación anterior/siguiente (también entre volúmenes), leído desde el submódulo `content/`.
- Contenido (todo de un único paquete de EPUB, ver `content/PENDIENTES.md`): novela ligera `re-zero` (tomos 1–31), novela web `re-zero-novela-web` (interludios del arco 3, arco 4, *One Day II* y volúmenes 16–43), `re-zero-precuelas` (6 novelas) y `re-zero-what-if` (7 historias). La novela ligera y la novela web son obras separadas y no se mezclan.
- Importador offline: `scripts/import-epub.py` (EPUB → Markdown con pandoc). Escribe en un directorio de staging nuevo, nunca en `content/`.
- Temas Satella, Emilia, Beatrice, Subaru, Echidna, Rem, Shaula y Ram con botón de personajes, tokens semánticos y fuentes Cormorant, Jost, Literata y JetBrains Mono empaquetadas con Fontsource.
- Progreso de lectura solo en el navegador (`localStorage`, `src/lib/reading-progress.ts`): posición, capítulos leídos, «Continuar donde lo dejaste» y «Continuar leyendo». Modo lectura en el capítulo. Fuera de alcance: cuentas, sesión, sincronización, favoritos, historial y otras preferencias guardadas.
- Imágenes de novela servidas en `/img/` con el propio sitio (no R2), en WebP calidad 90 (los originales son JPG). Cada obra tiene una miniatura `portada-mini.webp` para el inicio.
- Todavía no hay catálogo `/novela`, manga ni página 404 propia.

## Requisitos técnicos

### 1. Prerender y contenido

- Pre-renderizar home, catálogo, obras, volúmenes, capítulos, carcasa del manga y páginas informativas.
- Declarar rutas en `src/routes.ts`; enumerar todas las URLs en `prerender` de `react-router.config.ts`.
- Las novelas se descargan (normalmente EPUB) y se convierten una sola vez a Markdown con frontmatter en `content/`, un archivo por capítulo. Los futuros `loader` leen esos archivos solo en build mediante `src/lib/content/` y los convierten a HTML. Los datos públicos generados se sirven como archivos `.data` para navegación.
- No cargar el texto de capítulos después de hidratar ni obtenerlo por request en un Worker.
- Slugs ausentes devuelven 404 real; sin fallback SPA ni SSR de rescate.
- Metadatos por ruta y, cuando se decida el dominio, canonical y Open Graph.

### 2. Cloudflare

- Servir `build/client` mediante Workers Static Assets y `wrangler.jsonc`.
- `html_handling: "drop-trailing-slash"`, `not_found_handling: "none"`.
- No implementar un Worker SSR ni backend/API.
- Hoy en `*.workers.dev`; un dominio propio queda como decisión pendiente.
- Build + deploy para publicar capítulos. Automatizar detección de novedades posteriormente.

### 3. Imágenes y assets

- Imágenes de novela en WebP dentro de `content/images/` (repo privado), publicadas en `/img/`; páginas de manga en Workers de assets aparte. Nunca en el repo de la app ni en `public/`.
- Usar tamaños explícitos, lazy loading fuera del viewport inicial y prioridad para imágenes LCP/primeras páginas del manga.
- `<picture>` cuando se necesiten variantes o fallbacks; no procesar imágenes en runtime.
- Mantener code splitting por ruta y carga diferida de componentes no críticos.
- Fuentes de interfaz servidas localmente; no depender de Google Fonts durante build o navegación.

### 4. Performance y navegación

- HTML completo, minificación de Vite y assets con hashes.
- Prefetch selectivo mediante `<Link prefetch="intent">` o `viewport` según el flujo, sin precargar todo el catálogo. El enlace actual a `/estilos` usa `intent`.
- Definir y medir políticas de caché: assets con hash pueden ser immutable; HTML y `.data` deben mantenerse coherentes al publicar contenido nuevo. No imponer TTLs largos sin verificar actualización.
- Evaluar Brotli y métricas reales en Cloudflare; agregar Web Vitals posteriormente.
- Preconnect/DNS-prefetch solo para dominios externos realmente utilizados (por ejemplo, los futuros `*.workers.dev` del manga).

## Referencia de diseño

Modelo visual y de estructura: [ranoa.lat](https://www.ranoa.lat/). Se toma su organización y estética (cabecera fija, hero con escena de fondo, paneles con borde ornamental, carruseles de obras con tarjetas en forma de libro), adaptada a nuestra identidad (paletas de personajes, tipografías propias) y a nuestro alcance: **sin** pie de página, botón "Entrar", cuenta, créditos, proyectos, insignias "Nuevo" ni nada que dependa de sesión.

## Fases por sección

Se trabaja una sección de la página a la vez: diseño → datos que necesita → implementación → verificación (sección 6 de `AGENTS.md`). Las tareas transversales (contenido real, imágenes, performance, deploy) van aparte y se intercalan cuando una sección las necesite.

### Sección 0: Base técnica ✅

- [x] React 19, TypeScript, Tailwind 4, React Router + Vite; migración desde Next.js.
- [x] Routing, root, metadatos, prerender y Static Assets con Wrangler.
- [x] Formato de contenido (Markdown + YAML) en el submódulo privado `content/`.
- [x] Capa `src/lib/content/` y recorrido obra → volumen → capítulo con contenido de ejemplo, todas las URLs en `prerender`.
- [x] Paletas, temas y fuentes autoalojadas; guía en `/estilos`.

### Sección 1: Cabecera global ✅ (salvo menú móvil)

La comparten todas las páginas, por eso va primero. No hay pie de página.

Referencia en ranoa.lat: barra fija con el logo a la izquierda y la navegación centrada en versalitas espaciadas. El enlace activo se marca con un ✦ encima y un subrayado. A la derecha está "Entrar"; en nuestro caso, el botón de tema.

- [x] Layout en `src/root.tsx` con enlace "Saltar al contenido" a `#contenido-principal`; cabecera fija (`sticky`).
- [x] Logo "Biblioteca de Pléyades" que lleva a `/`. Navegación: Inicio, Novela y Manga, con el activo resaltado (✦ + subrayado).
- [x] `/novela` y `/manga` prerenderizadas con "Próximamente" hasta las secciones 3 y 7.
- [x] Botón de personajes en lugar de "Entrar": imagen del personaje actual que rota Satella → Emilia → Beatrice → Subaru → Echidna → Rem → Shaula → Ram, guardada en `localStorage` y aplicada por un script inline en `<head>` antes del primer pintado. Todos los retratos van en el HTML y el CSS muestra el del tema activo.
- [ ] Móvil: botón de menú (hamburguesa) y botón de tema en cuadros con borde; menú desplegable accesible, sin librerías. **Por decidir:** hoy los tres enlaces caben a 360 px y en móvil el logo queda solo con las estrellas.
- [x] Logo: siete estrellas de las Pléyades + nombre (`pleiades-mark.tsx`, `public/favicon.svg`). Botón de tema: iconos circulares estilo Crunchyroll tomados de los iconos oficiales de la [web del anime](https://re-zero-anime.jp/tv/character/) (Emilia: ficha actual; Rem y Ram: temporada 1; Subaru: arco 6; Beatrice, Echidna y Shaula: ficha actual). Satella no tiene ficha oficial: su icono es un recorte de un fotograma del anime (temporada 2) tomado de la wiki de Fandom, 96×96 WebP en `public/characters/`. Son imágenes con copyright (© Nagatsuki/KADOKAWA); se usan por decisión del usuario.

### Sección 2: Home (`/`) — casi terminada

Referencia en ranoa.lat, de arriba abajo:

1. **Hero:** imagen de escena de fondo (en Ranoa, una biblioteca) que también queda detrás de la cabecera. Encima, el título enorme en versalitas "Biblioteca de Pléyades" y un separador con ✦. Ranoa pone debajo "Inicia sesión · Sincroniza tu progreso"; aquí se omite o se reemplaza por un subtítulo corto.
2. **Panel "Novelas":** panel con borde ornamental fino y un motivo decorativo de fondo (en Ranoa, una rosa de los vientos). Rótulo "Colección literaria", título "Novelas" y separador.
   - Carrusel de **tarjetas con forma de libro**: tapa con ilustración, lomo y páginas visibles, y el título y "N volúmenes" sobre la tapa. Encima de cada libro va su tipo: Principal, Secuela, Precuela, Spin-off, Extras o Especial.
   - Escritorio: 5 libros por vista y flechas en los bordes del panel, deshabilitadas en los extremos.
   - Móvil: 2 por vista con scroll-snap, "Desliza para ver más" y puntos de paginación.
3. **Panel "Mangas":** mismo panel con "Colección ilustrada" y portadas planas en lugar de libros. Se muestra cuando exista la sección de manga.
4. Sin pie de página.

El HTML prerenderizado debe incluir todas las tarjetas. El carrusel funciona con scroll nativo aunque no haya JavaScript; las flechas y los puntos son una mejora que se activa al hidratar.

Datos:

- [x] `label` opcional en `work.yaml` (texto libre: «Principal», «Precuela»…) sobre cada libro.
- [ ] Ampliar `work.yaml` con `order` para ordenar el carrusel (y, si hace falta filtrar, `category` como enum), validados en `novels.server.ts`.
- [x] Exponer en `WorkSummary` el número de volúmenes (`volumeCount`), calculado a partir del contenido.
- [x] `cover` opcional en `work.yaml` (ruta dentro de `content/images/` + `content/images.json`; la home usa `portada-mini.webp`). Sin portada, el libro se dibuja con CSS en los colores del tema y el título sobre la tapa.

Implementación:

- [x] Paneles con borde (`FramedSection` en `home.tsx`), `book-cover` y `carousel`; «Continuar leyendo» arriba.
- [ ] Hero con escena de fondo.
- [ ] Decoración (bordes, separadores, rosa de los vientos) en CSS/SVG con tokens semánticos, para que funcione en los cuatro temas.
- [ ] **Necesito del usuario:** imagen de fondo del hero (asset de interfaz en `public/`, optimizada a WebP). Mientras tanto, degradado del tema.
- [ ] `meta` de la home con título, descripción y Open Graph.

Verificación:

- [x] `build/client/index.html` con las tarjetas completas (falta el hero).
- [ ] Probar los cuatro temas, en móvil y escritorio.
- [ ] Sin CLS: imágenes con `width`/`height` y la del hero con prioridad.

### Sección 3: Catálogo de novelas (`/novela`)

- [ ] Nueva ruta prerenderizada con todas las obras agrupadas o filtrables por tipo (filtros con `useSearchParams` en cliente, no en el loader).

### Sección 4: Obra (`/novela/:work`)

- [ ] Cabecera de obra (título, autor, tipo, descripción, portada) y lista de volúmenes en tarjetas.

### Sección 5: Volumen (`/novela/:work/:volume`)

- [ ] Portada del volumen, índice de capítulos y navegación entre volúmenes.

### Sección 6: Lector de capítulo (`/novela/:work/:volume/:chapter`)

- [ ] Tipografía de lectura, ancho de columna, notas al pie, ilustraciones, cambios de escena.
- [ ] Navegación anterior/siguiente/índice arriba y abajo; prefetch del siguiente capítulo.

### Sección 7: Manga (`/manga`, `/manga/:work/:volume/:chapter`)

- [ ] Capa de contenido de manga (metadatos + lista de páginas con dimensiones), rutas y `prerender`.
- [ ] Workers aparte solo con assets (`*.workers.dev`) para las páginas, fuera de cualquier repo.
- [ ] Catálogo, obra/tomos y carcasa del lector (primeras páginas con prioridad, resto lazy).
- [ ] Activar la fila "Mangas" de la home.

### Sección 8: Página 404

- [ ] Página 404 propia: `build/client/404.html` servida con HTTP 404 (comprobar compatibilidad con `not_found_handling`).

## Tareas transversales

### Contenido e imágenes

- [x] Importador offline EPUB (`scripts/import-epub.py`) → Markdown + WebP + entradas de `content/images.json`, a un staging nuevo. Corrige notas mal enlazadas (`noteLinks`, `unusedNotes`) y notas partidas en varios párrafos.
- [x] Contenido del paquete del 19/10/2026: novela ligera 1–31, novela web (arcos 3–9), precuelas y What if. Se borraron las importaciones anteriores.
- [ ] Conseguir lo que falta: novela ligera 32 en adelante, novela web del arco 10, Re:Zero EX y Tanpenshuu (ver `content/PENDIENTES.md`).
- [ ] Revisar en navegador los volúmenes con receta hecha a mano (What if Ayamatsu, Sasageru, Kasaneru y Rem; arco 4 de la novela web).
- [x] Imágenes en WebP calidad 90 y miniaturas de portada para el inicio.
- ~~Bucket R2 y dominio de imágenes~~: descartado. Las imágenes de novela se publican con el sitio en `/img/`; el manga irá a Workers solo de assets (ver `AGENTS.md`, sección 3).

### Performance

- [x] Prefetch del enlace existente y code splitting por ruta.
- [ ] Prefetch según el flujo real (siguiente capítulo, tarjetas de la home).
- [x] `public/_headers`: `/assets/*` con caché `immutable`, para no revalidar fuentes, CSS y JS en cada recarga.
- [ ] Caché de HTML y compresión en Cloudflare; Web Vitals y peso del bundle.

### Medición y testing

- [ ] Lighthouse y WebPageTest con contenido real; TTFB y caché en Cloudflare.
- [ ] Validar navegación, lectores, accesibilidad y botón de cambio de tema.

### Deployment

- [x] Cuenta de Cloudflare y subdominio `morguimateo1.workers.dev`. Sin dominio propio ni staging.
- [x] GitHub Actions: checkout con submódulo (`CONTENT_REPO_TOKEN`), lint, typecheck, build y `wrangler deploy` en cada push a `main`.
- [x] CI: `pnpm/action-setup@v6`, `actions/checkout@v7` y `actions/setup-node@v7` (Node 24), en `ubuntu-24.04` fijo.
- [x] El sitio queda público en `workers.dev`, sin Cloudflare Access (decisión del usuario).
- [ ] Producción, métricas y alertas.

## Verificación de la base

Comandos obligatorios: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm preview`.

Comprobar HTML completo de ambas rutas, assets y fuentes locales, navegación y 404 de URLs inexistentes en Wrangler. El preview local no demuestra despliegue, rendimiento global ni métricas de producción.

La migración base pasó lint, TypeScript y build. La comprobación HTTP en Wrangler confirmó HTML completo de ambas páginas, sus 16 assets y 404 reales; la revisión visual/hidratación en navegador y las pruebas del futuro producto quedan pendientes.

## Métricas de éxito (objetivos, no resultados)

| Métrica | Objetivo | Herramienta |
|---------|----------|-------------|
| TTFB | < 300 ms en mercados medidos | WebPageTest / Cloudflare Analytics |
| LCP | < 2.5 s | Lighthouse / Web Vitals |
| FCP | < 1.8 s | Lighthouse / Web Vitals |
| CLS | < 0.1 | Lighthouse / Web Vitals |
| Lighthouse | > 90 | Lighthouse |
| Bundle inicial JS | < 100 KB gzip, revisar viabilidad | Análisis de bundle |
| Cache hit ratio | > 90% | Cloudflare Analytics |

## Decisiones pendientes

- Dominio propio: por ahora no; se usa `workers.dev`.
- Menú móvil de la cabecera e imagen del hero.
- Hosting de las páginas de manga (cuántos Workers de assets y cómo subirlas).
