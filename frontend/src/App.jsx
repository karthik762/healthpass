import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorRegisterPage from './pages/DoctorRegisterPage';
import DashboardPage from './pages/DashboardPage';
import RecordsPage from './pages/RecordsPage';
import FamilyPage from './pages/FamilyPage';
import SharePage from './pages/SharePage';
import InsightsPage from './pages/InsightsPage';
import TimelinePage from './pages/TimelinePage';
import EmergencyCardPage from './pages/EmergencyCardPage';
import CommunityPage from './pages/CommunityPage';
import SettingsPage from './pages/SettingsPage';
import DoctorAccessPage from './pages/DoctorAccessPage';
import DoctorLayout from './layouts/DoctorLayout';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import AiSummaryPage from './pages/AiSummaryPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/doctor" element={<DoctorRegisterPage />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/emergency-card" element={<EmergencyCardPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/ai-summary" element={<AiSummaryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/doctor-access" element={<DoctorAccessPage />} />
      <Route path="/doctor" element={<DoctorLayout />}>
        <Route index element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
