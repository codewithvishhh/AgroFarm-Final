import { useAuth } from "../hooks/useAuth";
import { CollectionDashboard } from "./dashboards/CollectionDashboard";
import { FarmerDashboard } from "./dashboards/FarmerDashboard";
import { RetailerDashboard } from "./dashboards/RetailerDashboard";
import { TransportDashboard } from "./dashboards/TransportDashboard";
import { WarehouseDashboard } from "./dashboards/WarehouseDashboard";

/** Each role lands on a dashboard built around its own responsibilities. */
export function Dashboard() {
  const { session } = useAuth();
  if (!session) return null;

  switch (session.role) {
    case "FARMER":
      return <FarmerDashboard />;
    case "COLLECTION":
      return <CollectionDashboard />;
    case "WAREHOUSE":
      return <WarehouseDashboard />;
    case "TRANSPORT":
      return <TransportDashboard />;
    case "RETAILER":
      return <RetailerDashboard />;
    default:
      return null;
  }
}
