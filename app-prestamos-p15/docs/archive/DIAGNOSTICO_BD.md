# Diagnóstico de Conexión a BD

## Problema Reportado
La app abre correctamente pero no carga datos (Admin vacío, Kiosk vacío).

## Causas Probables

1. **Migraciones no se ejecutaron** → Columnas `es_granel` y `stock_total` no existen
2. **Error en las queries** → Las nuevas columnas no se encuentran
3. **BD corrupta o no inicializada** → Tablas no creadas correctamente

## Verificación Rápida

### Paso 1: Revisar DevTools (F12)
1. Abre la app
2. Presiona **F12** para abrir DevTools
3. Vé a la pestaña **"Console"**
4. **¿Ves algún error rojo?** Cópialo íntegro aquí

### Paso 2: Describir lo que Ves
Cuando abres Admin o Kiosk:
- [ ] Ves "Cargando inventario..." (aparece para siempre)
- [ ] Ves tabla/cuadrícula pero está vacía (sin filas)
- [ ] Ves un error: "Error al cargar datos"
- [ ] Algo más (describe aquí)

### Paso 3: Información Clave
Comparte:
```
1. El error EXACTO del Console (si lo hay)
2. Una captura de pantalla de lo que ves
3. ¿En qué página estás cuando pasa? (Admin / Kiosk)
```

---

## Solución Temporal (Mientras Diagnosticamos)

Si sospechas que las migraciones no funcionaron, intenta:

### Opción A: Forzar Reinicialización
1. Cierra la app completamente
2. Elimina la BD: 
   ```powershell
   rm "~\AppData\Local\[nombre_app]\prestamos.db"
   ```
3. Abre la app de nuevo
4. Las migraciones deberían ejecutarse automáticamente

### Opción B: Verificar desde Terminal
```powershell
# Navega a la carpeta del proyecto
cd "c:\Users\leoel\OneDrive\Documentos\Personal Trabajos\App prestamos P15\app-prestamos-p15"

# Verifica que las migraciones están en el código
echo "Migraciones en useInventory.ts:"
sls "ALTER TABLE" src\hooks\useInventory.ts
```

---

## Plan de Resolución

Cuando me des la info anterior, podré:
1. ✅ Revisar si hay un error en las queries SQL
2. ✅ Ajustar las migraciones si es necesario
3. ✅ Restaurar la BD si está corrupta
4. ✅ Hacer que todo funcione

**⚠️ IMPORTANTE:** Comparte el MISMO error que ves en la consola (F12) — eso me dará la pista exacta.
