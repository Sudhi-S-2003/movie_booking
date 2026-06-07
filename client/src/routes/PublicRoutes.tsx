import { Route } from 'react-router-dom';
import { Home } from '../pages/Home.js';
import { MovieDetails } from '../pages/MovieDetails.js';
import { SeatBooking } from '../pages/SeatBooking.js';
import { Checkout } from '../pages/Checkout.js';
import { Success } from '../pages/Success.js';
import { Login } from '../pages/Login.js';
import { Register } from '../pages/Register.js';
import { Search } from '../pages/Search.js';
import { Dashboard } from '../pages/Dashboard.js';
import { TheatreDetails } from '../pages/TheatreDetails.js';
import { ReviewsPage } from '../pages/ReviewsPage.js';
import { MarketingLayoutWrapper } from '../layouts/MarketingLayout.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { PublicRoute } from '../components/auth/PublicRoute.js';
import { UserDetails } from '../pages/UserDetails.js';
import { ProfileEdit } from '../pages/ProfileEdit.js';
import { Movies } from '../pages/Movies.js';
import { Theatres } from '../pages/Theatres.js';
import { Hashtag } from '../pages/Hashtag.js';
import { PostDetail } from '../pages/PostDetail.js';
import { PublicChat } from '../pages/PublicChat.js';
import { ChatInvite } from '../pages/ChatInvite.js';
import { Subscription } from '../pages/Subscription.js';
import { ApiDocsTest } from '../pages/ApiDocsTest.js';
import PublicTicket from '../pages/PublicTicket.js';
import { ApiDocsSignedService } from '../pages/ApiDocsSignedService.js';
import { TwoFactorSetup } from '../pages/TwoFactorSetup.js';
import { LoginVerify2FA } from '../pages/LoginVerify2FA.js';

export const PublicRoutes = () => (
  <Route element={<MarketingLayoutWrapper />}>
    <Route path="/" element={<Home />} />
    <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
      <Route path="/login" element={<Login />} />
      <Route path="/login/verify-2fa" element={<LoginVerify2FA />} />
      <Route path="/register" element={<Register />} />
    </Route>

    <Route path="/movie/:id" element={<MovieDetails />} />
    <Route path="/movie/:id/reviews" element={<ReviewsPage type="Movie" />} />
    <Route path="/theatre/:id" element={<TheatreDetails />} />
    <Route path="/theatre/:id/reviews" element={<ReviewsPage type="Theatre" />} />
    <Route path="/movies" element={<Movies />} />
    <Route path="/cinemas" element={<Theatres />} />
    <Route path="/hashtag/:tag" element={<Hashtag />} />
    <Route path="/post/:postId" element={<PostDetail />} />
    <Route path="/user/:username" element={<UserDetails />} />
    <Route path="/user/:username/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
    <Route path="/settings/2fa" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
    <Route path="/booking/:showtimeId" element={<SeatBooking />} />
    <Route path="/search" element={<Search />} />

    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

    <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
    <Route path="/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
    <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />

    <Route path="/chat/g/:publicName" element={<PublicChat />} />
    <Route path="/chat/invite/:token" element={<ChatInvite />} />
    <Route path="/ticket/:id" element={<PublicTicket />} />
    <Route path="/docs-test" element={<ApiDocsTest />} />
    <Route path="/docs/signed-service" element={<ApiDocsSignedService />} />
  </Route>
);
