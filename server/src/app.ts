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
import subscriptionRoutes from './routes/subscription.routes.js';
import externalWebhookRoutes from './routes/external.webhook.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import urlPreviewRoutes from './routes/urlPreview.routes.js';
import apiServicePublicRoutes from './routes/apiService.public.routes.js';
import imageRoutes from './routes/image.routes.js';
import shareRoutes from "./routes/share/share.routes.js";
import chatbotRoutes from './routes/chatbot.routes.js';
// import { errorHandler } from './middleware/error.middleware.js';
import { getClientIp } from './utils/ip.util.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimit.middleware.js';
import errorMiddleware from './middleware/error.middleware.v1.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable trust proxy so that req.ip gets populated correctly when running behind reverse proxies
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

// Webhook routes register BEFORE the global json parser so their per-route
// `express.raw` body capture (needed for HMAC over the exact bytes) isn't
// clobbered by a preceding `express.json` that already drained the stream.
app.use('/api/webhooks', externalWebhookRoutes);

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/health', (req, res) => {
  const ip = getClientIp(req);
  res.status(200).json({ status: 'OK', message: 'CinemaConnect API is running', ip });
});

// Apply Global Rate Limiting to all /api endpoints (excluding external webhooks)
app.use('/api', apiRateLimiter);

// Route Registration
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/auth/passkey', authRateLimiter, passkeyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/theatres', theatreRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/public/chat', apiKeyPublicRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/url/preview', urlPreviewRoutes);
app.use('/api/public/api-service', apiServicePublicRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/share',shareRoutes);
app.use('/api/chatbots', chatbotRoutes);

// 404 handler
app.use((_req, res, _next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Global Error Handler
// app.use(errorHandler);
app.use(errorMiddleware);

export default app;
