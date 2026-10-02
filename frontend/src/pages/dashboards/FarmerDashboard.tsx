import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listStagger } from "../../animations/variants";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { LanguageSelector } from "../../components/LanguageSelector";
import { ListenButton } from "../../components/ListenButton";
import { Loader } from "../../components/Loader";
import { Panel } from "../../components/Panel";
import { ProductDemand } from "../../components/ProductDemand";
import {
  ProductionAnalysis,
  productionSeries,
  type ProductionSource,
} from "../../components/ProductionAnalysis";
import { ProgressTrack } from "../../components/ProgressTrack";
import {
  RetailerPriceComparison,
  summarizeOffers,
} from "../../components/RetailerPriceComparison";
import { ShipmentForm } from "../../components/ShipmentForm";
import { ShipmentTimeline } from "../../components/ShipmentTimeline";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import {
  demandLevel,
  loadProductDemand,
  type ProductDemand as ProductDemandRow,
} from "../../data/productDemand";
import {
  loadProductionHistory,
  type ProductionHistory,
} from "../../data/productionHistory";
import { loadRetailerOffers, type RetailerOffer } from "../../data/retailerOffers";
import { useAuth } from "../../hooks/useAuth";
import { useFetch } from "../../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../../hooks/useLive";
import { useI18n } from "../../i18n/LanguageProvider";
import { shipmentsApi, vehiclesApi, warehousesApi } from "../../services/api";
import type { Shipment } from "../../types";
import { formatQuantity, formatRupees, timeAgo } from "../../utils/format";
import {
  analyzeProduction,
  describeProduction,
  monthlyTotals,
  type ProductionPoint,
} from "../../utils/productionAnalysis";

