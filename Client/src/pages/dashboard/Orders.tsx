// Phase 5B: dashboard orders are backend-authoritative under /my-orders.
import { Navigate } from 'react-router-dom';

export default function Orders() {
  return <Navigate to="/my-orders" replace />;
}
