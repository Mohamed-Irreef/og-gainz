import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

type Role = 'user' | 'admin';

type RequireRoleProps = {
  allowed: Role | Role[];
  children: ReactNode;
};

// Phase 1: guard utility only (DO NOT APPLY YET)
export const RequireRole = ({ allowed, children }: RequireRoleProps) => {
  const { isAuthenticated, user } = useUser();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  // Role is optional on client until auth is live; treat missing role as not-authorized.
  if (!user?.role || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
