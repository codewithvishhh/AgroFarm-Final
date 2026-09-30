import {
  AlertTriangle,
  BarChart3,
  Bug,
  Boxes,
  ClipboardList,
  Gauge,
  History,
  LayoutDashboard,
  LifeBuoy,
  Map,
  PackageSearch,
  Sprout,
  Truck,
  User,
  Warehouse,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Role } from "../types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Sidebar contents per role. Routes not listed here stay out of reach. */
export const NAVIGATION: Record<Role, NavItem[]> = {
  FARMER: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/produce", label: "My produce", icon: Sprout },
    { to: "/shipments", label: "Shipments", icon: PackageSearch },
    { to: "/tracking", label: "Track shipment", icon: Map },
    { to: "/alerts", label: "Alerts", icon: AlertTriangle },
    { to: "/farming-improvement", label: "Farming Improvement", icon: Wheat },
    { to: "/crop-problem-solver", label: "Crop Problem Solver", icon: Bug },
    { to: "/profile", label: "Profile", icon: User },
  ],
  COLLECTION: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/collection-requests", label: "Collection requests", icon: ClipboardList },
    { to: "/shipments", label: "Shipments", icon: PackageSearch },
    { to: "/tracking", label: "Map", icon: Map },
    { to: "/alerts", label: "Alerts", icon: AlertTriangle },
    { to: "/profile", label: "Profile", icon: User },
  ],
  WAREHOUSE: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/inventory", label: "Inventory", icon: Boxes },
    { to: "/inventory-history", label: "Inventory history", icon: History },
    { to: "/shipments", label: "Incoming and outgoing", icon: PackageSearch },
    { to: "/allocation", label: "Warehouse allocation", icon: Warehouse },
    { to: "/forecast", label: "Demand forecast", icon: BarChart3 },
    { to: "/tracking", label: "Map", icon: Map },
    { to: "/alerts", label: "Alerts", icon: AlertTriangle },
    { to: "/profile", label: "Profile", icon: User },
  ],
  TRANSPORT: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/fleet", label: "Fleet", icon: Truck },
    { to: "/tracking", label: "Live map", icon: Map },
    { to: "/shipments", label: "Shipments", icon: PackageSearch },
    { to: "/emergencies", label: "Emergencies", icon: LifeBuoy },
    { to: "/control-tower", label: "Control tower", icon: Gauge },
    { to: "/alerts", label: "Alerts", icon: AlertTriangle },
    { to: "/profile", label: "Profile", icon: User },
  ],
  RETAILER: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/inventory", label: "Inventory", icon: Boxes },
    { to: "/shipments", label: "Incoming shipments", icon: PackageSearch },
    { to: "/forecast", label: "Demand forecast", icon: BarChart3 },
    { to: "/tracking", label: "Live tracking", icon: Map },
    { to: "/alerts", label: "Alerts", icon: AlertTriangle },
    { to: "/profile", label: "Profile", icon: User },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  FARMER: "Farmer",
  COLLECTION: "Collection",
  WAREHOUSE: "Warehouse",
  TRANSPORT: "Transport",
  RETAILER: "Retailer",
};

export function canAccess(role: Role, path: string): boolean {
  if (path.startsWith("/shipments/")) return true;
  return NAVIGATION[role].some((item) => item.to === path);
}
