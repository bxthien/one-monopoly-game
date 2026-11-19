import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { setupSocketServer } from './socketServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  // Ưu tiên en0 (Wi-Fi trên macOS)
  if (interfaces['en0']) {
    const en0Ipv4 = interfaces['en0'].find((i) => i.family === 'IPv4' && !i.internal);
    if (en0Ipv4) return en0Ipv4.address;
  }
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('172.16.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function start() {
  const app = fastify({ logger: true });

  await app.register(fastifyCors, {
    origin: '*',
  });

  // Health check route
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Network info for LAN multiplayer
  app.get('/api/network-info', async () => {
    const PORT = Number(process.env.PORT) || 3000;
    const lanIp = getLocalIpAddress();
    return {
      lanIp,
      port: PORT,
      lanUrl: `http://${lanIp}:${PORT}`,
    };
  });

  // Serve Client Build (if exists)
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    await app.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/',
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }

  // Setup Socket.io on Fastify's raw http server
  setupSocketServer(app.server);

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚢 ONE Monopoly Server is navigating at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
