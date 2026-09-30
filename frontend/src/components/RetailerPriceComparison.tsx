import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { listStagger } from "../animations/variants";
import {
  loadRetailerOffers,
  OFFERS_ARE_SAMPLE_DATA,
  type RetailerOffer,
} from "../data/retailerOffers";
import { useI18n } from "../i18n/LanguageProvider";
import { formatQuantity, formatRupees } from "../utils/format";
import { ChartViewToggle } from "./ChartViewToggle";
import { EmptyState } from "./EmptyState";
import { Panel } from "./Panel";
import { StatCard } from "./StatCard";

const axisStyle = { fill: "#8CA79A", fontSize: 11 };
const tooltipStyle = {
  background: "#121D18",
  border: "1px solid #274236",
  borderRadius: 12,
  fontSize: 12,
  color: "#E6EFE8",
};
const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

interface OfferRow extends RetailerOffer {
  totalValue: number; // price per kg × the retailer's offered quantity
  yourRevenue: number; // price per kg × the farmer's quantity
  gapPerKg: number; // how far below the highest offer, ₹/kg
  isHighest: boolean;
}

/** Latest offer from each retailer for one product. */
export function latestPerRetailer(offers: RetailerOffer[], product: string) {
  const byRetailer = new Map<string, RetailerOffer>();
  offers
    .filter((offer) => offer.product === product)
    .forEach((offer) => {
      const current = byRetailer.get(offer.retailerName);
      if (!current || offer.date > current.date) {
        byRetailer.set(offer.retailerName, offer);
      }
    });
  return [...byRetailer.values()];
}

/**
 * Highest and lowest current offer for a product, and what the farmer's
 * quantity would earn at each. Shared with the spoken dashboard summary.
 */
export function summarizeOffers(
  offers: RetailerOffer[],
  product: string,
  quantity: number,
) {
  const latest = latestPerRetailer(offers, product).sort(
    (a, b) => b.pricePerKg - a.pricePerKg,
  );
  if (latest.length === 0) return null;
  const best = latest[0];
  const lowest = latest[latest.length - 1];
  return {
    best,
    lowest,
    bestRevenue: best.pricePerKg * quantity,
    extra: (best.pricePerKg - lowest.pricePerKg) * quantity,
  };
}

interface RetailerPriceComparisonProps {
  /** Optional: control the selected product from the parent. */
  product?: string;
  onProductChange?: (product: string) => void;
  /** Optional: control the farmer's quantity from the parent. */
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
}

