# Instalación App Prestamos P15

## Opción recomendada: instalar desde ejecutable

1. Copiar a la laptop nueva el instalador generado en una de estas rutas:
   - `src-tauri\target\release\bundle\nsis\`
   - `src-tauri\target\release\bundle\msi\`

2. Ejecutar el archivo `.exe` o `.msi`.

3. Seguir el asistente de instalación.

4. Abrir la app desde el acceso directo o desde el menú Inicio:
   - `App Prestamos P15`

## Cómo generar el instalador en la laptop actual

Abrir terminal en la carpeta del proyecto y ejecutar:

```powershell
npm install
npm run tauri build
```

Al terminar, el instalador se genera en:

- `src-tauri\target\release\bundle\nsis\`
- `src-tauri\target\release\bundle\msi\`

## Pasar la base de datos actual a la nueva laptop

### Opción 1: usando respaldo desde la app

1. Abrir la app en la laptop actual.
2. Ir a `Configuración`.
3. Pulsar `Crear respaldo`.
4. Copiar el archivo de respaldo a la laptop nueva.
5. Instalar la app en la laptop nueva.
6. Restaurar la base de datos con ese respaldo.

### Opción 2: copiar directamente la base de datos

La base de datos `prestamos.db` se guarda en la carpeta de datos de la app en Windows.

Ruta típica:

```text
C:\Users\TU_USUARIO\AppData\Roaming\com.p15.prestamos\
```

Copiar el archivo:

- `prestamos.db`

Y pegarlo en la misma ruta de la laptop nueva después de instalar la app.

## Requisitos en la laptop nueva

- Windows 10 u 11
- Microsoft Edge WebView2 Runtime

Normalmente WebView2 ya viene instalado en Windows. Si falta, instalarlo manualmente.

## Si la app no abre

1. Verificar que WebView2 esté instalado.
2. Ejecutar la app normalmente.
3. Si la carpeta de datos aún no existe, abrir la app una vez para que se cree.
4. Luego copiar `prestamos.db` o el respaldo.

## Actualizar a una nueva versión

1. Cerrar la app.
2. Instalar la nueva versión con el nuevo `.exe` o `.msi`.
3. La base de datos normalmente se conserva.
4. Si algo falla, restaurar desde el respaldo.

## Recomendación antes de mover la app

Antes de instalar en la nueva laptop:

1. Crear un respaldo desde `Configuración`.
2. Guardar también una copia manual de `prestamos.db`.
3. Probar la app en la laptop nueva antes de dejar de usar la anterior.
