# Contexto de Base de Datos: Sistema DJ - Viernes de Complacencias
**Tecnología:** Supabase (PostgreSQL + Realtime)

## Descripción General
Esta base de datos actúa como el intermediario en tiempo real entre la aplicación web (clientes) y la aplicación móvil (DJ). Maneja suscripciones por WebSockets (`supabase.channel` y `stream`) para reflejar los cambios instantáneamente en ambas plataformas.

## Tabla Principal: `peticiones`

| Campo | Tipo | Propósito y Uso |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único generado automáticamente (Primary Key). |
| `tipo` | TEXT | Define si el registro es una `'cancion'` o un `'saludo'`. La web usa esto para el icono, y la app móvil para destacar los saludos visualmente. |
| `cliente_nombre` | TEXT | Nombre ingresado por el cliente. Si se omite, se guarda como "Anónimo". |
| `mesa` | TEXT | Número o ubicación de la mesa ingresada por el cliente. |
| `contenido` | TEXT | El nombre de la canción/artista o el mensaje del saludo. |
| `estado` | TEXT | `'pendiente'` (visible en listas activas) o `'ejecutada'` (pasó al historial/ya sonó). |
| `votos` | INT | Contador de popularidad. Inicia en 1. Los clientes pueden sumarle votos para subir su prioridad. |
| `created_at` | TIMESTAMPTZ | Fecha/hora de creación. Se usa para desempatar el orden cuando dos peticiones tienen la misma cantidad de votos. |

## Políticas de Seguridad (RLS - Row Level Security)
* **INSERT:** Público. Permite que la aplicación web (React) inserte datos sin requerir inicio de sesión de los clientes.
* **SELECT:** Público. Permite que la web y la app móvil lean la lista de peticiones activa en tiempo real.
* **UPDATE:** Público (por ahora). Permite a la web sumar `votos` y a la app móvil cambiar el `estado` a ejecutada/pendiente.