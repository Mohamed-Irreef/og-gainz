import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout, DashboardLayout, AdminLayout } from "@/components/layout";
import { useUser } from "@/context/UserContext";

import Index from "@/pages/Index";
import MealPacks from "@/pages/MealPacks";
import MealPackDetails from "@/pages/MealPackDetails";
import AddOns from "@/pages/AddOns";
import TrialPacksPhase4 from "@/pages/TrialPacksPhase4";
import BuildYourOwn from "@/pages/BuildYourOwn";
import Cart from "@/pages/Cart";
import OrderDetails from "@/pages/OrderDetails";
import Checkout from "@/pages/Checkout";
import Consultation from "@/pages/Consultation";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import MyOrders from "@/pages/MyOrders";
import MyOrderDetails from "@/pages/MyOrderDetails";
import OrderSuccess from "@/pages/OrderSuccess";
import OrderFailed from "@/pages/OrderFailed";

import {
  Dashboard,
  Subscriptions,
  SubscriptionDetail,
  Deliveries,
  Wallet,
  Settings,
  Orders,
  Support,
} from "@/pages/dashboard";

import {
  AdminDashboard,
  AdminConsultations,
  AdminMeals,
  AdminAddons,
  AdminAddonCategories,
  AdminMealTypes,
  AdminIncludedItems,
  AdminBuildYourOwnItemTypes,
  AdminBuildYourOwnItems,
  AdminBuildYourOwnConfig,
  AdminOrders,
  AdminOrderDetails,
  AdminSubscriptions,
  AdminKitchen,
	AdminUsers,
  AdminUserDetails,
} from "@/pages/admin";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oz-neutral/30">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oz-neutral/30">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Index />} />
        <Route path="meal-packs" element={<MealPacks />} />
        <Route path="meal-packs/:id" element={<MealPackDetails />} />
        <Route path="addons" element={<AddOns />} />
        <Route path="trial" element={<TrialPacksPhase4 />} />
        <Route path="build-your-own" element={<BuildYourOwn />} />
        <Route path="consultation" element={<Consultation />} />
        <Route path="cart" element={<Cart />} />
        <Route path="order-details" element={<OrderDetails />} />
        <Route path="checkout" element={<Checkout />} />
        <Route
          path="my-deliveries"
          element={
            <RequireAuth>
              <Deliveries />
            </RequireAuth>
          }
        />
        <Route
          path="order/success/:orderId"
          element={
            <RequireAuth>
              <OrderSuccess />
            </RequireAuth>
          }
        />
        <Route
          path="order/failed/:orderId"
          element={
            <RequireAuth>
              <OrderFailed />
            </RequireAuth>
          }
        />
        <Route
          path="my-orders"
          element={
            <RequireAuth>
              <MyOrders />
            </RequireAuth>
          }
        />
        <Route
          path="my-orders/:orderId"
          element={
            <RequireAuth>
              <MyOrderDetails />
            </RequireAuth>
          }
        />
        <Route path="login" element={<Login />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="orders" element={<Orders />} />
        <Route path="support" element={<Support />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="consultations" element={<AdminConsultations />} />
        <Route path="consultations/:id" element={<AdminConsultations />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:userId" element={<AdminUserDetails />} />
        <Route path="meals" element={<AdminMeals />} />
        <Route path="addons" element={<AdminAddons />} />
    		<Route path="addon-categories" element={<AdminAddonCategories />} />
		<Route path="meal-types" element={<AdminMealTypes />} />
		<Route path="included-items" element={<AdminIncludedItems />} />
		<Route path="byo-item-types" element={<AdminBuildYourOwnItemTypes />} />
		<Route path="byo-items" element={<AdminBuildYourOwnItems />} />
		<Route path="byo-config" element={<AdminBuildYourOwnConfig />} />
		<Route path="orders" element={<AdminOrders />} />
		<Route path="orders/:orderId" element={<AdminOrderDetails />} />
    <Route path="subscriptions" element={<AdminSubscriptions />} />
    <Route path="kitchen" element={<AdminKitchen />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
