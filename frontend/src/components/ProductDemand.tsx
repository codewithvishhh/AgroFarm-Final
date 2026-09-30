import {
  DEMAND_IS_SAMPLE_DATA,
  demandLevel,
  type DemandLevel,
  type ProductDemand as ProductDemandRow,
} from "../data/productDemand";
import { useI18n } from "../i18n/LanguageProvider";
import { EmptyState } from "./EmptyState";
import { Panel } from "./Panel";

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

const LEVEL_STYLE: Record<DemandLevel, string> = {
  High: "bg-crop/15 text-crop",
  Medium: "bg-harvest/15 text-harvest",
  Low: "bg-rot/15 text-rot",
};

const LEVEL_NOTE: Record<DemandLevel, string> = {
  High: "Buyers need more than is available. Good time to sell.",
  Medium: "Supply is close to demand.",
  Low: "More supply than demand. Prices may be lower.",
};

function DemandCard({
  icon,
  title,
  demandTonnes,
  supplyTonnes,
  marketsLabel,
  markets,
}: {
  icon: string;
  title: string;
  demandTonnes: number;
  supplyTonnes: number;
  marketsLabel: string;
  markets: string[];
}) {
  const { t } = useI18n();
  const level = demandLevel(demandTonnes, supplyTonnes);
  const tonnes = (value: number) =>
    t("{tonnes} tonnes", { tonnes: value.toLocaleString("en-IN") });

  return (
    <div className="rounded-xl border border-husk/8 bg-soil-800/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold text-husk">
          <span aria-hidden className="mr-1.5">
            {icon}
          </span>
          {t(title)}
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${LEVEL_STYLE[level]}`}
        >
          {t("Demand")}: {t(level)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[11px] text-moss">{t("Estimated demand")}</dt>
          <dd className="mt-0.5 font-display text-lg font-semibold text-husk">
            {tonnes(demandTonnes)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-moss">{t("Available supply")}</dt>
          <dd className="mt-0.5 font-display text-lg font-semibold text-husk">
            {tonnes(supplyTonnes)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-husk">{t(LEVEL_NOTE[level])}</p>

      <p className="mt-3 text-[11px] text-moss">{t(marketsLabel)}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {markets.map((market) => (
          <li
            key={market}
            className="rounded-lg border border-husk/10 px-2 py-0.5 text-[11px] text-husk"
          >
            {t(market)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 🇮🇳 Local and 🌍 foreign demand for the selected product. */
export function ProductDemand({
  rows,
  product,
  onProductChange,
}: {
  rows: ProductDemandRow[];
  product: string;
  onProductChange: (product: string) => void;
}) {
  const { t } = useI18n();
  const row = rows.find((item) => item.product === product) ?? rows[0];

  return (
    <Panel
      title={t("Local & Foreign Demand")}
      description={`${t("How much buyers need your produce in India and abroad")}${
        DEMAND_IS_SAMPLE_DATA ? t(" · sample data, not live") : ""
      }`}
    >
      {!row ? (
        <EmptyState
          title={t("No demand data yet")}
          hint={t("Demand figures will show here once they are available.")}
        />
      ) : (
        <div className="space-y-4">
          <label className="block text-[11px] text-moss">
            {t("Product")}
            <select
              value={row.product}
              onChange={(event) => onProductChange(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            >
              {rows.map((item) => (
                <option key={item.product} value={item.product}>
                  {t(item.product)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <DemandCard
              icon="🇮🇳"
              title="Local Market"
              demandTonnes={row.local.demandTonnes}
              supplyTonnes={row.local.supplyTonnes}
              marketsLabel="Main local markets"
              markets={row.local.markets}
            />
            <DemandCard
              icon="🌍"
              title="Foreign Market"
              demandTonnes={row.foreign.demandTonnes}
              supplyTonnes={row.foreign.supplyTonnes}
              marketsLabel="Top foreign markets"
              markets={row.foreign.markets}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
