import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { useFactoryData, type FactoryRow } from "@/contexts/FactoryDataContext";
import { generateGeminiContent } from "@/lib/gemini";

const STATIC_FACTORIES = [
  { name: "Al-Karam Textiles", grade: "A", riskFlag: "Low Risk — Within EU emission thresholds", remediation: ["Maintain current energy mix", "Continue quarterly carbon audits"], penalty: "$2,100" },
  { name: "Nishat Mills", grade: "B", riskFlag: "Moderate — Slight overshoot on Scope 2 emissions", remediation: ["Switch 20% energy to renewables by Q3", "Invest in solar panel installation"], penalty: "$5,800" },
  { name: "Gul Ahmed", grade: "C", riskFlag: "High — Significant water usage & waste output", remediation: ["Implement closed-loop water recycling", "Partner with certified waste recycler"], penalty: "$9,200" },
  { name: "Kohinoor Textile", grade: "D", riskFlag: "Critical — Exceeds EU CBAM benchmarks", remediation: ["Immediate shift to green energy", "Engage external ESG consultancy"], penalty: "$18,600" },
  { name: "Sapphire Fibres", grade: "A", riskFlag: "Low Risk — Within EU emission thresholds", remediation: ["Expand renewable energy coverage", "Document supply chain traceability"], penalty: "$1,400" },
] as const;

type StaticFactory = typeof STATIC_FACTORIES[number];

const gradeColors: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-emerald-400", text: "text-white" },
  B: { bg: "bg-amber-400", text: "text-white" },
  C: { bg: "bg-orange-400", text: "text-white" },
  D: { bg: "bg-coral", text: "text-white" },
};

function scoreToGrade(score: string): string {
  const n = parseInt(score, 10);
  if (isNaN(n)) return "C";
  if (n >= 85) return "A";
  if (n >= 70) return "B";
  if (n >= 50) return "C";
  return "D";
}

function rowToFactory(row: FactoryRow) {
  const grade = scoreToGrade(row.score);
  const riskFlags: Record<string, string> = {
    A: "Low Risk — Within EU emission thresholds",
    B: "Moderate — Slight overshoot on Scope 2 emissions",
    C: "High — Significant water usage & waste output",
    D: "Critical — Exceeds EU CBAM benchmarks",
  };
  const remediations: Record<string, string[]> = {
    A: ["Maintain current energy mix", "Continue quarterly carbon audits"],
    B: ["Switch 20% energy to renewables by Q3", "Invest in solar panel installation"],
    C: ["Implement closed-loop water recycling", "Partner with certified waste recycler"],
    D: ["Immediate shift to green energy", "Engage external ESG consultancy"],
  };
  const penalties: Record<string, string> = {
    A: "$1,500", B: "$5,000", C: "$9,500", D: "$19,000",
  };
  return {
    name: row.factory,
    grade,
    riskFlag: riskFlags[grade],
    remediation: remediations[grade],
    penalty: penalties[grade],
  };
}

export const Route = createFileRoute("/brand-buyer")({
  component: BrandBuyerPage,
});

function NoBannerData() {
  return (
    <div className="rounded-xl border border-mint bg-mint-soft/40 px-6 py-4 text-sm font-medium text-foreground">
      ⚠️ No data loaded yet — please upload a CSV in Factory Manager first
    </div>
  );
}

function BrandBuyerPage() {
  const { factoryData } = useFactoryData();

  const factories = factoryData
    ? factoryData.map(rowToFactory)
    : (STATIC_FACTORIES as unknown as ReturnType<typeof rowToFactory>[]);

  const hasCSV = factoryData !== null;

  const [selected, setSelected] = useState<ReturnType<typeof rowToFactory>>(factories[0]);
  const [open, setOpen] = useState(false);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync selected if factories list changes and current name is gone
  const selectedFactory =
    factories.find((f) => f.name === selected.name) ?? factories[0];

  const gradeStyle = gradeColors[selectedFactory.grade] ?? gradeColors.A;

  const regenerateCertificate = async () => {
    setLoading(true);
    setError(null);
    setResponseText(null);

    const factoryData = JSON.stringify(selectedFactory, null, 2);
    const prompt = `You are EcoThread AI generating a compliance summary for an international fashion brand.
Factory data: ${factoryData}
Generate:
- Sustainability grade (A/B/C/D)
- Biggest risk flag (one sentence)
- Remediation Plan (2 bullet points)
- Estimated EU CBAM penalty in USD
Under 120 words.`;

    try {
      const text = await generateGeminiContent(prompt);
      setResponseText(text.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-coral via-coral-soft to-mint px-8 py-10 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Brand Buyer Portal ✦</h1>
        <p className="mt-2 text-lg font-medium text-white/90">
          View live compliance certificates for your Pakistani suppliers
        </p>
      </div>

      {!hasCSV && <NoBannerData />}

      {/* Factory Selector */}
      <div className="w-full max-w-md">
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Select Supplier Factory
        </label>
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-mint bg-white px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-mint/80 focus:outline-none focus:ring-2 focus:ring-mint/40"
          >
            <span>{selectedFactory.name}</span>
            <ChevronDown className={`h-4 w-4 text-coral transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute z-10 mt-2 w-full rounded-xl border border-mint-soft bg-white py-1 shadow-lg">
              {factories.map((f) => (
                <button
                  key={f.name}
                  onClick={() => {
                    setSelected(f);
                    setOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-mint-soft ${
                    f.name === selectedFactory.name ? "bg-mint-soft font-semibold" : ""
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Certificate Card */}
      <div className="certificate-card relative rounded-2xl border-t-4 border-coral bg-white p-8 shadow-lg shadow-mint/10">
        <h2 className="text-xl font-bold text-foreground">{selectedFactory.name}</h2>

        <div className="my-8 flex justify-center">
          <div className={`flex h-28 w-28 items-center justify-center rounded-full ${gradeStyle.bg} shadow-xl`}>
            <span className={`text-5xl font-extrabold ${gradeStyle.text}`}>
              {selectedFactory.grade}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <span>Risk Flag ⚠️</span>
          </div>
          <p className="mt-1 text-sm text-amber-800">{selectedFactory.riskFlag}</p>
        </div>

        <div className="mt-5 rounded-xl bg-mint-soft/40 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-mint" />
            <span>Remediation Plan ✦</span>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/80">
            {selectedFactory.remediation.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-6 right-6 rounded-lg bg-coral/10 px-4 py-2 text-sm font-bold text-coral">
          Est. CBAM Penalty Risk: {selectedFactory.penalty}
        </div>
      </div>

      <button
        onClick={regenerateCertificate}
        disabled={loading}
        className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-coral px-6 py-3 text-sm font-bold text-white shadow-lg shadow-coral/25 transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Regenerating...
          </span>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            ✦ Regenerate Certificate
          </>
        )}
      </button>

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-mint-soft">
        <span className="inline-block rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-foreground">
          AI Summary
        </span>
        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <span className="h-4 w-4 rounded-full border-2 border-mint-soft/50 border-t-mint-soft animate-spin" />
            Generating AI certificate...
          </div>
        ) : error ? (
          <p className="mt-3 text-sm leading-relaxed text-rose-600">{error}</p>
        ) : responseText ? (
          <>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
              {responseText}
            </p>
            <p className="mt-4 text-xs italic text-coral">Powered by Gemini AI ✦</p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            Regenerate the certificate to generate a fresh AI compliance summary for the selected supplier.
          </p>
        )}
      </div>
    </div>
  );
}
