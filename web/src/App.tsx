import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { SettingsProvider } from './settings/SettingsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import ProfileDetail from './pages/ProfileDetail';
import ProfileEdit from './pages/ProfileEdit';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import Support from './pages/Support';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/50">
        <div className="animate-pulse text-lg tracking-wide">Brooke's List…</div>
      </div>
    );
  }

  // The whole app is gated: no data-bearing route mounts until we have a user.
  if (!user) return <Login />;

  return (
    <SettingsProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/profile/new" element={<ProfileEdit />} />
          <Route path="/profile/:id" element={<ProfileDetail />} />
          <Route path="/profile/:id/edit" element={<ProfileEdit />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/support" element={<Support />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </SettingsProvider>
  );
}
