# Biblioteca de Pléyades

Lector de novela ligera y manga de Re:Zero en español, todavía en construcción.

## Stack

React 19, TypeScript, Tailwind CSS 4, React Router 8 en Framework Mode y Vite 8. Cloudflare Workers Static Assets sirve el resultado estático; no hay servidor SSR en producción.

## Requisitos

- Node.js 22.22+ en la rama 22, o 24+ (ver `engines` en `package.json`).
- pnpm 10.5.2 (versión fijada en `package.json`).

## Desarrollo

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abrir la URL que indique Vite (por defecto `http://localhost:5173`).

## Verificación y preview local

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm preview
```

`typecheck` genera los tipos de rutas antes de ejecutar TypeScript. `build` genera HTML completo para `/` y `/estilos`, junto con JS, CSS y fuentes en `build/client`. `preview` sirve ese build con Wrangler en el runtime local de Cloudflare (por defecto `http://localhost:8787`); no publica nada ni requiere un deploy. Ejecutar de nuevo el build después de modificar código. `pnpm start` es un alias del preview local.

Verificar ambas URLs, favicon y assets; una URL desconocida debe devolver HTTP 404, no la home. `wrangler.jsonc` desactiva el fallback SPA y normaliza URLs sin barra final. La navegación carga los módulos de ruta y, cuando existan loaders, sus archivos `.data` prerenderizados.

La base migrada pasó lint, TypeScript, build y comprobación HTTP en Wrangler local: ambas páginas entregan su HTML prerenderizado completo, los 16 assets de interfaz responden correctamente y las rutas inexistentes devuelven 404. Esto no verifica un despliegue de producción ni sustituye una revisión visual/hidratación en navegador.

## Estructura

- `src/root.tsx`: documento HTML, estilos globales e hidratación.
- `src/routes.ts`: rutas; `src/routes/home.tsx` y `style-guide.tsx`: páginas y metadatos.
- `src/styles/`: paletas, temas semánticos y utilidades Tailwind.
- `public/`: favicon y futuros assets de interfaz, nunca imágenes de capítulos.
- `react-router.config.ts`: `ssr: false`, URLs de prerender y manifiesto de rutas inicial.
- `vite.config.ts`: plugins React Router y Tailwind.
- `wrangler.jsonc`: hosting de `build/client` como Static Assets.

Las cuatro fuentes se empaquetan localmente con Fontsource, sin requests a Google Fonts. Los temas usan `data-theme`; Emilia es el predeterminado. Un botón con la imagen del personaje rota entre temas y guarda la elección en `localStorage`. Los componentes usan tokens semánticos, no colores de personajes directamente.

## Estado y siguientes pasos

Implementado: home provisional, guía de estilos temporal (noindex), cuatro temas y base de build estático/preview local. No hay catálogo, capítulos, lectores funcionales, integración de contenido ni deploy de producción. Cuentas, progreso, favoritos y preferencias guardadas (salvo el tema) están fuera de alcance.

El siguiente paso es crear el repo privado de contenido y montarlo como submódulo en `content/` (novelas en Markdown con frontmatter), luego implementar obra → volumen → capítulo y enumerar todas sus URLs en `prerender`. No hay backend. Las imágenes de contenido se optimizarán en build y servirán desde R2 con dominio propio.

La guía de Cloudflare advierte que su plugin Vite no admite prerender de React Router; por eso este proyecto utiliza Vite para build y Wrangler para Static Assets, sin `@cloudflare/vite-plugin`.

Consultar [PLAN.md](PLAN.md) y [AGENTS.md](AGENTS.md). Referencias: [prerender de React Router](https://reactrouter.com/how-to/pre-rendering) y [React Router en Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/).

## Contenido (submódulo privado)

El texto de las novelas vive en el repo privado `MorguiMateo/rezero-content`, montado en `content/`.

- Clonar todo: `git clone --recurse-submodules https://github.com/MorguiMateo/rezero.git`
- Si ya clonaste sin submódulos: `git submodule update --init`
- Publicar contenido nuevo: commit + push dentro de `content/`, luego en la raíz `git add content && git commit` para actualizar el puntero.
