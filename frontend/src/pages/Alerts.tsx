import { Check, Eye } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useFetch } from "../hooks/useFetch";
import { useLiveEvent } from "../hooks/useLive";
import { alertsApi } from "../services/api";
import type { Alert, AlertSeverity } from "../types";
import { formatDateTime, titleCase } from "../utils/format";

const SEVERITIES: (AlertSeverity | "ALL")[] = [
  "ALL",
  "CRITICAL",
  "WARNING",
  "INFO",
];

export function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severity, setSeverity] = useState<AlertSeverity | "ALL">("ALL");
  const [type, setType] = useState("ALL");
  const [openOnly, setOpenOnly] = useState(true);

  const state = useFetch(
    () => alertsApi.list().then((rows) => (setAlerts(rows), rows)),
    [],
    "alerts",
  );

  useLiveEvent(
    ["ALERT_CREATED"],
    useCallback((message) => {
      setAlerts((current) => [message.data as Alert, ...current]);
    }, []),
  );

  const types = useMemo(
    () => Array.from(new Set(alerts.map((alert) => alert.alert_type))).sort(),
    [alerts],
  );

  const visible = alerts.filter((alert) => {
    if (openOnly && alert.is_resolved) return false;
    if (severity !== "ALL" && alert.severity !== severity) return false;
    if (type !== "ALL" && alert.alert_type !== type) return false;
    return true;
  });

  const update = (updated: Alert) =>
    setAlerts((current) =>
      current.map((alert) => (alert.id === updated.id ? updated : alert)),
    );

  if (state.loading && alerts.length === 0) {
    return <Loader label="Loading alerts" />;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open alerts"
          value={alerts.filter((alert) => !alert.is_resolved).length}
          tone="harvest"
        />
        <StatCard
          label="Critical"
          value={
            alerts.filter(
              (alert) => alert.severity === "CRITICAL" && !alert.is_resolved,
            ).length
          }
          tone="rot"
        />
        <StatCard
          label="Unread"
          value={alerts.filter((alert) => !alert.is_read).length}
          tone="chill"
        />
        <StatCard
          label="Resolved"
          value={alerts.filter((alert) => alert.is_resolved).length}
          tone="crop"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SEVERITIES.map((option) => (
          <button
            key={option}
            onClick={() => setSeverity(option)}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
              severity === option
                ? "border-crop/40 bg-crop/10 text-crop"
                : "border-husk/12 bg-husk/4 text-moss backdrop-blur hover:border-husk/25 hover:text-husk"
            }`}
          >
            {option === "ALL" ? "All severities" : titleCase(option)}
          </button>
        ))}

        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="rounded-lg border border-husk/12 bg-soil-800/55 backdrop-blur px-2.5 py-1.5 text-[11px] text-husk outline-none focus:border-crop/60"
        >
          <option value="ALL">All types</option>
          {types.map((option) => (
            <option key={option} value={option}>
              {titleCase(option)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-[11px] text-moss">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(event) => setOpenOnly(event.target.checked)}
            className="accent-crop"
          />
          Open only
        </label>
      </div>

      <Panel bodyClassName="p-0">
        {visible.length === 0 ? (
          <EmptyState
            title="Nothing to review"
            hint="Alerts are raised automatically when a sensor reading or a delivery deadline goes out of band."
          />
        ) : (
          <ul className="divide-y divide-husk/8">
            {visible.map((alert) => (
              <li
                key={alert.id}
                className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${
                  alert.is_read ? "opacity-75" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={alert.severity} />
                    <span className="text-[11px] text-moss">
                      {titleCase(alert.alert_type)}
                    </span>
                    {alert.audience && (
                      <span className="rounded-full border border-husk/12 px-2 py-0.5 text-[10px] text-moss">
                        {titleCase(alert.audience)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-husk">{alert.message}</p>
                  <p className="mt-1 text-[11px] text-moss">
                    {formatDateTime(alert.created_at)}
                    {alert.shipment_id && (
                      <>
                        {" · "}
                        <Link
                          to={`/shipments/${alert.shipment_id}`}
                          className="font-mono text-crop hover:underline"
                        >
                          {alert.shipment_id}
                        </Link>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  {!alert.is_read && (
                    <Button
                      variant="quiet"
                      onClick={() => alertsApi.markRead(alert.id).then(update)}
                    >
                      <Eye size={12} />
                      Mark read
                    </Button>
                  )}
                  {!alert.is_resolved && (
                    <Button
                      variant="ghost"
                      onClick={() => alertsApi.resolve(alert.id).then(update)}
                    >
                      <Check size={12} />
                      Resolve
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
