import { verifyToken } from "./jwt.js";
import { users } from "../store.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "No autenticado" });

  try {
    const payload = verifyToken(token);
    const user = users.get(payload.sub);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Requiere rol admin" });
  }
  next();
}

function isLoopback(req) {
  const ip = (req.ip || req.socket.remoteAddress || "").replace("::ffff:", "");
  return ip === "127.0.0.1" || ip === "::1";
}

// *** VULNERABILIDAD: SSRF -> bypass de autenticacion ***
// Las rutas de admin confian en cualquier request que llegue desde localhost,
// asumiendo que solo un proceso interno del propio backend podria hacerlas
// (un supuesto habitual y peligroso: "si viene de 127.0.0.1 es de confianza").
// El SSRF de emailRenderer.js corre DENTRO del backend, asi que una URL como
// http://localhost:3000/api/admin/orders en el HTML del email rompe ese
// supuesto: el fetch se hace desde el propio proceso, entra por loopback, y
// se salta requireAuth/requireAdmin por completo.
export function requireAdminAccess(req, res, next) {
  if (isLoopback(req)) return next();
  requireAuth(req, res, () => requireAdmin(req, res, next));
}