export function FarmerDashboard() {
  const { session } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const { t, speechLang } = useI18n();

  // Shared by Local & Foreign Demand, Retailer Price Comparison, and Listen.
  const [product, setProduct] = useState("Tomato");
  const [sellQuantity, setSellQuantity] = useState(100);
  const [demandRows, setDemandRows] = useState<ProductDemandRow[]>([]);
  const [offers, setOffers] = useState<RetailerOffer[]>([]);
  const [productionRows, setProductionRows] = useState<ProductionHistory[]>([]);
  const [productionSource, setProductionSource] =
    useState<ProductionSource>("region");
  useEffect(() => {
    let alive = true;
    loadProductDemand()
      .then((rows) => alive && setDemandRows(rows))
      .catch(() => undefined);
    loadRetailerOffers()
      .then((rows) => alive && setOffers(rows))
      .catch(() => undefined);
    loadProductionHistory()
      .then((rows) => alive && setProductionRows(rows))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "farmer:shipments",
  );
  const vehicles = useFetch(() => vehiclesApi.list(), [], "vehicles");
  const retailers = useFetch(() => warehousesApi.retailers(), [], "retailers");
  const warehouses = useFetch(() => warehousesApi.list(), [], "warehouses");

  useLiveEvent(
    ["SHIPMENT_CREATED", "SHIPMENT_UPDATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );

  const mine = shipments.filter(
    (shipment) => !session || shipment.created_by === session.name,
  );
  const scope = mine.length > 0 ? mine : shipments;

  const today = new Date().toDateString();
  const todaysProduce = scope.filter(
    (shipment) => new Date(`${shipment.created_at}Z`).toDateString() === today,
  );
  const active = scope.filter((shipment) =>
    ["PENDING", "ASSIGNED", "IN_TRANSIT", "DELAYED"].includes(shipment.status),
  );
  const pendingCollection = scope.filter((shipment) =>
    ["REQUESTED", "ACCEPTED"].includes(shipment.collection_status),
  );
  const delivered = scope.filter((shipment) => shipment.status === "DELIVERED");
  const totalQuantity = scope.reduce(
    (sum, shipment) => sum + shipment.quantity,
    0,
  );
  const value = delivered.reduce(
    (sum, shipment) => sum + shipment.estimated_value,
    0,
  );

  // The farmer's own supplied quantity per month, per produce type.
  const myMonthly = useMemo(() => {
    const byProduct: Record<string, { date: Date; quantity: number }[]> = {};
    scope.forEach((shipment) => {
      (byProduct[shipment.produce_type] ??= []).push({
        date: new Date(`${shipment.created_at}Z`),
        quantity: shipment.quantity,
      });
    });
    const result: Record<string, ProductionPoint[]> = {};
    Object.entries(byProduct).forEach(([name, rows]) => {
      result[name] = monthlyTotals(rows, speechLang);
    });
    return result;
  }, [scope, speechLang]);

  /** Plain-language summary read aloud by the 🔊 Listen button. */
  const buildSpokenSummary = () => {
    const number = (value: number) =>
      value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    const lines = [
      t("Farmer dashboard summary."),
      t("Today you raised {count} produce requests.", {
        count: todaysProduce.length,
      }),
      t("Total quantity supplied is {qty} kilograms across {count} requests.", {
        qty: number(totalQuantity),
        count: scope.length,
      }),
      t(
        "You have {count} active shipments, and {pending} are waiting for pickup.",
        { count: active.length, pending: pendingCollection.length },
      ),
      t("Estimated value delivered is {amount} rupees from {count} deliveries.", {
        amount: number(value),
        count: delivered.length,
      }),
    ];

    const demand = demandRows.find((row) => row.product === product);
    if (demand) {
      const local = demandLevel(demand.local.demandTonnes, demand.local.supplyTonnes);
      const foreign = demandLevel(
        demand.foreign.demandTonnes,
        demand.foreign.supplyTonnes,
      );
      lines.push(
        t("{product}: local demand is {level}, about {tonnes} tonnes.", {
          product: t(product),
          level: t(local.toLowerCase()),
          tonnes: number(demand.local.demandTonnes),
        }),
        t(
          "Foreign demand is {level}, about {tonnes} tonnes. Top foreign markets are {markets}.",
          {
            level: t(foreign.toLowerCase()),
            tonnes: number(demand.foreign.demandTonnes),
            markets: demand.foreign.markets.map((market) => t(market)).join(", "),
          },
        ),
      );
    }

    const series = productionSeries(
      productionSource,
      product,
      productionRows,
      myMonthly,
    );
    const analysis = analyzeProduction(series.points);
    if (analysis) {
      lines.push(
        ...describeProduction(analysis, {
          t,
          product,
          unit: t(series.unit),
          period: series.period,
        }).slice(0, 3),
      );
    }

    const offer = summarizeOffers(offers, product, sellQuantity || 0);
    if (offer) {
      lines.push(
        t(
          "Best retailer price for {product} is {price} rupees per kilogram from {retailer}.",
          {
            product: t(product),
            price: offer.best.pricePerKg,
            retailer: offer.best.retailerName,
          },
        ),
      );
      if (offer.extra > 0) {
        lines.push(
          t(
            "Selling {qty} kilograms there instead of to {other} earns {extra} rupees more.",
            {
              qty: number(sellQuantity || 0),
              other: offer.lowest.retailerName,
              extra: number(offer.extra),
            },
          ),
        );
      }
    } else {
      lines.push(t("No retailer offers for {product} yet.", { product: t(product) }));
    }
    return lines.join(" ");
  };

  if (state.loading && shipments.length === 0) {
    return <Loader label={t("Loading your produce")} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LanguageSelector />
        <ListenButton getText={buildSpokenSummary} />
      </div>

      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <StatCard
          label={t("Today's produce")}
          value={todaysProduce.length}
          hint={t("{qty} raised today", {
            qty: formatQuantity(
              todaysProduce.reduce((sum, item) => sum + item.quantity, 0),
              "kg",
            ),
          })}
          tone="crop"
        />
        <StatCard
          label={t("Total quantity supplied")}
          value={formatQuantity(totalQuantity, "")}
          hint={t("{count} requests raised", { count: scope.length })}
          tone="chill"
        />
        <StatCard
          label={t("Active shipments")}
          value={active.length}
          hint={t("{count} waiting for pickup", { count: pendingCollection.length })}
          tone="harvest"
        />
        <StatCard
          label={t("Estimated value delivered")}
          value={formatRupees(value)}
          hint={t("{count} deliveries completed", { count: delivered.length })}
        />
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>{t("Create produce request")}</Button>
      </div>

      <Panel
        title={t("My shipments")}
        description={t("Every load you raised, with its current stage")}
        bodyClassName="p-0"
        action={
          <Link
            to="/shipments"
            className="px-5 text-[11px] text-moss transition-colors hover:text-crop"
          >
            {t("See all")}
          </Link>
        }
      >
        {scope.length === 0 ? (
          <EmptyState
            title={t("No produce raised yet")}
            hint={t(
              "Create a request with the produce, quantity, and the retailer it should reach.",
            )}
            action={
              <Button onClick={() => setFormOpen(true)}>
                {t("Create produce request")}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-husk/8">
            {scope.slice(0, 6).map((shipment) => (
              <li key={shipment.shipment_id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/shipments/${shipment.shipment_id}`}
                      className="font-mono text-xs text-crop hover:underline"
                    >
                      {shipment.shipment_id}
                    </Link>
                    <p className="mt-1 text-xs text-husk">
                      {t(shipment.produce_type)} ·{" "}
                      {formatQuantity(shipment.quantity, shipment.quantity_unit)}{" "}
                      · {t("to")} {shipment.destination}
                    </p>
                    <p className="mt-0.5 text-[11px] text-moss">
                      {t("Vehicle")}{" "}
                      {shipment.vehicle?.vehicle_number ?? t("not assigned yet")} ·{" "}
                      {t("raised")} {timeAgo(shipment.created_at)}
                    </p>
                  </div>
                  <StatusBadge
                    status={shipment.status}
                    pulse={shipment.status === "IN_TRANSIT"}
                  />
                </div>

                <div className="mt-3">
                  <ShipmentTimeline stage={shipment.stage} />
                </div>

                {shipment.status === "IN_TRANSIT" && (
                  <div className="mt-3">
                    <ProgressTrack
                      value={shipment.progress_percentage}
                      label={t("{percent}% of the route covered", {
                        percent: shipment.progress_percentage.toFixed(0),
                      })}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ProductDemand
        rows={demandRows}
        product={product}
        onProductChange={setProduct}
      />

      <ProductionAnalysis
        history={productionRows}
        myMonthly={myMonthly}
        product={product}
        onProductChange={setProduct}
        source={productionSource}
        onSourceChange={setProductionSource}
      />

      <RetailerPriceComparison
        product={product}
        onProductChange={setProduct}
        quantity={sellQuantity}
        onQuantityChange={setSellQuantity}
      />

      <ShipmentForm
        open={formOpen}
        vehicles={vehicles.data ?? []}
        retailers={retailers.data ?? []}
        warehouses={warehouses.data ?? []}
        onClose={() => setFormOpen(false)}
        onCreated={(shipment) =>
          setShipments((current) => [shipment, ...current])
        }
      />
    </div>
  );
}
