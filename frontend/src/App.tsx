import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "./hooks/useAuth";
import { AppLayout } from "./layouts/AppLayout";
import { Alerts } from "./pages/Alerts";
import { Allocation } from "./pages/Allocation";
import { CollectionRequests } from "./pages/CollectionRequests";
import { ControlTower } from "./pages/ControlTower";
import { CropProblemSolver } from "./pages/CropProblemSolver";
import { Dashboard } from "./pages/Dashboard";
import { Emergencies } from "./pages/Emergencies";
import { FarmingImprovement } from "./pages/FarmingImprovement";
import { Fleet } from "./pages/Fleet";
import { Forecast } from "./pages/Forecast";
import { Inventory } from "./pages/Inventory";
import { InventoryHistory } from "./pages/InventoryHistory";
import { Login } from "./pages/Login";
import { Produce } from "./pages/Produce";
import { Profile } from "./pages/Profile";
import { ShipmentDetail } from "./pages/ShipmentDetail";
import { Shipments } from "./pages/Shipments";
import { Tracking } from "./pages/Tracking";
import { canAccess } from "./utils/navigation";

function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Routes outside a role's sidebar redirect to that role's dashboard. */
function RoleRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  if (!session) return <Navigate to="/login" replace />;
  if (!canAccess(session.role, pathname)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        element={
          <RequireSession>
            <AppLayout />
          </RequireSession>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/:shipmentId" element={<ShipmentDetail />} />
        <Route
          path="produce"
          element={
            <RoleRoute>
              <Produce />
            </RoleRoute>
          }
        />
        <Route
          path="collection-requests"
          element={
            <RoleRoute>
              <CollectionRequests />
            </RoleRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <RoleRoute>
              <Inventory />
            </RoleRoute>
          }
        />
        <Route
          path="inventory-history"
          element={
            <RoleRoute>
              <InventoryHistory />
            </RoleRoute>
          }
        />
        <Route
          path="allocation"
          element={
            <RoleRoute>
              <Allocation />
            </RoleRoute>
          }
        />
        <Route
          path="forecast"
          element={
            <RoleRoute>
              <Forecast />
            </RoleRoute>
          }
        />
        <Route
          path="fleet"
          element={
            <RoleRoute>
              <Fleet />
            </RoleRoute>
          }
        />
        <Route
          path="emergencies"
          element={
            <RoleRoute>
              <Emergencies />
            </RoleRoute>
          }
        />
        <Route
          path="control-tower"
          element={
            <RoleRoute>
              <ControlTower />
            </RoleRoute>
          }
        />
        <Route path="tracking" element={<Tracking />} />
        <Route path="alerts" element={<Alerts />} />
        <Route
          path="farming-improvement"
          element={
            <RoleRoute>
              <FarmingImprovement />
            </RoleRoute>
          }
        />
        <Route
          path="crop-problem-solver"
          element={
            <RoleRoute>
              <CropProblemSolver />
            </RoleRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
