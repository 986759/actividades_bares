# Contexto de Aplicación Móvil: dj_admin_app
**Tecnologías:** Flutter, Dart, `supabase_flutter`.
**Propósito:** Panel de control táctil para el DJ. Permite visualizar las peticiones ordenadas por prioridad, destacar los saludos y gestionar el flujo del evento.

## Estructura de Archivos Principal
* `/lib/main.dart`: Archivo principal que contiene la inicialización de Supabase y toda la interfaz gráfica. Se convirtió a `StatefulWidget` para manejar el interruptor global del sistema de forma dinámica.

## Estructura de Interfaz Gráfica (`PantallaCabina`)
Implementa un `DefaultTabController` con dos pestañas:
1. **Pestaña Pendientes:** Muestra las peticiones con estado `'pendiente'`. Destaca los saludos con color azul (ícono 👋) y las canciones con color púrpura (ícono 🔥). **[NUEVO]** El borde de la tarjeta y un punto luminoso se colorean usando el `color_cliente` para identificar peticiones enviadas desde un mismo dispositivo.
2. **Pestaña Historial:** Muestra las peticiones con estado `'ejecutada'`, con un estilo de texto tachado y opaco.
* **AppBar [NUEVO]:** Incluye un interruptor (`Switch`) maestro que controla el estado global de la cabina (ON/OFF).

## Lógica y Flujo de Datos
* **Realtime Stream:** Utiliza `Supabase.instance.client.from('peticiones').stream(primaryKey: ['id'])` inyectado en un `StreamBuilder`. Esto elimina la necesidad de manejar el estado localmente, ya que la UI reacciona directamente a la base de datos.
* **Filtros en Memoria:** El stream trae todas las peticiones, y la función `builder` las separa en listas locales `pendientes` y `ejecutadas`.
* **Algoritmo de Ordenamiento:** La lista de pendientes usa el método `.sort()`. Prioriza el número de `votos` (descendente) y desempata por `created_at` (ascendente).
* **Configuración Global [NUEVO]:** Un canal de Supabase escucha los cambios en la tabla `configuracion` para mantener el `Switch` de la app sincronizado.

## Funciones Clave
* **`toggleSistema(valor)` [NUEVO]:** Actualiza la tabla `configuracion` en Supabase para encender o apagar la página web de los clientes.
* **`hexToColor(String)` [NUEVO]:** Convierte el código hexadecimal web guardado en `color_cliente` a un objeto `Color` nativo de Flutter para renderizar la huella visual.
* `marcarComoEjecutada(id)`: Ejecuta un `UPDATE` en Supabase cambiando el estado a `'ejecutada'`. (Botón Check Verde).
* `regresarAPendiente(id)`: Ejecuta un `UPDATE` revirtiendo el estado a `'pendiente'`. (Botón Deshacer Naranja en el historial).