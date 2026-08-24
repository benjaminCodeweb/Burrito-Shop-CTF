import { Router } from "express";
import { requireAdminAccess } from "../auth/middleware.js";
import { orders, emails, users, toPublicUser } from "../store.js";
import { renderEmailToPdfReport } from "../lib/emailRenderer.js";

export const adminRouter = Router();

adminRouter.use(requireAdminAccess);

// Panel de soporte/ops: lista todos los pedidos de todos los usuarios.
adminRouter.get("/admin/orders", (_req, res) => {
  const list = [...orders.values()].map((order) => ({
    ...order,
    customer: toPublicUser(users.get(order.userId)),
  }));
  res.json({ orders: list });
});

adminRouter.get('/admin/secrets', (_req, res) => {
  res.type('svg').send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="260">
      <rect width="100%" height="100%" rx="24" fill="#1c1917"/>
      <text x="45" y="90" fill="#fbbf24" font-size="28" font-family="monospace">
        Internal monitoring snapshot
      </text>
      <text x="45" y="165" fill="#ffffff" font-size="24" font-family="monospace">
        FLAG{c3RvcmVkX3hzc190b19zc3Jm}
      </text>
    </svg>
  `)
})

// "Exportar email a PDF para archivo" - dispara el SSRF (ver emailRenderer.js).
adminRouter.post("/admin/emails/:orderId/render", (req, res) => {
  const html = emails.get(req.params.orderId);
  if (!html) return res.status(404).json({ error: "Email no encontrado" });

  renderEmailToPdfReport(html)
    .then((report) => res.json(report))
    .catch((err) => res.status(500).json({ error: err.message }));
});
