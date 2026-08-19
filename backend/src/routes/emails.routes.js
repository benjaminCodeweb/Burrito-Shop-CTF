import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { orders, emails } from "../store.js";

export const emailsRouter = Router();

// *** SINK #1: XSS del lado del cliente ***
// Devuelve el HTML del email TAL CUAL se genero (con el nickname sin
// sanitizar si ESCAPE_NICKNAME=false). El frontend lo renderiza con
// dangerouslySetInnerHTML en <EmailPreview>, ejecutando cualquier
// <script>/onerror/etc. que el usuario haya puesto en su nickname.
emailsRouter.get("/emails/:orderId", requireAuth, (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
  if (order.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "No autorizado" });
  }

  const html = emails.get(req.params.orderId);
  if (!html) return res.status(404).json({ error: "Email no encontrado" });

  res.json({ html });
});
