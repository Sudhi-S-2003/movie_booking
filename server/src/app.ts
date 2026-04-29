import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import authRoutes from './routes/auth.routes.js';
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
import { errorHandler } from './middleware/error.middleware.js';


const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(morgan('dev'));

// Webhook routes register BEFORE the global json parser so their per-route
// `express.raw` body capture (needed for HMAC over the exact bytes) isn't
// clobbered by a preceding `express.json` that already drained the stream.
app.use('/api/webhooks', externalWebhookRoutes);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'CinemaConnect API is running' });
});

// Route Registration
app.use('/api/auth', authRoutes);
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

// 404 handler
app.use((_req, res, _next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
