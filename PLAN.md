# Plan — Rezero

## Decisión arquitectónica resuelta

El usuario autorizó reemplazar Next.js por **React 19 + TypeScript + Tailwind CSS 4 + React Router (Framework Mode) + Vite**. La base migrada utiliza React Router 8 y Vite 8, versiones estables verificadas en el registry. Este plan y `AGENTS.md` comparten ahora la misma arquitectura.

El objetivo sigue siendo HTML completo en la primera respuesta, SEO y navegación rápida. **No habrá SSR de contenido en tiempo de request:** `ssr: false` + `prerender` genera el HTML durante el build. Cloudflare Workers Static Assets sirve `build/client`; Wrangler permite comprobar el runtime local sin desplegar.

No se utiliza `@cloudflare/vite-plugin`: la documentación de Cloudflare indica que no admite SPA mode ni prerender de React Router. Se separa el build Vite del servicio de assets estáticos.

Referencias: [prerender de React Router](https://reactrouter.com/how-to/pre-rendering), [limitación del plugin Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/), [Static Assets y 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

## Estado y alcance

- Home provisional y `/estilos`, con HTML prerenderizado.
- Se conservan paletas y temas Emilia, Rem, Ram y Subaru, tokens semánticos y tipografías Cormorant, Jost, Literata y JetBrains Mono; fuentes locales empaquetadas con Fontsource.
- Base de routing, metadatos, ESLint, TypeScript y preview local de Cloudflare.
- Todavía no hay catálogo, lectores funcionales, integración de contenido ni botón de cambio de tema.
- Fuera de alcance: cuentas, sesión, progreso, favoritos, historial y preferencias guardadas. El tema se cambia con un botón de personajes (Emilia → Rem → Ram → Subaru) y se guarda en `localStorage`, aplicado antes del primer pintado por un script inline; por defecto, Emilia.
- No se ha desplegado en producción ni configurado bucket, dominio o CI/CD. No habrá backend.

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
- Definir cuenta, dominio del sitio, bucket R2 y dominio propio de imágenes antes del despliegue real.
- Build + deploy para publicar capítulos. Automatizar detección de novedades posteriormente.

### 3. Imágenes y assets

- Descargar imágenes de contenido, convertirlas a WebP y subirlas a R2, no al repositorio ni a `public/`.
- Usar tamaños explícitos, lazy loading fuera del viewport inicial y prioridad para imágenes LCP/primeras páginas del manga.
- `<picture>` cuando se necesiten variantes o fallbacks; no procesar imágenes en runtime.
- Mantener code splitting por ruta y carga diferida de componentes no críticos.
- Fuentes de interfaz servidas localmente; no depender de Google Fonts durante build o navegación.

### 4. Performance y navegación

- HTML completo, minificación de Vite y assets con hashes.
- Prefetch selectivo mediante `<Link prefetch="intent">` o `viewport` según el flujo, sin precargar todo el catálogo. El enlace actual a `/estilos` usa `intent`.
- Definir y medir políticas de caché: assets con hash pueden ser immutable; HTML y `.data` deben mantenerse coherentes al publicar contenido nuevo. No imponer TTLs largos sin verificar actualización.
- Evaluar Brotli y métricas reales en Cloudflare; agregar Web Vitals posteriormente.
- Preconnect/DNS-prefetch solo para dominios externos realmente utilizados (por ejemplo, el futuro dominio R2).

## Pasos de implementación (orden recomendado)

Las fases son una secuencia de trabajo, no un compromiso de seis semanas.

### Fase 1: Decisión arquitectónica

- [x] Elegir React 19, TypeScript, Tailwind 4 y React Router + Vite.
- [x] Resolver contradicción con `AGENTS.md` y reemplazar la base Next.js conservando la interfaz.

### Fase 2: Configuración base

- [x] Configurar routing, root, metadatos, Vite y plugin Tailwind.
- [x] Configurar prerender de `/` y `/estilos` y servicio de Static Assets con Wrangler.
- [x] Formato de contenido: Markdown + frontmatter YAML por capítulo, imágenes en R2.
- [x] `content/` vive en el repo privado `MorguiMateo/rezero-content`, montado como submódulo.
- [ ] Crear el repo privado y agregar el submódulo (ver README).
- [ ] Script de conversión EPUB → Markdown + extracción de imágenes a WebP con manifiesto de dimensiones.
- [ ] Implementar capa `src/lib/content/` y primer recorrido obra → volumen → capítulo.
- [ ] Enumerar todas las URLs de contenido y generar sus metadatos.

### Fase 3: Optimización de assets

- [x] Mantener paletas, temas y fuentes de interfaz autoalojadas.
- [ ] Crear bucket R2 y elegir dominio propio de imágenes.
- [ ] Implementar conversión WebP, tamaños, lazy loading y prioridades con contenido real.

### Fase 4: Performance

- [x] Prefetch del enlace existente y code splitting por ruta del framework.
- [ ] Prefetch de siguientes capítulos y rutas críticas según el flujo real.
- [ ] Definir headers de caché y verificar compresión en Cloudflare.
- [ ] Implementar Web Vitals y analizar el peso del bundle.

### Fase 5: Medición y testing

- [ ] Auditar el producto con contenido real mediante Lighthouse y WebPageTest.
- [ ] Medir TTFB desde distintas ubicaciones y comprobar caché en Cloudflare.
- [ ] Validar navegación, lectores, accesibilidad y botón de cambio de tema.

### Fase 6: Deployment

- [ ] Configurar cuenta, dominios y staging.
- [ ] Automatizar publicación: conversión, subida de imágenes a R2, build y deploy (GitHub Actions con acceso de lectura al repo de contenido).
- [ ] Desplegar a producción, monitorear métricas y alertas.

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

Fuente y licencia/disponibilidad del contenido, dominios del sitio e imágenes y estrategia de publicación. Ninguna está resuelta por la migración del framework.
