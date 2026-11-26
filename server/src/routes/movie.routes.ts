import { Router } from 'express';
import { getMovies, getMovieById, createMovie, updateMovie, deleteMovie, toggleInterest } from '../controllers/movie.controller.js';
import { isAuthenticated, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../modules/access/access.middleware.js';
import { Permission } from '../modules/access/access.constants.js';

// The movie catalog is global, so editing it needs the catalog permission
// (theatre operators can't alter or delete movies other operators rely on).
const canEditCatalog = requirePermission(Permission.MOVIES_CATALOG);

const router = Router();

// Public Routes (Optional Auth to identify user)
router.get('/', optionalAuthenticate, getMovies);
router.get('/:id', optionalAuthenticate, getMovieById);

// Admin Routes (Theatre Owner Required)
router.post('/', isAuthenticated, canEditCatalog, createMovie);
router.put('/:id', isAuthenticated, canEditCatalog, updateMovie);
router.delete('/:id', isAuthenticated, canEditCatalog, deleteMovie);
router.post('/:id/interested', isAuthenticated, toggleInterest);

export default router;
