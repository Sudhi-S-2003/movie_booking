import { Router } from 'express';
import { getMovies, getMovieById, createMovie, updateMovie, deleteMovie, toggleInterest } from '../controllers/movie.controller.js';
import { isAuthenticated, isTheatreOwner, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public Routes (Optional Auth to identify user)
router.get('/', optionalAuthenticate, getMovies);
router.get('/:id', optionalAuthenticate, getMovieById);

// Admin Routes (Theatre Owner Required)
router.post('/', isAuthenticated, isTheatreOwner, createMovie);
router.put('/:id', isAuthenticated, isTheatreOwner, updateMovie);
router.delete('/:id', isAuthenticated, isTheatreOwner, deleteMovie);
router.post('/:id/interested', isAuthenticated, toggleInterest);

export default router;
