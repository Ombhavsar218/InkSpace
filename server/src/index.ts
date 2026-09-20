import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import whiteboardRoutes from './routes/whiteboardRoutes';
import commentRoutes from './routes/commentRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { setupSocketGateway } from './sockets/collabGateway';

const app = express();
const server = http.createServer(app);

// Socket.IO configuration with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads folder
app.use('/uploads', express.static(config.uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'InkSpace Server', timestamp: new Date().toISOString() });
});

// Setup Real-time collaboration sockets
setupSocketGateway(io);

// Serve the built client (single-origin production deploy)
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Start server
server.listen(config.port, () => {
  console.log(`🚀 InkSpace Backend server running on http://localhost:${config.port}`);
  console.log(`⚡ WebSocket Gateway ready for live collaboration`);
});
