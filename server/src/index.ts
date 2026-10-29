import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { LiveKitCloudAdmin } from './livekit/livekit-admin.js';
import { RoomService } from './rooms/room-service.js';

const config = loadConfig();
const livekit = new LiveKitCloudAdmin(config);
const roomService = new RoomService(livekit, config);
const app = buildApp({ roomService });

try {
  await app.listen({ host: '0.0.0.0', port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