export function RetailerPriceComparison({
  product: productProp,
  onProductChange,
  quantity: quantityProp,
  onQuantityChange,
}: RetailerPriceComparisonProps = {}) {
  const { t } = useI18n();
  const [offers, setOffers] = useState<RetailerOffer[]>([]);
  const [productState, setProductState] = useState("");
  const [quantityState, setQuantityState] = useState(100);
  const product = productProp ?? productState;
  const setProduct = (next: string) => {
    setProductState(next);
    onProductChange?.(next);
  };
  const myQuantity = quantityProp ?? quantityState;
  const setMyQuantity = (next: number) => {
    setQuantityState(next);
    onQuantityChange?.(next);
  };
  const [sellTo, setSellTo] = useState("");
  const [insteadOf, setInsteadOf] = useState("");

  useEffect(() => {
    let alive = true;
    loadRetailerOffers()
      .then((rows) => {
        if (!alive) return;
        setOffers(rows);
        setProductState((current) => current || rows[0]?.product || "");
      })
      .catch(() => alive && setOffers([]));
    return () => {
      alive = false;
    };
  }, []);

  const products = useMemo(() => {
    const list = [...new Set(offers.map((offer) => offer.product))];
    if (product && !list.includes(product)) list.push(product);
    return list;
  }, [offers, product]);

  const quantity = Number.isFinite(myQuantity) && myQuantity > 0 ? myQuantity : 0;

  const rows = useMemo<OfferRow[]>(() => {
    const latest = latestPerRetailer(offers, product);
    const highest = Math.max(0, ...latest.map((offer) => offer.pricePerKg));
    return latest
      .map((offer) => ({
        ...offer,
        totalValue: offer.pricePerKg * offer.quantity,
        yourRevenue: offer.pricePerKg * quantity,
        gapPerKg: highest - offer.pricePerKg,
        isHighest: offer.pricePerKg === highest,
      }))
      .sort((a, b) => b.pricePerKg - a.pricePerKg);
  }, [offers, product, quantity]);

  const best = rows[0];
  const lowest = rows[rows.length - 1];

  // Default the "sell to / instead of" comparison to highest vs lowest
  // whenever the product changes.
  useEffect(() => {
    setSellTo(best?.retailerName ?? "");
    setInsteadOf(lowest?.retailerName ?? "");
  }, [product, best?.retailerName, lowest?.retailerName]);

  const rowA = rows.find((row) => row.retailerName === sellTo);
  const rowB = rows.find((row) => row.retailerName === insteadOf);
  const extra = rowA && rowB ? rowA.yourRevenue - rowB.yourRevenue : 0;

  return (
    <Panel
      title={t("Retailer Price Comparison")}
      description={`${t("Which retailer is offering the better price for your produce")}${
        OFFERS_ARE_SAMPLE_DATA ? t(" · sample offers, not live prices") : ""
      }`}
    >
      {offers.length === 0 ? (
        <EmptyState
          title={t("No retailer offers yet")}
          hint={t("Offers from retailers will show here once they are available.")}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-moss">
              {t("Product")}
              <select
                value={product}
                onChange={(event) => setProduct(event.target.value)}
                className={`mt-1 block ${fieldClass}`}
              >
                {products.map((item) => (
                  <option key={item} value={item}>
                    {t(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-moss">
              {t("Your quantity (kg)")}
              <input
                type="number"
                min={1}
                value={Number.isFinite(myQuantity) ? myQuantity : ""}
                onChange={(event) => setMyQuantity(event.target.valueAsNumber)}
                className={`mt-1 block w-28 ${fieldClass}`}
              />
            </label>
          </div>

          {!best && (
            <EmptyState
              title={t("No retailer offers for {product} yet", {
                product: t(product),
              })}
              hint={t("Pick another product to compare prices.")}
            />
          )}

          {best && (
            <p className="text-xs leading-relaxed text-husk">
              {t("Highest offer:")}{" "}
              <strong className="text-crop">{best.retailerName}</strong> (
              {t(best.location)}) {t("at")}{" "}
              <strong>₹{best.pricePerKg}/kg</strong>
            </p>
          )}

          {best && (
            <motion.div
              key={`${product}-${quantity}`}
              variants={listStagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            >
              <StatCard
                label={t("Highest price")}
                value={`₹${best.pricePerKg}/kg`}
                hint={t("Offered by {name}", { name: best.retailerName })}
                tone="crop"
              />
              <StatCard
                label={t("Lowest price")}
                value={`₹${lowest.pricePerKg}/kg`}
                hint={t("Offered by {name}", { name: lowest.retailerName })}
                tone="harvest"
              />
              <StatCard
                label={t("Potential revenue")}
                value={formatRupees(best.yourRevenue)}
                hint={t("For {qty} at the highest price", {
                  qty: formatQuantity(quantity, "kg"),
                })}
                tone="chill"
              />
              <StatCard
                label={t("Potential extra revenue")}
                value={formatRupees(best.yourRevenue - lowest.yourRevenue)}
                hint={t("vs selling to {name}", { name: lowest.retailerName })}
              />
            </motion.div>
          )}

          {best && (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] text-moss">{t("Price per KG by retailer")}</p>
              <ChartViewToggle
                height={Math.max(220, rows.length * 44)}
                pieData={rows.map((row) => ({
                  name: row.retailerName,
                  value: row.pricePerKg,
                }))}
                formatValue={(value) => `₹${value}/kg`}
              >
              <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 0, left: 20 }}
                >
                  <CartesianGrid stroke="#1D2F27" strokeDasharray="3 6" />
                  <XAxis
                    type="number"
                    tick={axisStyle}
                    stroke="#274236"
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="retailerName"
                    tick={axisStyle}
                    stroke="#274236"
                    width={110}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "#16241E" }}
                    formatter={(value) => [`₹${value}/kg`, t("Price per KG")]}
                  />
                  <Bar dataKey="pricePerKg" radius={[0, 6, 6, 0]}>
                    {rows.map((row) => (
                      <Cell
                        key={row.retailerName}
                        fill={row.isHighest ? "#4FBF7A" : "#2F8F5B"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </ChartViewToggle>
            </div>

            <div className="min-w-0 space-y-3">
              <p className="text-[11px] text-moss">{t("Compare two retailers")}</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-[11px] text-moss">
                  {t("If I sell to")}
                  <select
                    value={sellTo}
                    onChange={(event) => setSellTo(event.target.value)}
                    className={`mt-1 block ${fieldClass}`}
                  >
                    {rows.map((row) => (
                      <option key={row.retailerName} value={row.retailerName}>
                        {row.retailerName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-moss">
                  {t("instead of")}
                  <select
                    value={insteadOf}
                    onChange={(event) => setInsteadOf(event.target.value)}
                    className={`mt-1 block ${fieldClass}`}
                  >
                    {rows.map((row) => (
                      <option key={row.retailerName} value={row.retailerName}>
                        {row.retailerName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {rowA && rowB && (
                <div className="rounded-xl border border-husk/8 bg-soil-800/40 p-4 text-xs leading-relaxed text-husk">
                  <p>
                    {rowA.retailerName}: ₹{rowA.pricePerKg}/kg ×{" "}
                    {formatQuantity(quantity, "kg")} ={" "}
                    <strong>{formatRupees(rowA.yourRevenue)}</strong>
                  </p>
                  <p>
                    {rowB.retailerName}: ₹{rowB.pricePerKg}/kg ×{" "}
                    {formatQuantity(quantity, "kg")} ={" "}
                    <strong>{formatRupees(rowB.yourRevenue)}</strong>
                  </p>
                  <p
                    className={`mt-2 font-medium ${
                      extra > 0 ? "text-crop" : extra < 0 ? "text-rot" : "text-moss"
                    }`}
                  >
                    {extra > 0
                      ? t("You could receive {amount} more.", {
                          amount: formatRupees(extra),
                        })
                      : extra < 0
                        ? t("You would receive {amount} less.", {
                            amount: formatRupees(-extra),
                          })
                        : t("Both offers give the same revenue.")}
                  </p>
                </div>
              )}
            </div>
          </div>

          )}

          {best && (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] text-moss">
                  <th className="px-5 py-3 font-medium">{t("Retailer")}</th>
                  <th className="px-5 py-3 font-medium">{t("Product")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("Price per KG")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("Quantity")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("Total Value")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("Price Difference")}</th>
                  <th className="px-5 py-3 font-medium">{t("Comparison")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-husk/8">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors duration-200 hover:bg-husk/6"
                  >
                    <td className="px-5 py-3 align-top">
                      <p className="text-xs text-husk">{row.retailerName}</p>
                      <p className="text-[11px] text-moss">
                        {t(row.location)} · {new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </td>
                    <td className="px-5 py-3 align-top text-xs text-husk">
                      {t(row.product)}
                    </td>
                    <td className="px-5 py-3 text-right align-top font-mono text-xs text-husk">
                      ₹{row.pricePerKg}/kg
                    </td>
                    <td className="px-5 py-3 text-right align-top font-mono text-xs text-husk">
                      {formatQuantity(row.quantity, "kg")}
                    </td>
                    <td className="px-5 py-3 text-right align-top font-mono text-xs text-husk">
                      {formatRupees(row.totalValue)}
                    </td>
                    <td className="px-5 py-3 text-right align-top font-mono text-xs text-moss">
                      {row.isHighest ? "—" : `−₹${row.gapPerKg}/kg`}
                    </td>
                    <td className="px-5 py-3 align-top text-[11px]">
                      {row.isHighest ? (
                        <span className="rounded-full bg-crop/15 px-2 py-0.5 font-medium text-crop">
                          {t("Highest")}
                        </span>
                      ) : (
                        <span className="text-moss">
                          {t("{amount} less for {qty}", {
                            amount: formatRupees(row.gapPerKg * quantity),
                            qty: formatQuantity(quantity, "kg"),
                          })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}
    </Panel>
  );
}
