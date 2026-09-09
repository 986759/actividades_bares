# Contexto de Frontend: dj-web-client
**Tecnologías:** React, TypeScript, Vite, Tailwind CSS (v3), Supabase JS, iTunes Search API.
**Propósito:** Interfaz móvil (accesible por código QR) para que los clientes del restaurante envíen peticiones musicales limpias y vean el historial en tiempo real.

## Estructura de Archivos Principal
* `/src/supabase.ts`: Inicializa el cliente de Supabase usando variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
* `/src/index.css`: Contiene las directivas de Tailwind y el fondo oscuro personalizado (radial-gradient).
* `/src/App.tsx`: Archivo monolítico que maneja toda la UI, la lógica de negocio y las consultas a APIs externas.

## Lógica de Estado (`App.tsx`)
* **Formulario básico:** `tipo`, `nombre`, `mesa`, `contenido`, `enviando`, `mensajeExito`.
* **Tiempo real (Supabase):** `peticionesPendientes`, `peticionesEjecutadas`.
* **Buscador Inteligente (iTunes):** 
  * `sugerencias`: Array con los resultados de la API.
  * `buscando`: Booleano para mostrar el texto "Buscando...".
  * `mostrarSugerencias`: Controla la visibilidad de la lista flotante.
  * `ultimaSeleccion`: Memoria para evitar re-búsquedas automáticas cuando el usuario selecciona un item de la lista.

## Funciones Clave (`App.tsx`)
* **Buscador iTunes (`useEffect`):** Monitorea el estado `contenido`. Si tiene +3 letras, espera 500ms (debounce) sin que el usuario escriba para consultar `https://itunes.apple.com/search`. Devuelve un máximo de 10 resultados.
* **Tiempo Real (`useEffect`):** Llama a `cargarPeticiones()` al inicio y establece un canal `.channel('cambios-peticiones')` para escuchar actualizaciones desde PostgreSQL.
* `cargarPeticiones()`: Obtiene datos de Supabase filtrando `tipo = 'cancion'` y los divide en *Pendientes* y *Ejecutadas* (mostrando la más reciente primero).
* `seleccionarSugerencia(artista, cancion)`: Autocompleta el textarea con el formato "Artista - Canción" y cierra la lista.
* `enviarPeticion(e)`: Realiza un `INSERT` a Supabase y limpia todos los estados.

## Estilo, UI y UX
* Diseño basado en Dark Mode y Glassmorphism (fondos semi-transparentes con `backdrop-blur`). 
* El contenedor del formulario utiliza `z-50` y `overflow-visible` para permitir que la lista de sugerencias flote por encima del resto de la interfaz.
* La lista de sugerencias tiene scroll vertical (`max-h-[300px] overflow-y-auto`) y un botón "sticky" (pegajoso) en la parte inferior para forzar el cierre y usar texto libre.