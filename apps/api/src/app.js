import express from 'express';
import cors from 'cors';
import errorHandler from './middleware/errorHandler.js';
import auth from './middleware/auth.js';
import tenantContext from './middleware/tenantContext.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import businessRoutes from './modules/business/business.routes.js';
import accountRoutes from './modules/account/account.routes.js';
import itemRoutes from './modules/item/item.routes.js';
import mcRoutes from './modules/material-centre/materialCentre.routes.js';
import partyRoutes from './modules/party/party.routes.js';
import voucherRoutes from './modules/voucher/voucher.routes.js';
import bomRoutes from './modules/bom/bom.routes.js';

// Initialize event handlers (side-effect import)
import './events/handlers/auditHandler.js';

// Register voucher type handlers
import { registerAllHandlers } from './modules/voucher/handlers/index.js';
registerAllHandlers();

const app = express();

// Core middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Authenticated routes (no tenant context needed)
app.use('/api/businesses', businessRoutes);

// Tenant-scoped routes (require auth + x-business-id header)
app.use('/api/accounts', auth, tenantContext, accountRoutes);
app.use('/api/items', auth, tenantContext, itemRoutes);
app.use('/api/material-centres', auth, tenantContext, mcRoutes);
app.use('/api/parties', auth, tenantContext, partyRoutes);
app.use('/api/vouchers', auth, tenantContext, voucherRoutes);
app.use('/api/boms', auth, tenantContext, bomRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export default app;
