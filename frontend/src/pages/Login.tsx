import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Loader2, Sprout, User } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/Button";
import { LanguageSelector } from "../components/LanguageSelector";
import { Reveal } from "../components/Reveal";
import { ScrollWorld } from "../components/ScrollWorld";
import { TiltCard } from "../components/TiltCard";
import { useI18n } from "../i18n/LanguageProvider";
import { useAuth } from "../hooks/useAuth";
import { authApi } from "../services/api";
import type { Role } from "../types";
import { ROLE_LABEL } from "../utils/navigation";

const ROLES: Role[] = [
  "FARMER",
  "COLLECTION",
  "WAREHOUSE",
  "TRANSPORT",
  "RETAILER",
];

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("FARMER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const ROLE_HINT: Record<Role, string> = {
    FARMER: t("Raise produce requests and follow them to the retailer"),
    COLLECTION: t("Accept requests, assign pickup, send produce onward"),
    WAREHOUSE: t("Stock, inventory history, allocation, and demand"),
    TRANSPORT: t("Fleet, live map, emergencies, and the control tower"),
    RETAILER: t("Incoming loads, shelf stock, and demand forecast"),
  };

  const CAPABILITIES = [
    t("Live GPS and cold chain readings from farm gate to shelf."),
    t("Warehouse inventory with a full movement track record."),
    t("Emergency assistance that finds the nearest help on the map."),
    t("Demand forecasting from recorded daily sales."),
  ];

  // Authentication is unchanged: name plus role, then straight to the dashboard.
  const submit = async () => {
    if (!name.trim()) {
      setError(t("Enter your name to continue."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      signIn(await authApi.login(name.trim(), role));
      navigate("/", { replace: true });
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div ref={scrollRef} className="scene h-full overflow-y-auto">
      <ScrollWorld containerRef={scrollRef} />

      {/* Floating glass navigation. */}
      <nav className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-husk">
            <Sprout size={18} className="text-crop" />
            Agro<span className="-ml-2 text-crop">Farm</span>
          </p>
          <p className="hidden text-[11px] text-moss md:block">
            {t("Smart Agricultural Supply Chain Platform")}
          </p>
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-1.5 rounded-full border border-husk/15 bg-husk/6 px-4 py-1.5 text-[11px] text-husk backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-crop/50 hover:text-crop"
          >
            {t("Enter AgroFarm")}
            <ArrowRight size={12} />
          </button>
        </div>
      </nav>

      {/* Hero. */}
      <header className="relative flex min-h-[86vh] flex-col items-center justify-center px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-[11px] uppercase tracking-[0.42em] text-crop/80"
        >
          {t("Farm gate to shelf")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 40, scale: 0.94, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="text-cinematic mt-4 font-display text-[16vw] font-bold uppercase leading-[0.85] tracking-[-0.03em] text-husk sm:text-[13vw] lg:text-[11rem]"
        >
          AgroFarm
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-xl text-sm leading-relaxed text-husk/80 sm:text-base"
        >
          {t("Smart Agricultural Supply Chain Platform")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button onClick={scrollToForm} className="px-5 py-2.5 text-sm">
            {t("Enter AgroFarm")}
            <ArrowRight size={14} />
          </Button>
        </motion.div>

        <motion.button
          onClick={scrollToForm}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{
            opacity: { delay: 1 },
            y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute bottom-8 flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-moss"
          aria-label={t("Scroll to sign in")}
        >
          {t("Scroll")}
          <ChevronDown size={14} />
        </motion.button>
      </header>

      {/* Capability strip, same four lines as before, now as depth cards. */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {CAPABILITIES.map((line, index) => (
          <Reveal key={line} delay={index * 0.08}>
            <TiltCard intensity={8} className="h-full">
              <article className="glass edge-light h-full rounded-2xl p-5">
                <span className="font-mono text-[11px] text-crop">
                  0{index + 1}
                </span>
                <p className="mt-3 text-[12px] leading-relaxed text-husk/85">
                  {line}
                </p>
              </article>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      {/* Sign in. */}
      <section
        ref={formRef}
        className="mx-auto flex max-w-6xl scroll-mt-24 flex-col items-center gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-stretch"
      >
        <Reveal variant="depth" className="w-full lg:w-1/2">
          <div className="glass-strong edge-light flex h-full flex-col justify-between rounded-3xl p-8">
            <div>
              <p className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-husk">
                <Sprout size={24} className="text-crop" />
                Agro<span className="-ml-2 text-crop">Farm</span>
              </p>
              <p className="mt-2 text-sm text-moss">
                {t("Smart Agricultural Supply Chain Platform")}
              </p>
            </div>

            <ul className="my-8 space-y-3 text-[12px] leading-relaxed text-moss">
              {CAPABILITIES.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-crop" />
                  {line}
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-moss/70">
              {t("Hackathon prototype. Sign in with any name and pick a role.")}
            </p>
          </div>
        </Reveal>

        <Reveal variant="depth" delay={0.1} className="w-full lg:w-1/2">
          <TiltCard intensity={4} glare={false} className="h-full">
            <div className="glass-strong edge-light h-full rounded-3xl p-8">
              <p className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-husk lg:hidden">
                <Sprout size={20} className="text-crop" />
                Agro<span className="-ml-2 text-crop">Farm</span>
              </p>
              <h1 className="mt-4 font-display text-lg text-husk lg:mt-0">
                {t("Enter AgroFarm")}
              </h1>
              <p className="mt-1 text-xs text-moss">
                {t("Your role decides which dashboard opens.")}
              </p>

              <label className="mt-6 block text-[11px] text-moss">
                {t("Enter your name")}
                <span
                  className={`relative mt-1 flex items-center rounded-xl border bg-canopy/50 transition-all duration-200 ${
                    focused
                      ? "border-crop/60 shadow-glow"
                      : "border-husk/12 hover:border-husk/25"
                  }`}
                >
                  <User
                    size={14}
                    className={`ml-3 transition-colors ${
                      focused ? "text-crop" : "text-moss"
                    }`}
                  />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={(event) => event.key === "Enter" && submit()}
                    placeholder={t("Rahul")}
                    className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-husk outline-none placeholder:text-moss/50"
                  />
                </span>
              </label>

              <fieldset className="mt-5">
                <legend className="text-[11px] text-moss">
                  {t("Select your role")}
                </legend>
                <div className="mt-2 grid gap-2">
                  {ROLES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`group relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200 hover:translate-x-0.5 ${
                        role === option
                          ? "border-crop/45 bg-crop/10 shadow-[0_12px_30px_-18px_rgba(79,191,122,0.9)]"
                          : "border-husk/10 bg-husk/4 hover:border-husk/25"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          role === option ? "text-crop" : "text-husk"
                        }`}
                      >
                        {t(ROLE_LABEL[option])}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-moss">
                        {ROLE_HINT[option]}
                      </span>
                      {role === option && (
                        <motion.span
                          layoutId="role-active"
                          className="absolute inset-y-0 left-0 w-[3px] bg-crop"
                          transition={{ duration: 0.25 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-rot/40 bg-rot/10 px-3 py-2 text-[11px] text-rot backdrop-blur"
                >
                  {error}
                </motion.p>
              )}

              <Button
                onClick={submit}
                disabled={busy}
                className="mt-6 w-full py-2.5 text-sm"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {busy ? t("Opening") : t("Enter AgroFarm")}
              </Button>
            </div>
          </TiltCard>
        </Reveal>
      </section>

      <footer className="px-4 pb-10 text-center text-[11px] text-moss/60">
        AgroFarm — Smart Agricultural Supply Chain Platform
      </footer>
    </div>
  );
}
