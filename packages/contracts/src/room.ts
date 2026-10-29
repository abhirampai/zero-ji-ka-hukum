import { z } from 'zod';

export const RoomIdSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

export const JoinRoomRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(24),
  })
  .strict();

export const CreateRoomResponseSchema = z
  .object({
    roomId: RoomIdSchema,
  })
  .strict();

export const JoinRoomResponseSchema = z
  .object({
    roomId: RoomIdSchema,
    displayName: z.string().min(1).max(24),
    participantIdentity: z.string().min(1),
    serverUrl: z.string().url(),
    token: z.string().min(1),
  })
  .strict();

export const ApiErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type RoomId = z.infer<typeof RoomIdSchema>;
export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof CreateRoomResponseSchema>;
export type JoinRoomResponse = z.infer<typeof JoinRoomResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
