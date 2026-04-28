import { Router } from 'express';
import {
  getTheatreById,
  getShowtimesByTheatre,
  getAllTheatres,
  getTheatreReviews,
  getCities,
} from '../controllers/theatre.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/',                  getAllTheatres);
router.get('/cities',            getCities);
router.get('/:id',                optionalAuthenticate, getTheatreById);
router.get('/:id/reviews',        getTheatreReviews);
router.get('/:id/showtimes',      getShowtimesByTheatre);

export default router;
