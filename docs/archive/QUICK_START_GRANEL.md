# 🚀 Quick Start - Equipos a Granel

## Antes de Empezar

Tu sistema está completamente implementado con Opción A (múltiples filas en prestamos).

**Confirmado:**
- ✅ Cada cable prestado = 1 fila en tabla `prestamos`
- ✅ Devolución parcial posible (ej: devuelves 1de 5)
- ✅ Stock se calcula dinámicamente: `total - préstamos_activos`

---

## 1️⃣ Inicia la App

```bash
npm run tauri dev
```

Espera a que se abra la ventana de la app.

---

## 2️⃣ Crea un Equipo a Granel (Admin)

1. Ve a **Admin Panel** (arriba derecha)
2. En el formulario lateral, rellena:
   - **Categoría:** (cualquiera)
   - **Nombre:** "Cable HDMI" (o lo que quieras)
   - ✅ **Marca el checkbox:** "¿Es equipo por cantidad (granel)?"
3. Cuando marques el checkbox, verás que:
   - Desaparece el campo "Identificador"
   - Aparece "Cantidad Total" = 10
4. Click **"Registrar"**

**Resultado esperado en la tabla:**
```
Cable HDMI  |  Granel  |  10 / 10 disponibles  |  [Editar] [Eliminar]
```

---

## 3️⃣ Pide Cables en Kiosk

1. Ve a **Kiosk**
2. Ingresa el código de profesor: `2958101` (el que viene preconfigurado)
3. Click **"Confirmar Login"**
4. Verás el Cable HDMI con badge **"Disponibles: 10"** (botón azul)
5. **Presiona 3 veces el botón** del cable
6. Tu carrito ahora dice: **"Llevar (3)"**
7. Click **"Confirmar y Llevar (3)"**

**Resultado esperado:**
- ✨ Mensaje: "¡Préstamo registrado exitosamente! (3 equipos)"
- En "Mis Préstamos Activos" ves **3 filas** (una por cada cable)

---

## 4️⃣ Verifica Stock en Admin

1. Vuelve a **Admin**
2. Busca tu Cable HDMI en la tabla
3. **Esperado:** Muestra **"7 / 10 disponibles"** (se restaron los 3 que prestaste)

---

## 5️⃣ Devuelve 1 Cable en Kiosk

1. Ve a **Kiosk**
2. En "Mis Préstamos Activos", presiona **"Devolver"** en la primera fila del cable
3. Popup: "¿En qué condición entregas el equipo?" → Escribe: `Excelente`
4. Siguiente popup (notas opcionales) → Click OK
5. **Resultado:** 
   - ✅ Mensaje: "¡Devolución exitosa!"
   - Faltan 2 cables en tu lista de activos
   - Admin ahora muestra: **"8 / 10 disponibles"**

---

## 6️⃣ Devuelve Todo y Verifica Stock Restaurado

1. Devuelve los 2 cables restantes (repite Paso 5)
2. Vuelve a Admin
3. **Esperado:** Cable HDMI muestra **"10 / 10 disponibles"**

---

## ⭐ Prueba de Agotamiento (Bonus)

1. Pide **10 cables** (todos los disponibles)
2. En Admin: Verás **"0 / 10 disponibles"** + badge **"⚠️ Agotado"**
3. En Kiosk: El botón estará **deshabilitado** (no puedes presionar)
4. Devuelve 5
5. En Kiosk: Ahora muestra **"Disponibles: 5"** y botón está **habilitado**

---

## 📋 Documentación Completa

Para pruebas más exhaustivas, consulta:
- **[PLAN_PRUEBAS_GRANEL.md](./PLAN_PRUEBAS_GRANEL.md)** — Guía paso a paso (7 fases)
- **[RESUMEN_CAMBIOS_GRANEL.md](./RESUMEN_CAMBIOS_GRANEL.md)** — Detalles técnicos de cambios

---

## ❓ ¿Algo No Funciona?

#### Error: "Migraciones no se aplicaron"
- Abre DevTools (F12)
- Busca errores SQL
- **Solución:** Elimina `prestamos.db` y reinicia la app

#### No apareció el checkbox de "granel"
- Limpia cache: Ctrl+Shift+Del
- Reinicia: `npm run tauri dev`

#### El stock no se actualiza
- Recarga la página: F5
- Espera 1 segundo después de cada préstamo/devolución

---

**¡Listo para empezar!** 🎉  
Ejecuta `npm run tauri dev` y sigue el Quick Start arriba.
