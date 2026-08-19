# Lab: HTML Injection en email de confirmacion (XSS + SSRF)

Lab educativo de seguridad web. Simula una tienda de comida (React + Express)
donde el campo **nickname** del registro se interpola sin sanitizar dentro
del HTML de un email de confirmacion de pedido. Esa unica falla (falta de
`escapeHtml`) se explota de dos formas distintas:

1. **Stored XSS (cliente):** el propio usuario ve su email renderizado con
   `dangerouslySetInnerHTML` -> cualquier HTML/JS en su nickname se ejecuta
   en su navegador.
2. **SSRF (servidor):** un panel interno de soporte "exporta el email a PDF"
   procesando el mismo HTML del lado del servidor. Si el nickname contiene
   una URL, el backend la va a buscar (`fetch`) sin validarla, permitiendo
   alcanzar un servicio interno (`internal-api`) que no esta expuesto al
   exterior.

Para que no sea trivial, el nickname tiene un limite de 20 caracteres — muy
poco para un payload util. Ese limite se valida tanto en el formulario como
en el endpoint que la UI usa para guardar el perfil (`PUT /api/me`), pero
ese mismo perfil expone otro endpoint (`PATCH /api/me`) que actualiza los
mismos campos sin repetir esa validacion. Ver el detalle en "Vuln 1".

El checkout suma un tercer reto, independiente de los dos anteriores:

3. **Bypass de pago (business logic / trust boundary):** el checkout solo
   ofrece pago con tarjeta en la UI, y esa pasarela de prueba nunca confirma
   el pago. El servidor confia en un campo `paymentOnline` que manda el
   cliente en el body de `POST /api/orders` para decidir si el pedido queda
   confirmado.

La UI no da ninguna pista de que esto sea un lab con fallas intencionales -
se ve y se comporta como una tienda de comida normal. La idea es que quien
lo use las descubra explorando la app (inspeccionando requests, probando
inputs), no leyendo carteles de ayuda.

Solo para uso local/educativo. No apuntes los payloads de URL a servicios
que no controles.

## Arquitectura

```
front/        React + Vite. Login/registro, menu+carrito, tracking, EmailPreview, panel admin.
backend/      Express. Auth JWT (cookie httpOnly), pedidos, email vulnerable, endpoint SSRF.
internal-api/ Express "interno". Guarda secretos falsos. NO publica puerto al host.
```

`docker-compose.yml` levanta los tres servicios en una red (`labnet`).
`internal-api` no tiene `ports:` publicados: solo `backend` puede llegar a
el (por DNS de docker, `http://internal-api:4000`). El navegador nunca
puede alcanzarlo directamente, lo que hace que el SSRF sea la unica forma
de exfiltrar sus datos.

## Como correrlo

Requiere Docker Desktop.

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- `internal-api`: sin acceso desde el host (a proposito).

Cuenta admin semilla: `admin@lab.local` / `Admin123!`.

## Vuln 1 — Stored XSS via EmailPreview

En `backend/src/templates/emailTemplate.js`:

```js
// vulnerable
const nickname = user.nickname
// arreglado
const nickname = escapeHtml(user.nickname)
```

`GET /api/emails/:orderId` devuelve ese HTML tal cual, y
`front/src/components/orders/EmailPreview.tsx` lo renderiza con
`dangerouslySetInnerHTML`.

El nickname tiene un limite de 20 caracteres — no alcanza para un payload
util como `<img src=x onerror=...>` de un tiro. Ese limite esta tanto en el
input (`maxLength`) como del lado del servidor en `POST /api/register` y en
`PUT /api/me` (`backend/src/routes/auth.routes.js`), que es la request que
dispara el formulario "Mi perfil" al guardar. `PATCH /api/me` actualiza los
mismos campos (nombre y nickname) pero sin ese chequeo de longitud.

### Explotacion

1. Registrate con cualquier nickname corto (≤ 20 caracteres).
2. Anda a "Perfil" y proba guardar un nickname largo con el payload: el
   formulario lo trunca a 20 caracteres, y si lo mandas igual a mano contra
   `PUT /api/me` el backend lo rechaza con `400`.
3. Repeti la actualizacion pero contra `PATCH /api/me` (mismo endpoint de
   perfil, otro verbo), reutilizando la cookie de sesion:
   ```bash
   curl -b cookies.txt -X PATCH http://localhost:3000/api/me \
     -H "Content-Type: application/json" \
     -d '{"nickname":"<img src=x onerror=alert(document.domain)>"}'
   ```
   Sin el chequeo de longitud, el nickname queda guardado tal cual.
