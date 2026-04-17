import { Router } from 'express';
import { 
  createTheatre, 
  getMyTheatres, 
  createScreen, 
  getScreensByTheatre, 
  updateScreenLayout,
  createShowtime,
  getShowtimesByScreen,
  updateShowtime,
  deleteShowtime
} from '../controllers/admin.controller.js';
import { isAuthenticated, isTheatreOwner } from '../middleware/auth.middleware.js';

const router = Router();

// All routes here require Authentication and TheatreOwner role
router.use(isAuthenticated, isTheatreOwner);

// Theatre Management
router.post('/theatres', createTheatre);
router.get('/theatres', getMyTheatres);

// Screen Management
router.post('/screens', createScreen);
router.get('/theatres/:theatreId/screens', getScreensByTheatre);
router.put('/screens/:id/layout', updateScreenLayout);

// Showtime Management
router.post('/showtimes', createShowtime);
router.get('/screens/:screenId/showtimes', getShowtimesByScreen);
router.put('/showtimes/:id', updateShowtime);
router.delete('/showtimes/:id', deleteShowtime);

export default router;
