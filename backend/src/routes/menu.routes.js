import { Router } from "express";
import { MENU } from "../store.js";

export const menuRouter = Router();

menuRouter.get("/menu", (_req, res) => {
  res.json({ items: MENU });
});
