import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Today from './pages/Today';
import ThisWeek from './pages/ThisWeek';
import WeekTemplates from './pages/WeekTemplates';
import DayTemplates from './pages/DayTemplates';
import Activities from './pages/Activities';

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
        <Route path="week-templates" element={<WeekTemplates />} />
        <Route path="days" element={<DayTemplates />} />
        <Route path="activities" element={<Activities />} />
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
