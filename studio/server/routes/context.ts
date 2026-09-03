import type { StudioService } from "../service.ts";

export interface Env {
  Variables: {
    service: StudioService;
  };
}

export function service(context: { get(key: "service"): StudioService }): StudioService {
  return context.get("service");
}
