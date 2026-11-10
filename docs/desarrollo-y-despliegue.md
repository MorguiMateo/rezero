# Desarrollo y despliegue

## Verificación y preview

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:smoke
```

`typecheck` genera primero los tipos de rutas; los dos catálogos están excluidos mientras sigan ocultos. `test` ejecuta las pruebas de Node (`node:test` mediante `tsx`) y las del importador Python.

El build genera HTML completo para `/`, `/estilos` y cada obra, volumen/serie y capítulo de novela y manga, además de JS, CSS y fuentes en `build/client`. La ruta comodín renderiza el error; `buildEnd` mueve `/404/index.html` a `build/client/404.html` y `assets.not_found_handling: "404-page"` permite servirlo con HTTP 404, sin fallback SPA. La 404 conserva HTML estático, navegación nativa y cambio de tema sin iniciar el router, porque sus datos prerender no corresponden a una URL parametrizada inexistente; las demás páginas se hidratan normalmente.

`test:smoke` inicia y detiene Wrangler local para comprobar rutas prerenderizadas, HTTP 404, assets y archivos `.data`. Para revisión visual, ejecutar `pnpm preview` (por defecto `http://localhost:8787`) y detenerlo al terminar. No publica nada; `pnpm start` es un alias. Repetir el build después de modificar código.

El despliegue desde GitHub Actions verifica cada cambio y publica `build/client` en Cloudflare al actualizar `main`; los pull requests solo se verifican. Se puede iniciar manualmente desde Actions («Run workflow»). El destino tiene la forma `https://biblioteca-de-pleyades.<subdominio>.workers.dev`. Configura los secretos `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y `CONTENT_REPO_TOKEN`; este último necesita acceso de solo lectura al submódulo privado y debe renovarse si caduca.

Para publicar contenido: commit y push dentro de `content/`, actualiza el puntero del submódulo en este repositorio y publica el cambio en `main`.

## Secciones

Los catálogos independientes y las pestañas «Novela» y «Manga» están deshabilitados en `src/lib/sections.ts`. Inicio y las rutas de obra, volumen/serie y capítulo siguen disponibles. Para habilitar catálogos, activa `contentSectionsEnabled` y retira las dos rutas de catálogo del `exclude` de `tsconfig.json`; luego ejecuta las verificaciones.

No hay backend de cuentas: progreso y tema se guardan localmente. Las páginas de manga se sirven desde un Worker estático aparte. Portadas e ilustraciones editoriales se publican desde `content/images/` en `/img/`.

## Mapa del código

- `src/root.tsx`: documento HTML, estilos globales e hidratación; `src/entry.client.tsx`: hidratación normal y mejora progresiva del tema en la 404.
- `src/routes.ts` y `src/routes/`: rutas, home, guía de estilos, 404, catálogos y lectores.
- `src/lib/content/`: lectura de `content/` durante el build (YAML y Markdown a HTML); `src/lib/seo.ts`: metadatos compartidos.
- `src/styles/`: paletas, temas semánticos y utilidades Tailwind. Las fuentes se empaquetan localmente con Fontsource, sin solicitudes a Google Fonts.
- `public/`: favicon y recursos de interfaz, no imágenes de capítulos. `react-router.config.ts`: prerender y rutas iniciales; `vite.config.ts`: plugins y publicación de `content/images/` en `/img/`.
- `wrangler.jsonc`: `build/client` como Static Assets. Los temas usan `data-theme`, Satella es el predeterminado y la selección se guarda en `localStorage`; componentes usan tokens semánticos.
