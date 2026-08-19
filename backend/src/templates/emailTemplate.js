import { config } from "../config.js";

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildOrderEmailHtml(user, order) {
  const itemsHtml = order.items
    .map((it) => `<li>${it.qty} x ${escapeHtml(it.id)}</li>`)
    .join("");

  // *** VULNERABILIDAD: HTML Injection / Stored XSS ***
  // `user.nickname` viene directo del registro y se interpola en el
  // template sin sanitizar. El interruptor ESCAPE_NICKNAME (config.js)
  // permite alternar entre la version vulnerable y la version arreglada
  // para comparar el antes/despues.
  const nickname = config.escapeNickname
    ? escapeHtml(user.nickname)
    : user.nickname; // <-- sin sanitizar

  return `
    <div style="font-family: sans-serif; padding: 16px;">
      <p>Hola, ${nickname}!</p>
      <p>Gracias por tu pedido <strong>#${order.id.slice(0, 8)}</strong>.</p>
      <ul>${itemsHtml}</ul>
      <p>Total: $${order.total.toFixed(2)}</p>
    </div>
  `;
}