4. Agrega algo al carrito y confirma un pedido **nuevo** (el email se genera
   con el nickname que tenga el usuario en ese momento, no retroactivamente).
5. En la pantalla de tracking, mira el "Preview del email de confirmacion":
   el `onerror` se dispara. Con `<script>` no funcionaria (los navegadores no
   ejecutan `<script>` insertado via innerHTML), por eso los payloads reales
   usan vectores como `onerror`, `onload` de `<svg>`, etc.

### Fix

En `docker-compose.yml`, cambiar `ESCAPE_NICKNAME: "false"` a `"true"` en el
servicio `backend` y reiniciar (`docker compose up -d --build backend`). El
mismo nickname ahora se muestra como texto literal, escapado.

## Vuln 2 — SSRF via el mismo HTML sin sanitizar

En `backend/src/lib/emailRenderer.js`, el endpoint
`POST /api/admin/emails/:orderId/render` (usado por el panel de soporte
"Exportar email a PDF") busca URLs (`src="..."`/`href="..."`) dentro del
HTML del email y hace un `fetch` server-side de cada una, sin validar que
el destino sea externo o publico. Esto es exactamente el patron real de
CVEs en herramientas de HTML-to-PDF/email (wkhtmltopdf, headless Chrome,
etc.) que siguen referencias a `file://`, IPs internas o el metadata
service de la nube.

Como el nickname llega intacto al HTML, un atacante puede convertir ese
render server-side en un proxy hacia la red interna — o hacia el propio
backend.

### Explotacion A — filtrar datos de otros usuarios via la ruta admin

Esta es la mas jugosa: usa el SSRF para que el backend se haga una request
**a si mismo** contra su propia API de administracion, y de paso salta la
autenticacion.

En `backend/src/auth/middleware.js`, `requireAdminAccess` confia en
cualquier request que llegue por loopback (`127.0.0.1`/`::1`), asumiendo
que solo un proceso interno del propio backend podria hacer esa llamada:

```js
export function requireAdminAccess(req, res, next) {
  if (isLoopback(req)) return next(); // <- confia ciegamente en localhost
  requireAuth(req, res, () => requireAdmin(req, res, next));
}
```

El SSRF de `emailRenderer.js` corre justamente dentro del proceso del
backend, asi que una URL apuntando a `localhost` entra por esa puerta:

1. Registrate (como atacante, sin ser admin) con un nickname corto, y
   despues actualizalo a este valor via `PATCH /api/me` (el mismo bypass de
   longitud que en el Vuln 1):
   ```bash
   curl -b cookies.txt -X PATCH http://localhost:3000/api/me \
     -H "Content-Type: application/json" \
     -d '{"nickname":"<img src=\"http://localhost:3000/api/admin/orders\">"}'
   ```
2. Confirma un pedido nuevo.
3. Logueate como admin (`admin@lab.local` / `Admin123!`), anda al panel
   **Admin** y hace click en **"Exportar email a PDF"** sobre ese pedido.
4. El reporte muestra el `bodyPreview` de `http://localhost:3000/api/admin/orders`
   con el JSON completo: **todos los pedidos y los datos de todos los
   usuarios** (email, nombre, nickname) — la misma respuesta que ve el
   panel de admin, obtenida sin ninguna cookie, solo por venir de loopback.

Podes confirmar que la ruta sigue protegida para cualquiera de afuera:
`curl http://localhost:3000/api/admin/orders` sin cookie devuelve `401`.
Solo el propio backend, hablandose a si mismo, se la salta.

### Explotacion B — alcanzar infraestructura interna

1. Registrate con un nickname corto y actualizalo (via el mismo bypass
   `PATCH /api/me`) a uno que apunte al servicio interno:
   ```bash
   curl -b cookies.txt -X PATCH http://localhost:3000/api/me \
     -H "Content-Type: application/json" \
     -d '{"nickname":"<img src=\"http://internal-api:4000/secrets\">"}'
   ```
2. Confirma un pedido nuevo con ese usuario.
3. Como admin, exporta el email de ese pedido igual que arriba.
4. El reporte muestra el `bodyPreview` de la respuesta de
   `http://internal-api:4000/secrets` (flag, password de DB, credenciales
   fake) — datos que el navegador jamas podria haber pedido directamente,
   porque `internal-api` no tiene puerto publicado al host. El backend
   actuo de proxy involuntario hacia la red interna.

