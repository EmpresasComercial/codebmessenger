import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, ready } = useAuth();
  const location = useLocation();

  // Enquanto o contexto inicializa o primeiro getSession em background
  if (!ready) return null; 

  // Se nÃ£o houver sessÃ£o vÃ¡lida, redireciona imediatamente
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se estiver autenticado, exibe a rota privada sem loaders extras
  return <>{children}</>;
}

