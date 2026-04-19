import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home.js';
import { MovieDetails } from './pages/MovieDetails.js';
import { SeatBooking } from './pages/SeatBooking.js';
import { Checkout } from './pages/Checkout.js';
import { Success } from './pages/Success.js';
import { Auth } from './pages/Auth.js';
import { Search } from './pages/Search.js';
import { Dashboard } from './pages/Dashboard.js';
import { OwnerOverview } from './pages/dashboards/owner/OwnerOverview.js';
import { OwnerArchitecture } from './pages/dashboards/owner/OwnerArchitecture.js';
import { OwnerTimeline } from './pages/dashboards/owner/OwnerTimeline.js';
import { OwnerSupport } from './pages/dashboards/owner/OwnerSupport.js';
import { TheatreDetails } from './pages/TheatreDetails.js';
import { OwnerLayout } from './layouts/OwnerLayout.js';
import { UserLayout } from './layouts/UserLayout.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { MarketingLayoutWrapper } from './layouts/MarketingLayout.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { BookingSessionProvider } from './providers/BookingSessionProvider.js';
import { SubscriptionProvider } from './components/chat/hooks/useSubscription.js';

import { AdminOverview } from './pages/dashboards/admin/AdminOverview.js';
import { AdminMovies } from './pages/dashboards/admin/AdminMovies.js';
import { AdminTheatres } from './pages/dashboards/admin/AdminTheatres.js';
import { AdminUsers } from './pages/dashboards/admin/AdminUsers.js';
import { AdminIssues } from './pages/dashboards/admin/AdminIssues.js';
import { UserDetails } from './pages/UserDetails.js';
import { ProfileEdit } from './pages/ProfileEdit.js';
import { UserBookings } from './pages/dashboards/user/UserBookings.js';
import { UserStats } from './pages/dashboards/user/UserStats.js';
import { UserSupport } from './pages/dashboards/user/UserSupport.js';
import { Movies } from './pages/Movies.js';
import { Theatres } from './pages/Theatres.js';
import { Hashtag } from './pages/Hashtag.js';
import { PostDetail } from './pages/PostDetail.js';
import { Chat } from './pages/Chat.js';
import { ChatMembers } from './pages/ChatMembers.js';
import { ChatJoinRequests } from './pages/ChatJoinRequests.js';
import { PublicChat } from './pages/PublicChat.js';
import { ChatInvite } from './pages/ChatInvite.js';
import { ApiKeys } from './pages/ApiKeys.js';
import { ApiKeyChat } from './pages/ApiKeyChat.js';
import { Subscription } from './pages/Subscription.js';


const App = () => {
  return (
    <BrowserRouter>
      <SubscriptionProvider>
      <BookingSessionProvider>
      <Routes>
        {}
        <Route path="/chat/:conversationId" element={<ApiKeyChat />} />

        <Route element={<MarketingLayoutWrapper />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/theatre/:id" element={<TheatreDetails />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/cinemas" element={<Theatres />} />
          <Route path="/hashtag/:tag" element={<Hashtag />} />
          <Route path="/post/:postId" element={<PostDetail />} />
          <Route path="/user/:username" element={<UserDetails />} />
          <Route path="/user/:username/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
          <Route path="/booking/:showtimeId" element={<SeatBooking />} />
          <Route path="/search" element={<Search />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {}
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />

          {/* Public chat onboarding — no auth required to view */}
          <Route path="/chat/g/:publicName"   element={<PublicChat />} />
          <Route path="/chat/invite/:token"   element={<ChatInvite />} />
        </Route>

        {}
        <Route 
          path="/owner" 
          element={
            <ProtectedRoute>
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OwnerOverview />} />
          <Route path="architecture" element={<OwnerArchitecture />} />
          <Route path="timeline" element={<OwnerTimeline />} />
          <Route path="support" element={<OwnerSupport />} />
          <Route path="support/:issueId" element={<OwnerSupport />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="chat/:conversationId/members" element={<ChatMembers />} />
          <Route path="chat/:conversationId/join-requests" element={<ChatJoinRequests />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="settings" element={<div className="flex items-center justify-center h-full text-gray-500 font-black uppercase tracking-[0.5em]">Settings Module Coming Soon</div>} />
        </Route>

        {}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="movies" element={<AdminMovies />} />
          <Route path="theatres" element={<AdminTheatres />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="issues" element={<AdminIssues />} />
          <Route path="issues/:issueId" element={<AdminIssues />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="chat/:conversationId/members" element={<ChatMembers />} />
          <Route path="chat/:conversationId/join-requests" element={<ChatJoinRequests />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="settings" element={<div className="flex items-center justify-center h-full text-gray-500 font-black uppercase tracking-[0.5em]">System Settings Hub Coming Soon</div>} />
        </Route>

        {}
        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="bookings" replace />} />
          <Route path="bookings" element={<UserBookings />} />
          <Route path="stats" element={<UserStats />} />
          <Route path="support" element={<UserSupport />} />
          <Route path="support/:issueId" element={<UserSupport />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="chat/:conversationId/members" element={<ChatMembers />} />
          <Route path="chat/:conversationId/join-requests" element={<ChatJoinRequests />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="settings" element={<div className="flex items-center justify-center h-full text-gray-500 font-black uppercase tracking-[0.5em]">Account Settings Coming Soon</div>} />
        </Route>

        {}
        <Route path="/my-bookings" element={<Navigate to="/user/bookings" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BookingSessionProvider>
      </SubscriptionProvider>
    </BrowserRouter>
  );
};

export default App;