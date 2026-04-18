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

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
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

export default app;
