import { Router } from 'express';
import { getShowtimeDetails, getShowtimesByMovie, lockSeat, unlockSeat, unlockSeatBeacon, confirmBooking, getMyBookings } from '../controllers/booking.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// Public: Get layout and current occupancy
router.get('/showtime/:id', getShowtimeDetails);
router.get('/movie/:movieId', getShowtimesByMovie);

// Protected: Lock, Unlock, and Book seats
router.post('/lock', isAuthenticated, lockSeat);
router.post('/unlock', isAuthenticated, unlockSeat);
router.post('/confirm', isAuthenticated, confirmBooking);
router.get('/my-bookings', isAuthenticated, getMyBookings);

// Beacon endpoint (no auth middleware — token in body)
router.post('/unlock-beacon', unlockSeatBeacon);

export default router;
