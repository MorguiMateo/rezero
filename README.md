# Biblioteca de Pléyades

Lector web de novela ligera y manga de Re:Zero en español.

[Abrir demo](https://biblioteca-de-pleyades.morguimateo1.workers.dev)

## Funcionalidades

- Inicio con acceso a las obras disponibles.
- Navegación por obra, volumen o serie y capítulo.
- Lectura de novelas con progreso guardado localmente.
- Lector de manga con carga anticipada de páginas.
- Ocho temas visuales, con preferencia guardada en el navegador.
- Páginas prerenderizadas y navegación utilizable sin hidratación en la página 404.
- Diseño adaptable y metadatos para compartir enlaces.

## Stack

React 19, TypeScript, React Router 8, Vite 8, Tailwind CSS 4 y Cloudflare Workers Static Assets. pnpm administra dependencias.

## Cómo correrlo en local

Requiere Node.js 22.22+ (rama 22) o 24+, y pnpm 10.5.2. El submódulo `content` es privado: sin acceso al repositorio de contenido, el clon no incluye los datos necesarios y las rutas de contenido no se pueden generar. Solicita acceso a `MorguiMateo/rezero-content` y ejecuta `git submodule update --init --recursive`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre la dirección local que indique Vite. Para importar EPUB se necesita además Python 3, Pandoc y `cwebp`.

El despliegue automático requiere los secretos `CONTENT_REPO_TOKEN`, `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en GitHub Actions.

## Estructura

- `src/`: rutas, lectores, componentes, estilos y carga de contenido durante el build.
- `content/`: submódulo privado con textos, metadatos e imágenes.
- `scripts/`: importador EPUB y verificación smoke del preview.
- `docs/`: guías técnicas.
- `.github/workflows/deploy.yml`: verificación y despliegue.

## Contenido (submódulo privado)

Los textos y recursos editoriales se mantienen en el repositorio privado `MorguiMateo/rezero-content`, enlazado como submódulo en `content/`. Un clon recursivo solo obtiene su contenido si la cuenta tiene permiso; sin acceso, solicita permisos al mantenedor. Para inicializarlo tras clonar con acceso:

```sh
git submodule update --init --recursive
```

Las instrucciones de importación de EPUB están en [docs/importar-epub.md](docs/importar-epub.md); los detalles de publicación, prerender y secciones disponibles, en [docs/desarrollo-y-despliegue.md](docs/desarrollo-y-despliegue.md).
