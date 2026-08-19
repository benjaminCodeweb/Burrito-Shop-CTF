import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

// "Base de datos" en memoria - se resetea al reiniciar el backend.
export const users = new Map(); // id -> user
export const usersByEmail = new Map(); // email -> id
export const orders = new Map(); // id -> order
export const emails = new Map(); // orderId -> emailHtml

export const MENU = [
  {
    id: "burger",
    name: "Burger clasica",
    description: "Carne 150g, cheddar, lechuga y tomate en pan brioche.",
    price: 8.5,
    originalPrice: 10.9,
    emoji: "🍔",
    category: "Platos principales",
  },
  {
    id: "pizza",
    name: "Pizza muzzarella",
    description: "Masa a la piedra con muzzarella y salsa de tomate casera.",
    price: 11,
    originalPrice: 14,
    emoji: "🍕",
    category: "Platos principales",
  },
  {
    id: "sushi",
    name: "Sushi combo x24",
    description: "Piezas variadas: california, niguiri y sashimi.",
    price: 14.5,
    emoji: "🍣",
    category: "Platos principales",
  },
  {
    id: "salad",
    name: "Ensalada cesar",
    description: "Lechuga, pollo grillado, parmesano y aderezo cesar.",
    price: 7,
    emoji: "🥗",
    category: "Platos principales",
  },
  {
    id: "fries",
    name: "Papas fritas cheddar",
    description: "Porcion grande con cheddar y panceta.",
    price: 4.5,
    originalPrice: 6,
    emoji: "🍟",
    category: "Acompañamientos",
  },
  {
    id: "empanada",
    name: "Empanada de carne",
    description: "Horneada, cortada a cuchillo, unidad.",
    price: 2,
    emoji: "🥟",
    category: "Acompañamientos",
  },
  {
    id: "soda",
    name: "Gaseosa lata",
    description: "350ml, a eleccion.",
    price: 2.5,
    emoji: "🥤",
    category: "Bebidas",
  },
  {
    id: "water",
    name: "Agua mineral",
    description: "Botella 500ml sin gas.",
    price: 2,
    emoji: "💧",
    category: "Bebidas",
  },
];

export function createUser({ name, email, nickname, password, isAdmin = false }) {
  const id = randomUUID();
  const user = {
    id,
    name,
    email,
    nickname,
    passwordHash: bcrypt.hashSync(password, 10),
    isAdmin,
  };
  users.set(id, user);
  usersByEmail.set(email.toLowerCase(), id);
  return user;
}

export function findUserByEmail(email) {
  const id = usersByEmail.get(email.toLowerCase());
  return id ? users.get(id) : undefined;
}

export function toPublicUser(user) {
  const { passwordHash, ...pub } = user;
  return pub;
}

const ORDER_STEPS = ["pending", "preparing", "out_for_delivery", "delivered"];

export function createOrder({ userId, items, fulfillment }) {
  const id = randomUUID();
  const total = items.reduce((sum, it) => {
    const menuItem = MENU.find((m) => m.id === it.id);
    return menuItem ? sum + menuItem.price * it.qty : sum;
  }, 0);

  const order = {
    id,
    userId,
    items,
    total: Number(total.toFixed(2)),
    fulfillment,
    status: ORDER_STEPS[0],
    createdAt: Date.now(),
  };
  orders.set(id, order);
  advanceOrderStatus(id, 1);
  return order;
}

// Simula el pipeline de cocina/entrega avanzando el estado cada pocos
// segundos, para poder demostrar el polling desde el frontend.
function advanceOrderStatus(orderId, stepIndex) {
  if (stepIndex >= ORDER_STEPS.length) return;
  setTimeout(() => {
    const order = orders.get(orderId);
    if (!order) return;
    order.status = ORDER_STEPS[stepIndex];
    advanceOrderStatus(orderId, stepIndex + 1);
  }, 3000);
}

export function seedAdmin() {
  createUser({
    name: "Ops Team",
    email: "admin@lab.local",
    nickname: "Admin",
    password: "Admin123!",
    isAdmin: true,
  });
}
