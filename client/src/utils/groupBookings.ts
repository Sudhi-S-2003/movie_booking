/**
 * Groups flat seat-reservation records into per-showtime booking groups.
 * Reservations for the same showtime made within 60 seconds of each other
 * are merged into a single entry with a `seats` array and `totalPrice` sum.
 */
export function groupBookings(bookings: any[]): any[] {
  return bookings.reduce((acc: any[], curr: any) => {
    const showtimeId = curr.showtimeId._id;
    const date = new Date(curr.createdAt).getTime();
    const group = acc.find(
      (g: any) =>
        g.showtimeId._id === showtimeId &&
        Math.abs(new Date(g.createdAt).getTime() - date) < 60000
    );
    if (group) {
      group.seats.push(curr.seatId);
      group.totalPrice += curr.price;
    } else {
      acc.push({ ...curr, seats: [curr.seatId], totalPrice: curr.price });
    }
    return acc;
  }, []);
}
