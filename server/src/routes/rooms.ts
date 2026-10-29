import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  CreateRoomResponseSchema,
  JoinRoomRequestSchema,
  JoinRoomResponseSchema,
  RoomIdSchema,
} from '@bgmi/contracts';
import { ZodError } from 'zod';

import { RoomService, RoomServiceError } from '../rooms/room-service.js';

interface RoomRouteOptions {
  roomService: RoomService;
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: { code: 'invalid_input', message: 'Check the invite and display name, then try again.' },
    });
  }

  if (error instanceof RoomServiceError) {
    const statusByCode = {
      room_not_found: 404,
      room_full: 409,
      livekit_unavailable: 503,
    } as const;

    return reply.code(statusByCode[error.code]).send({
      error: { code: error.code, message: error.message },
    });
  }

  return reply.code(503).send({
    error: { code: 'livekit_unavailable', message: 'Voice service is unavailable' },
  });
}

export async function roomRoutes(app: FastifyInstance, options: RoomRouteOptions): Promise<void> {
  app.post('/rooms', async (_request, reply) => {
    try {
      const result = await options.roomService.createRoom();
      return reply.code(201).send(CreateRoomResponseSchema.parse(result));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Params: { roomId: string } }>('/rooms/:roomId/join', async (request, reply) => {
    try {
      const roomId = RoomIdSchema.parse(request.params.roomId);
      const guest = JoinRoomRequestSchema.parse(request.body);
      const result = await options.roomService.joinRoom(roomId, guest.displayName);
      return reply.code(200).send(JoinRoomResponseSchema.parse(result));
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
