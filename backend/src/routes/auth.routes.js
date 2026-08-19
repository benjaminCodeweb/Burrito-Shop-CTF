import { Router } from "express";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail, toPublicUser } from "../store.js";
import { signToken } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";

export const authRouter = Router();

const MAX_NICKNAME_LENGTH = 20;

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // lab local por http; poner true detras de https
  maxAge: 2 * 60 * 60 * 1000,
};

authRouter.post("/register", (req, res) => {
  const { name, email, nickname, password } = req.body ?? {};
  if (!name || !email || !nickname || !password) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return res.status(400).json({ error: `El nickname no puede tener mas de ${MAX_NICKNAME_LENGTH} caracteres.` });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "El email ya esta registrado" });
  }

  const user = createUser({ name, email, nickname, password });
  res.status(201).json({ user: toPublicUser(user) });
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const user = findUserByEmail(email ?? "");
  if (!user || !bcrypt.compareSync(password ?? "", user.passwordHash)) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }

  const token = signToken(user);
  res.cookie("token", token, COOKIE_OPTS);
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", COOKIE_OPTS);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

// Endpoint que usa el formulario de perfil para cambiar nombre y nickname
// despues del registro. req.user es la misma referencia guardada en el Map
// de usuarios, asi que mutarlo actualiza el "registro" sin pasos extra.
authRouter.put("/me", requireAuth, (req, res) => {
  const { name, nickname } = req.body ?? {};
  if (nickname !== undefined && nickname.length > MAX_NICKNAME_LENGTH) {
    return res.status(400).json({ error: `El nickname no puede tener mas de ${MAX_NICKNAME_LENGTH} caracteres.` });
  }
  if (name !== undefined) req.user.name = name;
  if (nickname !== undefined) req.user.nickname = nickname;
  res.json({ user: toPublicUser(req.user) });
});

// *** VULNERABILIDAD: falta de validacion de longitud ***
// Ruta de actualizacion parcial equivalente a PUT /me, pero que quedo sin
// el limite de longitud del nickname (quiza pensada para actualizar un solo
// campo sin repetir la validacion completa). El formulario de perfil nunca
// la usa - solo llama a PUT /me - pero sigue expuesta y aceptando el mismo
// payload sin el chequeo de MAX_NICKNAME_LENGTH.
authRouter.patch("/me", requireAuth, (req, res) => {
  const { name, nickname } = req.body ?? {};
  if (name !== undefined) req.user.name = name;
  if (nickname !== undefined) req.user.nickname = nickname;
  res.json({ user: toPublicUser(req.user) });
});
