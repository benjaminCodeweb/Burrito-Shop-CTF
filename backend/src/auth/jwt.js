import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, isAdmin: user.isAdmin },
    config.jwtSecret,
    { expiresIn: "2h" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
