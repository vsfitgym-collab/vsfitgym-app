import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import PersonalDashboard from './pages/PersonalDashboard';
import StudentDashboard from './pages/StudentDashboard';
import WorkoutView from './pages/WorkoutView';
import ExerciseLibrary from './pages/ExerciseLibrary';
import Evolution from './pages/Evolution';
import Chat from './pages/Chat';
import CreateWorkout from './pages/CreateWorkout';
import PlansManagement from './pages/PlansManagement';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import SubscriptionOffers from './pages/SubscriptionOffers';

const PrivateRoute: React.FC<{ children: React.ReactNode; role?: 'personal' | 'student' }> = ({ children, role }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && profile?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
};

const HomeRedirect = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile?.role === 'personal') return <Navigate to="/personal" />;
  if (profile?.role === 'student') return <Navigate to="/student" />;
  return <Navigate to="/login" />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout><HomeRedirect /></Layout></PrivateRoute>} />
            
            <Route path="/personal" element={<PrivateRoute role="personal"><Layout><PersonalDashboard /></Layout></PrivateRoute>} />
            <Route path="/student" element={<PrivateRoute role="student"><Layout><StudentDashboard /></Layout></PrivateRoute>} />
            
            <Route path="/workouts/:id" element={<PrivateRoute><Layout><WorkoutView /></Layout></PrivateRoute>} />
            <Route path="/exercises" element={<PrivateRoute><Layout><ExerciseLibrary /></Layout></PrivateRoute>} />
            <Route path="/evolution" element={<PrivateRoute><Layout><Evolution /></Layout></PrivateRoute>} />
            <Route path="/create-workout" element={<PrivateRoute role="personal"><Layout><CreateWorkout /></Layout></PrivateRoute>} />
            <Route path="/plans" element={<PrivateRoute role="personal"><Layout><PlansManagement /></Layout></PrivateRoute>} />
            <Route path="/chat" element={<PrivateRoute><Layout><Chat /></Layout></PrivateRoute>} />
            <Route path="/chat/:recipientId" element={<PrivateRoute><Layout><Chat /></Layout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
            <Route path="/subscriptions" element={<PrivateRoute role="student"><Layout><SubscriptionOffers /></Layout></PrivateRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
