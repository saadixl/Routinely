import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Today from './pages/Today';
import ThisWeek from './pages/ThisWeek';
import Setup from './pages/Setup';

function Loading() {
  return <div className="center-screen"><div className="spinner" /></div>;
}

function AppRoutes() {
  const { ready } = useData();
  if (!ready) return <Loading />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="day/:date" element={<Today />} />
        <Route path="week" element={<ThisWeek />} />
        <Route path="week/:start" element={<ThisWeek />} />
        <Route path="setup" element={<Setup />} />
        <Route path="setup/:tab" element={<Setup />} />
        <Route path="activities" element={<Navigate to="/setup/activities" replace />} />
        <Route path="days" element={<Navigate to="/setup/days" replace />} />
        <Route path="week-templates" element={<Navigate to="/setup/weeks" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Login />;
  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
