import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import authRoutes from './routes/auth.routes.js';
import passkeyRoutes from './routes/passkey.routes.js';
import adminRoutes from './routes/admin.routes.js';
import movieRoutes from './routes/movie.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import searchRoutes from './routes/search.routes.js';
import reviewRoutes from './routes/review.routes.js';
import userRoutes from './routes/user.routes.js';
import theatreRoutes from './routes/theatre.routes.js';
import issueRoutes from './routes/issue.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import hashtagRoutes from './routes/hashtag.routes.js';
import postRoutes from './routes/post.routes.js';
import statsRoutes from './routes/stats.routes.js';
import chatRoutes from './routes/chat.routes.js';
import apiKeyRoutes from './routes/apiKey.routes.js';
import apiKeyPublicRoutes from './routes/apiKey.public.routes.js';
import externalWebhookRoutes from './routes/external.webhook.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import urlPreviewRoutes from './routes/urlPreview.routes.js';
import apiServicePublicRoutes from './routes/apiService.public.routes.js';
import imageRoutes from './routes/image.routes.js';
import shareRoutes from "./routes/share/share.routes.js";
import chatbotRoutes from './routes/chatbot.routes.js';
import { getClientIp } from './utils/ip.util.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimit.middleware.js';
import errorMiddleware from './middleware/error.middleware.v1.js';
import { optionalAuthenticate } from './middleware/auth.middleware.js';
import { accountRouter, manageRouter } from './modules/accounts/accounts.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { requireService, type ServiceGateOptions } from './modules/catalog/catalog.middleware.js';
import { SERVICE_KEYS } from './modules/catalog/catalog.registry.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable trust proxy so that req.ip gets populated correctly when running behind reverse proxies
app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Middleware
app.use(helmet());
const allowedOrigins = [
  env.FRONTEND_URL,
  ...env.CORS_EXTRA_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.static(path.join(__dirname, '../public')));

// Webhook routes register BEFORE the global json parser so their per-route
// `express.raw` body capture (needed for HMAC over the exact bytes) isn't
// clobbered by a preceding `express.json` that already drained the stream.
app.use('/api/webhooks', externalWebhookRoutes);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', ip: getClientIp(req) });
});

// Apply Global Rate Limiting to all /api endpoints (excluding external webhooks)
app.use('/api', apiRateLimiter);

// ── Route registration ──────────────────────────────────────────────────────
// Platform core (not services): identity, accounts, catalog, billing.
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/auth/passkey', authRateLimiter, passkeyRoutes);
app.use('/api/account', accountRouter);
app.use('/api/manage', manageRouter);
app.use('/api/services', catalogRouter);
app.use('/api/billing', billingRouter);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/stats', statsRoutes);

// Services. Each mount resolves the caller (if any) and enforces access to
// that service. `writesOnly` keeps public browsing open while gating actions;
// `allowAnonymous` leaves guest flows to the routes' own authorization.
const gate = (key: string, opts: ServiceGateOptions = {}) => [optionalAuthenticate, requireService(key, opts)];

app.use('/api/chat', gate(SERVICE_KEYS.CHAT, { allowAnonymous: true }), chatRoutes);
app.use('/api/public/chat', apiKeyPublicRoutes);
app.use('/api/chatbots', gate(SERVICE_KEYS.CHATBOT), chatbotRoutes);
app.use('/api/issues', gate(SERVICE_KEYS.SUPPORT, { allowAnonymous: true }), issueRoutes);
app.use('/api/integrations', gate(SERVICE_KEYS.MESSAGING), integrationRoutes);
app.use('/api/url/preview', urlPreviewRoutes);
app.use('/api/public/api-service', apiServicePublicRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/share', shareRoutes);

// Movie booking service.
const movies = gate(SERVICE_KEYS.MOVIES, { allowAnonymous: true, writesOnly: true });
app.use('/api/movies', movies, movieRoutes);
app.use('/api/theatres', movies, theatreRoutes);
app.use('/api/booking', movies, bookingRoutes);
app.use('/api/payment', gate(SERVICE_KEYS.MOVIES), paymentRoutes);
app.use('/api/movie-ops', gate(SERVICE_KEYS.MOVIES), adminRoutes);
/** @deprecated alias kept for existing clients; use /api/movie-ops. */
app.use('/api/admin', gate(SERVICE_KEYS.MOVIES), adminRoutes);

// Social service.
const social = gate(SERVICE_KEYS.SOCIAL, { allowAnonymous: true, writesOnly: true });
app.use('/api/users', social, userRoutes);
app.use('/api/posts', social, postRoutes);
app.use('/api/hashtags', social, hashtagRoutes);
app.use('/api/reviews', social, reviewRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use((_req, res, _next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Global Error Handler
app.use(errorMiddleware);

export default app;
