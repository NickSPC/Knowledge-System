# Knowledge System

Prototipo del frontend de un sistema de gestión de conocimiento empresarial. La idea del sistema es reunir información de distintas fuentes (Excel, bases SQL, Trello, ERP, CRM, Power BI), normalizarla y mostrar cómo se relacionan sus entidades (clientes, productos, pedidos) en un grafo y en notas navegables, al estilo de Obsidian.

> **Estado actual:** prototipo visual. Todas las pantallas funcionan con **datos de ejemplo** (mock). Todavía no hay conexión con un backend.

## Tecnologías

| Herramienta                                                                  | Uso                                            |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Interfaz y tipado                              |
| [Vite](https://vite.dev)                                                     | Servidor de desarrollo y compilación           |
| [MUI (Material UI)](https://mui.com)                                         | Componentes y sistema de estilos (tema oscuro) |
| [React Router](https://reactrouter.com)                                      | Navegación entre pantallas                     |
| [react-force-graph-2d](https://github.com/vasturiano/react-force-graph)      | Visualización del grafo                        |
| [react-markdown](https://github.com/remarkjs/react-markdown)                 | Notas de cada entidad en Markdown              |
| ESLint                                                                       | Análisis de código                             |

## Requisitos previos

- **Node.js 20.19 o superior**, o **22.12 o superior** (recomendado: la versión 22 LTS).
- **npm** (viene incluido con Node.js).
- **Git**.

Para comprobar las versiones instaladas:

```bash
node -v
npm -v
```

> Con una versión de Node anterior a la 20.19, Vite no arranca y aparece el error `Cannot find native binding`. Ver [Problemas frecuentes](#problemas-frecuentes).

## Instalación

1. Clonar el repositorio:

   ```bash
   git clone <URL-DEL-REPOSITORIO>
   ```

2. Entrar a la carpeta del proyecto:

   ```bash
   cd knowledge-system
   ```

3. Instalar las dependencias:

   ```bash
   npm install
   ```

## Cómo levantar el proyecto

```bash
npm run dev
```

Se abre en <http://localhost:5173>. Si ese puerto está ocupado, Vite elige otro y lo muestra en la terminal.

### Otros comandos

| Comando           | Qué hace                                                                    |
| ----------------- | --------------------------------------------------------------------------- |
| `npm run dev`     | Levanta el servidor de desarrollo con recarga automática                    |
| `npm run build`   | Revisa los tipos de TypeScript y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente la versión generada con `build`                            |
| `npm run lint`    | Ejecuta ESLint sobre todo el proyecto                                       |

Antes de subir cambios conviene correr `npm run build` y `npm run lint`: detectan errores de tipos y de estilo que el servidor de desarrollo no siempre muestra.

## Pantallas

| Ruta                    | Pantalla       | Qué muestra                                                                        |
| ----------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `/`                     | Inicio         | Banner de bienvenida, resumen del sistema, entidades por tipo y actividad reciente |
| `/fuentes`              | Fuentes        | Lista de fuentes con su estado; permite sincronizar y eliminar                     |
| `/fuentes/nueva`        | Agregar fuente | Selector de tipo de fuente y formulario o carga de archivo                         |
| `/fuentes/vista-previa` | Vista previa   | Primeras filas de lo importado, con los registros con error resaltados             |
| `/grafo`                | Grafo          | Grafo interactivo con filtros por tipo, zoom y nombres en cada nodo                |
| `/entidad/:id`          | Entidad        | Nota en Markdown de la entidad, con sus relaciones y backlinks                     |

La interfaz es responsive: en pantallas chicas el menú lateral se oculta y se abre con el botón de hamburguesa.

## Estructura del proyecto

```
knowledge-system/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout.tsx        # Menú lateral, barra superior y estructura general
│   │   └── Footer.tsx        # Pie de página
│   ├── mocks/
│   │   └── data.ts           # Datos de ejemplo (fuentes, entidades, relaciones)
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── SourcesPage.tsx
│   │   ├── AddSourcePage.tsx
│   │   ├── PreviewPage.tsx
│   │   ├── GraphPage.tsx
│   │   └── EntityPage.tsx
│   ├── services/
│   │   └── api.ts            # Acceso a los datos (hoy devuelve los mocks)
│   ├── App.tsx               # Definición de rutas
│   ├── main.tsx              # Punto de entrada
│   ├── theme.ts              # Tema de MUI y colores por tipo de entidad
│   └── types.ts              # Tipos: Source, Entity, Relationship
├── index.html
├── package.json
└── vite.config.ts
```

## Datos de ejemplo y futura integración con el backend

Todas las pantallas obtienen sus datos a través de `src/services/api.ts`:

```ts
getSources();
getEntities();
getRelationships();
```

Hoy esas funciones devuelven los datos de `src/mocks/data.ts` con una pequeña demora simulada. Cuando el backend esté disponible, **solo hay que cambiar el interior de estas funciones** (por ejemplo, con `fetch` a la API). Las pantallas no se modifican.

Los tipos de datos están definidos en `src/types.ts`:

- **Source:** una fuente de datos (nombre, tipo, estado, última sincronización, cantidad de registros).
- **Entity:** una entidad (cliente, producto o pedido) con su fuente de origen y sus datos.
- **Relationship:** una relación entre dos entidades (por ejemplo, un pedido "pertenece a" un cliente).

## Alcance actual

**Incluido en el prototipo**

- Navegación completa, diseño oscuro y diseño responsive.
- Listado, sincronización y eliminación de fuentes (sobre datos de ejemplo).
- Selección de tipo de fuente y elección de archivo Excel/CSV.
- Grafo con filtros, zoom, nombres de nodos y navegación a cada entidad.
- Notas en Markdown con enlaces entre entidades.

**Todavía no implementado**

- Conexión con el backend: el archivo elegido no se envía y la vista previa muestra datos fijos.
- Buscador: la barra superior es solo visual.
- Configuración de entidades al importar una fuente.
- Detección y revisión de entidades duplicadas.
- Conectores reales (SQL, Trello, API externa, ERP, CRM y Power BI).

## Próximos pasos

1. Integrar una primera funcionalidad con el backend: carga de un archivo Excel/CSV y su vista previa con datos reales.
2. Agregar las pantallas de búsqueda y de duplicados.
3. Conectar el resto de las fuentes.

## Convenciones

- El **código** (nombres de variables, funciones, archivos y tipos) se escribe en **inglés**.
- Los **textos que ve el usuario** en la interfaz están en **español**.
- Los estilos se definen con la prop `sx` de MUI y con `src/theme.ts`; no se usan archivos CSS sueltos.
- El trabajo se organiza con **Scrum**, con un tablero en Trello (Product Backlog, Sprint Backlog, To do, Doing, Done y Sprint release).

## Problemas frecuentes

**`Error: Cannot find native binding` al correr `npm run dev`**
La versión de Node es demasiado vieja. Actualizá a Node 22 LTS o a la 20.19 o superior, y reinstalá las dependencias:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

En Linux o macOS: `rm -rf node_modules package-lock.json && npm install`.

**`npm error ENOENT ... package.json`**
El comando se está ejecutando en la carpeta equivocada. Entrá a la carpeta del proyecto (`cd knowledge-system`) y volvé a correrlo. Todos los comandos de `npm` se ejecutan desde ahí.

**Aparecen dos carpetas `node_modules`**
Se instalaron dependencias desde una carpeta superior. Borrá `node_modules`, `package.json` y `package-lock.json` de la carpeta de arriba y dejá solo los de `knowledge-system`.

**La pantalla queda en blanco o hay errores de tipos**
Ejecutá `npm run build`: muestra todos los errores de TypeScript juntos, con el archivo y la línea.

## Equipo

Proyecto académico de la materia Metodología Ágil (Tecnicatura en Desarrollo de Software).

- _Integrantes del grupo._
