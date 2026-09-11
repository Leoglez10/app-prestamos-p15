# Plantillas de respuesta para reportes

Respuestas listas para contestar los issues de este repositorio sin improvisar cada vez.

**Para qué sirve**: los reportes llegan de profesores, administrativos y becarios de la
Preparatoria 15. La mayoría no programa. Una respuesta corta, en español neutro y sin
palabras técnicas resuelve más que una explicación larga.

---

## Cómo dejarlas cargadas en GitHub

GitHub tiene "respuestas guardadas" (*saved replies*), pero **viven en tu cuenta, no en el
repositorio**: no se pueden versionar ni compartir. Este archivo es la fuente de verdad;
cópialas una vez a tu cuenta y quedan disponibles en el botón de respuestas del cuadro de
comentario.

1. GitHub → tu foto (arriba a la derecha) → **Settings**.
2. En la barra lateral: **Saved replies**.
3. **Add a saved reply**. Pega el *nombre* y el *texto* de cada plantilla de abajo.
4. Repite para cada una. Quedan para siempre y sirven en cualquier repositorio.

---

## Reglas de la casa

- **Español neutro.** Nada de voseo rioplatense: el plantel es de México.
- **Sin palabras técnicas** cuando quien reporta no programa: pantallas, botones y equipos,
  no componentes, hooks ni base de datos.
- **Nombra la versión** donde sale el arreglo. El reporte se cierra solo cuando la persona
  puede ver el cambio en la app.
- **Cierra el círculo.** Si pediste un dato, di explícitamente que el reporte queda en pausa.
- **Una etiqueta de estado a la vez**: `estado: necesita información` o `estado: en curso`,
  nunca las dos.

---

## 1. Falta información

**Cuándo**: el reporte no alcanza para reproducir el problema.
**Etiquetas**: `estado: necesita información` (y quita `estado: en curso` si estaba).

```markdown
¡Gracias por reportarlo! Necesito un dato más para poder reproducirlo:

- ¿En qué pantalla estabas? (Kiosko, Admin, Inventario, Reportes…)
- ¿Qué botón tocaste justo antes de que pasara?
- ¿Vuelve a pasar si lo intentas otra vez?

Si puedes, adjunta una captura de pantalla: es lo que más ayuda.

Dejo el reporte en pausa esperando tu respuesta; en cuanto la tenga, lo retomo.
```

---

## 2. Confirmado, ya lo estoy viendo

**Cuándo**: lograste reproducirlo y vas a trabajar en ello.
**Etiquetas**: `estado: en curso` + `prioridad:` la que corresponda + `área:` la que corresponda.

```markdown
Confirmado: pude reproducirlo. Ya lo estoy revisando.

Te aviso en este mismo reporte cuando salga la corrección. Gracias por el detalle.
```

---

## 3. Duda de uso: no es un error

**Cuándo**: la app hace lo correcto, pero no se entiende cómo usarla.
**Etiquetas**: `question`. Si el paso a paso no estaba claro, agrega `documentation`.

```markdown
Revisé el caso y la app está haciendo lo que debe; es un tema de cómo llegar al paso.
Te explico:

1. <paso 1>
2. <paso 2>
3. <paso 3>

Lo mismo está explicado en el manual del personal:
<https://github.com/Leoglez10/app-prestamos-p15/blob/main/app-prestamos-p15/docs/MANUAL_PERSONAL.md>

Si con esos pasos sigue sin funcionar, dime en qué paso te trabas y lo revisamos otra vez.
```

---

## 4. Arreglado, sale en la próxima versión

**Cuándo**: el arreglo ya está en `main` y sale en la siguiente versión publicada.
**Etiquetas**: quita `estado: en curso`. Se cierra cuando la versión está publicada.

```markdown
Arreglado. La corrección ya está lista y sale en la versión **X.Y.Z**.

La app se actualiza sola: cuando la instales (o cuando se actualice, si ya la tienes),
el problema tiene que desaparecer. Si lo vuelves a ver en esa versión, responde acá
y lo reabrimos.
```

---

## 5. Reporte duplicado

**Cuándo**: el mismo problema ya está reportado en otro issue.
**Etiquetas**: `duplicate`.

```markdown
Gracias por reportarlo. Es el mismo problema que ya está anotado en #<número>, así que
junto los dos ahí para no perder el detalle.

Si tu caso tiene algo distinto, cuéntamelo acá y lo separamos otra vez.
```

---

## 6. No se va a hacer

**Cuándo**: se decidió no hacerlo. Siempre explica el motivo; nunca cierres en seco.
**Etiquetas**: `wontfix`.

```markdown
Gracias por la propuesta. Lo pensé y por ahora no lo vamos a hacer, porque <motivo>.

No es un "no" para siempre: si cambia <condición>, lo retomamos. Dejo el motivo escrito
acá para que quede el antecedente.
```

---

## 7. Reporte que llegó desde la app

**Cuándo**: el issue trae el pie `Reportado desde la app · Versión: … · Sistema: …`.
**Etiquetas**: ya viene con `bug` o `enhancement`; agrega `origen: app`.

El pie trae la versión y el sistema operativo, así que **no los pidas por separado**. Pregunta
solo lo que la app no puede saber: qué estaba haciendo la persona y si vuelve a pasar.

```markdown
¡Gracias! El reporte llegó con la versión X.Y.Z en Windows 11, así que por ese lado
ya tengo lo que necesito.

Me falta saber una cosa: <pregunta concreta>.

Quedo atento.
```
