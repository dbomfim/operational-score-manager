import { AuthRouter } from "./auth.router";
import { SecurityRouter } from "./security.router";
import { ModelsRouter } from "./models.router";
import { ClientsRouter } from "./clients.router";
import { CategoriesRouter } from "./categories.router";
import { BucketsRouter } from "./buckets.router";
import { ShowroomRouter } from "./showroom.router";
import { LookupRouter } from "./lookup.router";
import { HistoricoRouter } from "./historico.router";

export const routers = [
  AuthRouter,
  SecurityRouter,
  ModelsRouter,
  ClientsRouter,
  CategoriesRouter,
  BucketsRouter,
  ShowroomRouter,
  LookupRouter,
  HistoricoRouter,
];
