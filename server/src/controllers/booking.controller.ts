import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { Showtime } from '../models/showtime.model.js';
import { SeatReservation } from '../models/seatReservation.model.js';
import { SeatStatus } from '../constants/enums.js';
import { getBookingNamespace } from '../socket/index.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import { notificationService } from '../services/notification.service.js';

export const getShowtimeDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid showtime ID' });
    }

    const showtime = await Showtime.findById(id)
      .populate('movieId')
      .populate('screenId')
      .populate('theatreId');

    if (!showtime) {
      return res.status(404).json({ success: false, message: 'Showtime not found' });
    }

    // Fetch all active reservations (Locked or Booked)
    const reservations = await SeatReservation.find({ showtimeId: id as any });

    res.status(200).json({
      success: true,
      showtime,
      reservations: reservations.map(r => ({
        seatId: r.seatId,
        status: r.status,
        expiresAt: r.expiresAt
      }))
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getShowtimesByMovie = async (req: Request, res: Response) => {
  try {
    const { movieId } = req.params;

    if (!movieId || typeof movieId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }
    
    const { city } = req.query;
    
    const filter: any = { movieId };
    
    // We need to find theatres in that city first if city is provided
    // Alternatively, we can use a more complex join if theatreId is populated
    // but Mongoose find() with filter on populated field is tricky.
    // However, Showtime model HAS theatreId.
    
    const showtimes = await Showtime.find(filter)
      .populate({
        path: 'theatreId',
        match: city ? { city: (city as string).toLowerCase() } : {}
      })
      .populate('screenId')
      .sort({ startTime: 1 });

    // Filter out showtimes where theatreId is null (meaning it didn't match the city)
    const filteredShowtimes = city ? showtimes.filter(st => st.theatreId !== null) : showtimes;

    res.status(200).json({
      success: true,
      showtimes: filteredShowtimes
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const lockSeat = async (req: AuthRequest, res: Response) => {
  try {
    const { showtimeId, seatId, seatIds, price, prices } = req.body;
    const userId = req.user!.id;

    // Support both single seat and bulk: seatIds = ['A-1','A-2'] or seatId = 'A-1'
    const seatsToLock: { id: string; price: number }[] = [];
    if (Array.isArray(seatIds)) {
      seatIds.forEach((sid: string, i: number) => {
        seatsToLock.push({ id: sid, price: Array.isArray(prices) ? (prices[i] || 0) : (price || 0) });
      });
    } else if (seatId) {
      seatsToLock.push({ id: seatId, price: price || 0 });
    }

    if (seatsToLock.length === 0) {
      return res.status(400).json({ success: false, message: 'No seats provided' });
    }

    // Check if any seat is already reserved
    const existingIds = seatsToLock.map(s => s.id);
    const existing = await SeatReservation.find({ showtimeId, seatId: { $in: existingIds } });
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some seats are already locked or booked',
        conflicting: existing.map(e => e.seatId),
      });
    }

    // Create locks
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const reservations = await SeatReservation.insertMany(
      seatsToLock.map(s => ({
        showtimeId,
        userId,
        seatId: s.id,
        price: s.price,
        status: SeatStatus.LOCKED,
        expiresAt,
      }))
    );

    // Broadcast real-time lock
    seatsToLock.forEach(s => {
      getBookingNamespace().to(showtimeId as string).emit('seat_locked', { seatId: s.id, status: SeatStatus.LOCKED });
    });

    // Return single reservation for backward compat, or array for bulk
    if (seatsToLock.length === 1) {
      res.status(201).json({ success: true, reservation: reservations[0] });
    } else {
      res.status(201).json({ success: true, reservations });
    }
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const unlockSeat = async (req: AuthRequest, res: Response) => {
  try {
    const { showtimeId, seatId, seatIds } = req.body;
    const userId = req.user!.id;

    // Support both single seat and bulk
    const seatsToUnlock: string[] = Array.isArray(seatIds) ? seatIds : seatId ? [seatId] : [];

    if (seatsToUnlock.length === 0) {
      return res.status(400).json({ success: false, message: 'No seats provided' });
    }

    const result = await SeatReservation.deleteMany({
      showtimeId,
      seatId: { $in: seatsToUnlock },
      userId,
      status: SeatStatus.LOCKED,
    });

    // Broadcast release for each seat
    seatsToUnlock.forEach(sid => {
      getBookingNamespace().to(showtimeId).emit('seat_released', { seatId: sid });
    });

    res.status(200).json({ success: true, message: `${result.deletedCount} seat(s) unlocked`, unlockedCount: result.deletedCount });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const confirmBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { reservationIds } = req.body;
    const ids = Array.isArray(reservationIds) ? reservationIds : [reservationIds];

    // Find reservations first to get showtimeId and seatIds for broadcasting
    const lockedReservations = await SeatReservation.find({
      _id: { $in: ids },
      userId: req.user!.id,
      status: SeatStatus.LOCKED,
    });

    if (lockedReservations.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid locked seats found to book' });
    }

    // Update to BOOKED
    await SeatReservation.updateMany(
      { _id: { $in: ids }, userId: req.user!.id, status: SeatStatus.LOCKED },
      { status: SeatStatus.BOOKED, $unset: { expiresAt: 1 } }
    );

    // Broadcast booked status to the showtime room
    const showtimeId = lockedReservations[0]!.showtimeId.toString();
    const seatIds = lockedReservations.map(r => r.seatId);
    seatIds.forEach(seatId => {
      getBookingNamespace().to(showtimeId).emit('seat_booked', { seatId, status: SeatStatus.BOOKED });
    });

    // Notify admins about the new booking
    notificationService.notifyAdmins(
      'New Movie Booking!',
      `User ${req.user!.name} just booked ${seatIds.length} seat(s).`
    );

    res.status(200).json({ success: true, message: 'Booking confirmed successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// Beacon endpoint for page close/reload — authenticates via body token instead of header
// Supports both single seatId and bulk seatIds
export const unlockSeatBeacon = async (req: Request, res: Response) => {
  try {
    const { showtimeId, seatId, seatIds, token } = req.body;
    if (!showtimeId || !token) {
      return res.status(400).json({ success: false });
    }

    const seatsToUnlock: string[] = Array.isArray(seatIds) ? seatIds : seatId ? [seatId] : [];
    if (seatsToUnlock.length === 0) {
      return res.status(400).json({ success: false });
    }

    // Verify token manually
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    const userId = decoded.id;

    await SeatReservation.deleteMany({
      showtimeId,
      seatId: { $in: seatsToUnlock },
      userId,
      status: SeatStatus.LOCKED,
    });

    seatsToUnlock.forEach(sid => {
      getBookingNamespace().to(showtimeId).emit('seat_released', { seatId: sid });
    });

    res.status(200).json({ success: true });
  } catch {
    res.status(200).json({ success: false });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const filter = { userId, status: SeatStatus.BOOKED };
    const page = parsePage(req);

    const [bookings, total] = await Promise.all([
      SeatReservation.find(filter)
        .populate({
          path: 'showtimeId',
          populate: [
            { path: 'movieId' },
            { path: 'theatreId' },
            { path: 'screenId' }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit),
      SeatReservation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      bookings,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
