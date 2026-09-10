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
* **Control de Cabina y Anti-Spam [NUEVO]:**
  * `sistemaActivo`: Booleano que escucha la tabla `configuracion`. Si es false, muestra la pantalla "Cabina Cerrada".
  * `colorCliente`: Código Hex almacenado en `localStorage` (`dj_huella_color`) para identificar el dispositivo.

## Funciones Clave (`App.tsx`)
* **Buscador iTunes (`useEffect`):** Monitorea el estado `contenido`. Si tiene +3 letras, espera 500ms (debounce) sin que el usuario escriba para consultar `https://itunes.apple.com/search`. Devuelve un máximo de 10 resultados.
* **Tiempo Real (`useEffect`):** Llama a `cargarPeticiones()` al inicio y establece canales `.channel` para escuchar actualizaciones desde PostgreSQL (tanto de `peticiones` como de `configuracion`).
* `cargarPeticiones()`: Obtiene datos de Supabase filtrando `tipo = 'cancion'` y los divide en *Pendientes* y *Ejecutadas* (mostrando la más reciente primero).
* `seleccionarSugerencia(artista, cancion)`: Autocompleta el textarea con el formato "Artista - Canción" y cierra la lista.
* `enviarPeticion(e)`: Realiza un `INSERT` a Supabase incluyendo el `color_cliente` y limpia todos los estados.

## Estilo, UI y UX
* Diseño basado en Dark Mode y Glassmorphism (fondos semi-transparentes con `backdrop-blur`). 
* **Optimización "Above the Fold" [NUEVO]:** Espacios verticales comprimidos (`pt-4`, `mb-4`, `gap-3`) y textarea de altura reducida (`h-16`) para evitar que el usuario tenga que hacer scroll principal.
* El contenedor del formulario utiliza `z-50` y `overflow-visible` para permitir que la lista de sugerencias flote por encima del resto de la interfaz.
* Las listas tienen scroll vertical (`max-h-[300px]` para sugerencias, `max-h-[250px]` para historial) y un botón "sticky" (pegajoso) en la parte inferior de las sugerencias para forzar el cierre y usar texto libre.