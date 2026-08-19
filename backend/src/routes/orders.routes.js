import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { createOrder, orders, emails, users } from "../store.js";
import { buildOrderEmailHtml } from "../templates/emailTemplate.js";

export const ordersRouter = Router();

ordersRouter.post("/orders", requireAuth, (req, res) => {
  const { items, paymentOnline } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "El carrito esta vacio" });
  }

  // El checkout de la tienda solo ofrece pago con tarjeta (paymentOnline),
  // que esta pasarela de pago de prueba nunca puede confirmar. El retiro en
  // el local (paymentOnline: false) no requiere esa confirmacion porque el
  // pago se hace en persona al retirar - por eso salta esta verificacion.
  if (paymentOnline !== false) {
    return res
      .status(402)
      .json({ error: "El pago no pudo procesarse. Verifica los datos de tu tarjeta e intenta de nuevo." });
  }

  const order = createOrder({ userId: req.user.id, items, fulfillment: "pickup" });

  // Al confirmar el pedido se "dispara" el email de confirmacion. Se genera
  // el HTML ahora (con el nickname del usuario tal como esta guardado) y se
  // guarda para poder previsualizarlo despues via GET /api/emails/:orderId.
  const emailHtml = buildOrderEmailHtml(req.user, order);
  emails.set(order.id, emailHtml);

  res.status(201).json({ order });
});

ordersRouter.get("/orders/:id", requireAuth, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
  if (order.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "No autorizado" });
  }
  res.json({ order });
});
