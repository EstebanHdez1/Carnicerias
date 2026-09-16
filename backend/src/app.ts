import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import cutRoutes from './routes/cut.routes.js';
import categoryRoutes from './routes/category.routes.js';
import lotRoutes from './routes/lot.routes.js';
import productRoutes from './routes/product.routes.js';
import saleRoutes from './routes/sale.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/user.routes.js';
import auditRoutes from './routes/audit.routes.js';
import settingsRoutes from './routes/settings.routes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow connections from LAN phones and PCs
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
}));
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cuts', cutRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

// Fallback for 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use(errorHandler);

// Start server listening only in standalone/local mode (not in Vercel serverless environment)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor Carnicería iniciado exitosamente`);
    console.log(`📡 Escuchando en http://0.0.0.0:${ENV.PORT}`);
    console.log(`💻 Local: http://localhost:${ENV.PORT}`);
    console.log(`📱 Red Wi-Fi: http://<TU_IP_LOCAL>:${ENV.PORT}`);
    console.log(`====================================================`);
  });
}

export default app;
