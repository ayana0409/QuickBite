import { ConfigService } from "@nestjs/config";
import { config } from "process";

export function getRequired<T>(cfg: ConfigService, key: string): T {
  const v = cfg.get<T>(key);
  if (v === undefined || v === null) throw new Error(`Missing config ${key}`);
  return v;
}
