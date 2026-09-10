1. Inicializar Git localmente 
git init

2. Verificar los archivos que se van a subir

git status

🔍 Verificación de Seguridad: Revisa la lista en color rojo. NUNCA debe aparecer .env. Si ves el archivo .env en la lista, detente y revisa el Paso 1 antes de continuar.

4. Crear el primer commit
Bash
git commit -m "Initial commit: ProyectoReact + Vite + Exportación Excel"

5. Renombrar la rama principal a main
Bash
git branch -M main

6. Enlazar tu proyecto local con el repositorio de GitHub
Copia la URL de tu repositorio desde la página de GitHub que dejaste abierta (debe terminar en .git) y ejecuta:

Bash
(ejemplo: git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git)

git remote set-url origin https://github.com/986759/agenda.git

7. Subir el código a GitHub
Bash
git push -u origin main

--------------------------------------------
💡 Buenas prácticas para tus próximos cambios
A partir de ahora, cada vez que hagas cambios, mejoras o correcciones en el código (como los ajustes de Excel o nuevas funciones), solo debes seguir este flujo corto de 3 comandos en la terminal:

Guardar los cambios en el área de preparación:

Verificar el Estado de los Archivos, confirmar qué archivos han sido modificados o agregados:
git status

Preparar los Archivos (Staging), Agrega todos los cambios realizados en el proyecto al área de preparación:
git add .


Crear el Commit de Confirmación, Registra los cambios en el historial local especificando un mensaje claro y descriptivo:
git commit -m "Descripción de lo que corregiste o agregaste"


Sincronizar Cambios con GitHub (Push), Envía la actualización a tu repositorio remoto en GitHub.
Si estás trabajando en la rama principal (main o master):

git push
(Ya no hace falta usar -u origin main, solo con git push sube todo automáticamente).