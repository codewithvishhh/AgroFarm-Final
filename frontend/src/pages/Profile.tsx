import { LogOut } from "lucide-react";

import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { systemApi } from "../services/api";
import { formatDateTime } from "../utils/format";
import { NAVIGATION, ROLE_LABEL } from "../utils/navigation";

export function Profile() {
  const { session, signOut } = useAuth();
  const health = useFetch(() => systemApi.health(), []);
  if (!session) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Your session" description="Stored on this device only">
        <dl className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-moss">Name</dt>
            <dd className="mt-1 text-husk">{session.name}</dd>
          </div>
          <div>
            <dt className="text-moss">Role</dt>
            <dd className="mt-1 text-husk">{ROLE_LABEL[session.role]}</dd>
          </div>
          <div>
            <dt className="text-moss">User ID</dt>
            <dd className="mt-1 font-mono text-[11px] text-husk">
              {session.user_id}
            </dd>
          </div>
          <div>
            <dt className="text-moss">Signed in</dt>
            <dd className="mt-1 text-husk">{formatDateTime(session.issued_at)}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-husk/8 pt-4">
          <p className="text-[11px] text-moss">Pages available to your role</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NAVIGATION[session.role].map((item) => (
              <span
                key={item.to}
                className="rounded-full border border-husk/12 px-2.5 py-1 text-[11px] text-husk/80"
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <Button variant="danger" onClick={signOut} className="mt-5">
          <LogOut size={14} />
          Logout
        </Button>
      </Panel>

      <Panel title="Platform" description="Backend and simulator state">
        <dl className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-moss">Service</dt>
            <dd className="mt-1 text-husk">
              {health.data?.app_name ?? "AgroFarm"}
            </dd>
          </div>
          <div>
            <dt className="text-moss">API status</dt>
            <dd className="mt-1 text-husk">
              {health.error ? "Unreachable" : (health.data?.status ?? "…")}
            </dd>
          </div>
          <div>
            <dt className="text-moss">Movement simulator</dt>
            <dd className="mt-1 text-husk">
              {health.data?.simulator_running ? "Running" : "Stopped"}
            </dd>
          </div>
          <div>
            <dt className="text-moss">Live clients</dt>
            <dd className="mt-1 text-husk">
              {health.data?.websocket_clients ?? 0}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-[11px] leading-relaxed text-moss">
          {health.data?.tagline ?? "Smart Agricultural Supply Chain Platform"}
        </p>
      </Panel>
    </div>
  );
}
