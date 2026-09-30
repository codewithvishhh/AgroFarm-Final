import { ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { CROP_PROBLEMS } from "../data/cropProblems";
import { useI18n } from "../i18n/LanguageProvider";

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

const ALL = "All crops";

/** Crop Problem Solver: pick a symptom, see likely causes and remedies. */
export function CropProblemSolver() {
  const { t } = useI18n();
  const [crop, setCrop] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const crops = [
    ALL,
    ...new Set(CROP_PROBLEMS.flatMap((problem) => problem.crops)),
  ];
  const visible = CROP_PROBLEMS.filter(
    (problem) =>
      crop === ALL || problem.crops.length === 0 || problem.crops.includes(crop),
  );
  const selected = CROP_PROBLEMS.find((problem) => problem.id === selectedId);

  return (
    <div className="space-y-6">
      <Panel
        title={t("What problem do you see?")}
        description={t("Pick the problem that looks closest to what is happening in your field")}
        action={
          <label className="px-5 text-[11px] text-moss">
            {t("My crop")}
            <select
              value={crop}
              onChange={(event) => setCrop(event.target.value)}
              className={`ml-2 ${fieldClass}`}
            >
              {crops.map((item) => (
                <option key={item} value={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((problem) => {
            const active = problem.id === selectedId;
            return (
              <button
                key={problem.id}
                type="button"
                onClick={() => setSelectedId(problem.id)}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs transition-colors ${
                  active
                    ? "border-crop/60 bg-crop/10 text-crop"
                    : "border-husk/10 bg-soil-800/40 text-husk hover:border-crop/40 hover:text-crop"
                }`}
              >
                <span aria-hidden className="text-lg">
                  {problem.icon}
                </span>
                {problem.title}
              </button>
            );
          })}
        </div>
      </Panel>

      {!selected ? (
        <Panel>
          <EmptyState
            title={t("Select a problem")}
            hint={t("Choose a problem above to see the likely cause and what to do.")}
          />
        </Panel>
      ) : (
        <>
          <Panel
            title={`${selected.icon} ${selected.title}`}
            description={t("Likely causes and what to do")}
          >
            <div className="space-y-4">
              {selected.issues.map((issue, index) => (
                <div
                  key={issue.name}
                  className="rounded-xl border border-husk/8 bg-soil-800/40 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-harvest" aria-hidden />
                    <div className="min-w-0 flex-1 text-xs text-husk">
                      <p className="font-display text-sm font-semibold">
                        {index === 0 && selected.issues.length > 1 && (
                          <span className="mr-2 rounded-full bg-harvest/15 px-2 py-0.5 text-[10px] font-medium text-harvest">
                            {t("Most likely")}
                          </span>
                        )}
                        {issue.name}
                      </p>
                      <p className="mt-2">
                        <span className="text-moss">{t("How to check")}: </span>
                        {issue.check}
                      </p>
                      <p className="mt-3 text-[11px] text-moss">{t("What to do")}</p>
                      <ol className="mt-1 list-decimal space-y-1 pl-4">
                        {issue.remedy.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t("Prevent it next time")}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-crop" aria-hidden />
              <ul className="list-disc space-y-1.5 pl-4 text-xs text-husk">
                {selected.prevention.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            {selected.urgent && (
              <p className="mt-4 rounded-xl border border-rot/30 bg-rot/10 px-4 py-3 text-xs text-rot">
                {selected.urgent}
              </p>
            )}
          </Panel>

          <p className="text-[11px] leading-relaxed text-moss">
            {t(
              "General guidance only. Always follow the dose on the product label, and confirm with your local Krishi Vigyan Kendra (KVK) or agriculture officer before spraying.",
            )}
          </p>
        </>
      )}
    </div>
  );
}
