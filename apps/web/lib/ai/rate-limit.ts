// Rate limit por usuario en llamadas IA (5s por defecto).
// Implementación en memoria — suficiente para dev y para deployments single-instance.
// Para multi-instance hay que migrar a Redis o a un tracker en DB.

import { LIMITS } from "@/lib/ai/config";

const lastCall = new Map<number, number>();

export class RateLimitError extends Error {
  status = 429;
  constructor(public waitSeconds: number) {
    super(`Demasiadas llamadas IA seguidas. Espera ${waitSeconds}s antes de volver a intentar.`);
    this.name = "RateLimitError";
  }
}

/** Lanza RateLimitError si el usuario hizo una llamada IA hace < N segundos. */
export function assertRateLimit(usuario_id: number): void {
  const now = Date.now();
  const last = lastCall.get(usuario_id) ?? 0;
  const elapsedSeconds = (now - last) / 1000;
  if (elapsedSeconds < LIMITS.rateLimitSeconds) {
    throw new RateLimitError(Math.ceil(LIMITS.rateLimitSeconds - elapsedSeconds));
  }
  lastCall.set(usuario_id, now);
}
