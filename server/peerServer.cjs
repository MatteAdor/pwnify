#!/usr/bin/env node
/**
 * ZeroDay PvP — Self-Hosted PeerServer Signaling Daemon
 * Handles WebRTC peer discovery, ICE exchange, and ephemeral signaling.
 *
 * Usage:
 *   PEER_PORT=9000 PEER_PATH=/peerjs PEER_KEY=zeroday-pvp node server/peerServer.cjs
 */

const { PeerServer } = require('peer');

const PORT = parseInt(process.env.PEER_PORT || process.env.PORT || '9000', 10);
const PATH = process.env.PEER_PATH || '/peerjs';
const KEY = process.env.PEER_KEY || 'zeroday-pvp';
const ALLOW_DISCOVERY = process.env.PEER_ALLOW_DISCOVERY === 'true';

const server = PeerServer({
  port: PORT,
  path: PATH,
  key: KEY,
  allow_discovery: ALLOW_DISCOVERY,
  proxied: true,
  corsOptions: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

console.log(`[ZeroDay PeerServer] Daemon listening on port ${PORT}`);
console.log(`[ZeroDay PeerServer] Signaling Path: ${PATH} | Key: ${KEY}`);

server.on('connection', (client) => {
  console.log(`[ZeroDay PeerServer] Peer connected: ${client.getId()}`);
});

server.on('disconnect', (client) => {
  console.log(`[ZeroDay PeerServer] Peer disconnected: ${client.getId()}`);
});

server.on('error', (err) => {
  console.error('[ZeroDay PeerServer] Error:', err.message);
});

process.on('SIGINT', () => {
  console.log('[ZeroDay PeerServer] Shutting down signaling daemon...');
  process.exit(0);
});
