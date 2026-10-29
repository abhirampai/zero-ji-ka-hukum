import Fastify from 'fastify';

import { roomRoutes } from './routes/rooms.js';
import type { RoomService } from './rooms/room-service.js';

interface BuildAppOptions {
  roomService: RoomService;
}

export function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: false });

  app.get('/healthz', async () => ({ status: 'ok' as const }));
  app.register(roomRoutes, { prefix: '/v1', roomService: options.roomService });

  return app;
}
