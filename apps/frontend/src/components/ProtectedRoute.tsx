import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isPlatformAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
