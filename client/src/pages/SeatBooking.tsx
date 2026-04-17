import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useSeatBooking } from '../hooks/useSeatBooking.js';
import {
  BookingHeader,
  SeatCountPicker,
  SeatMap,
  SeatLegend,
  BookingBottomBar,
} from '../components/booking/index.js';

export const SeatBooking = () => {
  useDocumentTitle('Select Seats');

  const {
    showtime,
    selectedSeats,
    lockedSeats,
    timeLeft,
    zoom,
    seatCount,
    totalPrice,
    tierSections,
    seatScrollRef,
    setZoom,
    formatTime,
    handleSeatClick,
    handleSeatCountChange,
    handleClear,
    proceedToCheckout,
    navigate,
  } = useSeatBooking();

  if (!showtime) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <div className="w-16 h-16 border-4 border-accent-pink border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-black text-white uppercase tracking-widest">Loading Seats...</h2>
    </div>
  );

  const { movieId: movie, screenId: screen, theatreId: theatre } = showtime;

  return (
    <div className="min-h-screen pb-40 text-white selection:bg-accent-pink/30">
      {}
      <div className="fixed inset-0 -z-10 bg-[#050505]" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-accent-pink/[0.03] via-transparent to-transparent" />

      {}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <BookingHeader
          movie={movie}
          theatre={theatre}
          screen={screen}
          showtime={showtime}
          onBack={() => navigate(-1)}
        />
      </div>

      {}
      <div className="max-w-6xl mx-auto px-6 mt-5">
        <SeatCountPicker
          seatCount={seatCount}
          selectedCount={selectedSeats.length}
          onCountChange={handleSeatCountChange}
        />
      </div>

      {}
      <div className="max-w-6xl mx-auto px-6 mt-4">
        <SeatMap
          tierSections={tierSections}
          screenLayout={screen?.layout}
          selectedSeats={selectedSeats}
          lockedSeats={lockedSeats}
          zoom={zoom}
          onZoomChange={setZoom}
          onSeatClick={handleSeatClick}
          scrollRef={seatScrollRef}
        />
        <SeatLegend />
      </div>

      {}
      <BookingBottomBar
        selectedSeats={selectedSeats}
        totalPrice={totalPrice}
        timeLeft={timeLeft}
        formatTime={formatTime}
        onClear={handleClear}
        onProceed={proceedToCheckout}
      />
    </div>
  );
};