Podes confirmar el aislamiento intentando `curl http://localhost:4000` con
el stack levantado: falla, porque no hay `ports:` mapeados para
`internal-api`.

### Por que importa combinar XSS + SSRF

El primer vector (XSS) ya es grave por si solo, pero muchas veces se
subestima como "el usuario se ataca a si mismo". Este segundo vector
muestra el impacto real: el mismo HTML sin sanitizar, consumido por un
proceso interno con mas privilegios de red, se convierte en una via de
exfiltracion de infraestructura que un usuario externo nunca deberia poder
tocar.

### Mitigaciones reales

- Sanitizar/escapar siempre el input del usuario antes de interpolarlo en
  HTML (la causa raiz aca).
- Si un servicio server-side necesita buscar recursos referenciados en HTML
  no confiable (para renderizar a PDF, generar previews, etc.), validar el
  destino contra un allowlist y bloquear rangos privados/loopback/metadata
  (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`,
  `169.254.0.0/16`), no confiar en que "esta en la red interna" implica que
  es seguro exponerlo a ese fetch.
- No autenticar endpoints en base a la IP de origen (`127.0.0.1` = confiable).
  Cualquier proceso del propio servidor -incluido uno abusado via SSRF- pasa
  por loopback. La autenticacion debe validar identidad (token, mTLS), no
  topologia de red.

## Vuln 3 — Bypass de pago via el body de `POST /api/orders`

En `backend/src/routes/orders.routes.js`, crear un pedido acepta un booleano
`paymentOnline` en el body:

```js
if (paymentOnline !== false) {
  return res.status(402).json({ error: "El pago no pudo procesarse..." });
}
const order = createOrder({ userId: req.user.id, items, fulfillment: "pickup" });
```

El checkout de la UI (`front/src/components/checkout/Checkout.tsx`) solo
ofrece un formulario de tarjeta y siempre manda `paymentOnline: true` — esa
pasarela de pago es de prueba y nunca confirma nada, asi que pagar "de la
forma normal" siempre termina en un `402` con un mensaje de tarjeta
rechazada, indistinguible de un fallo real de pago. El servidor nunca
verifica que el pago haya ocurrido de verdad: confia ciegamente en lo que
manda el cliente en ese campo. Si el cliente manda `paymentOnline: false`
(retiro en el local, que se paga en persona), el pedido se confirma sin
ninguna validacion de pago.

### Explotacion

1. Logueate, agrega algo al carrito y anda al checkout.
2. Completa el formulario de tarjeta (cualquier dato) y confirma el pago —
   va a fallar con "No pudimos procesar tu pago...". Esto pasa siempre, con
   cualquier tarjeta.
3. Repeti el intento interceptando el `POST /api/orders` con las devtools
   (pestaña Network) o un proxy (Burp/mitmproxy), y cambia
   `"paymentOnline": true` a `"paymentOnline": false` en el body antes de
   reenviar la request.
4. El pedido se confirma (`201`) sin haber pagado nada. El tracker y el
   panel de admin lo muestran con "Entrega: Retiro en el local" — la app
   asumio que el pago se iba a hacer en persona al retirar, pero nada obliga
   a que eso pase.

Podes confirmar el mismo bypass con `curl`, reutilizando la cookie de sesion
de un usuario logueado:

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"burger","qty":1}],"paymentOnline":false}'
```

### Mitigaciones reales

- Nunca confiar en el cliente para el estado de un pago. El backend debe
  verificar contra la pasarela de pago (webhook firmado, confirmacion
  server-to-server) antes de marcar una orden como pagada o confirmada.
- Si existe un flujo legitimo sin pago previo (pickup, pago contra entrega),
  modelarlo como un estado explicito de la orden (`awaiting_payment`,
  `paid_at_pickup`) verificado por reglas de negocio del lado del servidor,
  no por un booleano arbitrario que manda el cliente.
- Loguear y alertar sobre ordenes creadas con `paymentOnline: false` en
  volumen o patrones anomalos, ya que en un sistema real este endpoint
  deberia ser el objetivo de fraude mas evidente.

## Licencia

MIT. Ver [LICENSE](LICENSE). Todos los secretos, credenciales y URLs de este
repo son ficticios y existen solo para el ejercicio.
