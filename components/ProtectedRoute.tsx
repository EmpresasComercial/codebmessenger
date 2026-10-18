import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageSkeleton from './PageSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, ready } = useAuth();
  const location = useLocation();

  // Enquanto o contexto inicializa o primeiro getSession em background
  if (!ready) return <PageSkeleton />;

  // Redirect immediately when there is no valid session.
  if (!session) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Se estiver autenticado, exibe a rota privada sem loaders extras
  return <>{children}</>;
}
