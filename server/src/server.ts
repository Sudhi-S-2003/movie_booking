import { env } from './env.js';
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { initSocket } from './socket/index.js';
import { Movie } from './models/movie.model.js';
import { Theatre } from './models/theatre.model.js';

const { PORT, MONGODB_URI } = env;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Ensure search indexes are ready for production scale
    try {
      await Promise.all([
        Movie.syncIndexes(),
        Theatre.syncIndexes()
      ]);
      console.log('🔍 Search Indexes Synchronized');
    } catch (indexError) {
      console.error('⚠️ Index sync warning:', indexError);
    }
    
    // Start Server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🔄 Shutting down...');
      server.close();
      await mongoose.disconnect();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
