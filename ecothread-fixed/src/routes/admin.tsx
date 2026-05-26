import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { useFactoryData, type FactoryRow } from "@/contexts/FactoryDataContext";
import { generateGeminiContent } from "@/lib/gemini";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
});

type Status = "Compliant" | "At Risk" | "Non-Compliant";
type AnalyzeResult = "clean" | "suspicious" | "flagged";

type AnalysisDetails = {
  anomaly_detected: boolean;
  severity: "low" | "medium" | "high";
  finding: string;
  action: string;
};

interface Factory {
  name: string;
  city: string;
  co2: number;
  score: number;
  status: Status;
  forcedResult?: AnalyzeResult;
}

const STATIC_FACTORIES: Factory[] = [
  { name: "Al-Karam Textiles", city: "Karachi", co2: 12400, score: 92, status: "Compliant" },
  { name: "Nishat Mills", city: "Faisalabad", co2: 18900, score: 85, status: "Compliant" },
  { name: "Gul Ahmed", city: "Karachi", co2: 15600, score: 78, status: "At Risk" },
  { name: "Kohinoor Textile", city: "Lahore", co2: 9800, score: 54, status: "Non-Compliant", forcedResult: "flagged" },
  { name: "Sapphire Fibres", city: "Lahore", co2: 14200, score: 88, status: "Compliant" },
  { name: "Factory Y", city: "Multan", co2: 7600, score: 49, status: "Non-Compliant", forcedResult: "flagged" },
  { name: "Factory Z", city: "Sialkot", co2: 8200, score: 51, status: "Non-Compliant", forcedResult: "flagged" },
  { name: "Crescent Textiles", city: "Faisalabad", co2: 16100, score: 81, status: "Compliant" },
];

function rowToFactory(row: FactoryRow): Factory {
  const score = parseInt(row.score, 10) || 0;
  const co2 = parseInt(row.co2.replace(/,/g, ""), 10) || 0;
  const statusRaw = row.status?.toLowerCase() ?? "";
  const status: Status = statusRaw.includes("non")
    ? "Non-Compliant"
    : statusRaw.includes("risk")
    ? "At Risk"
    : "Compliant";
  const forcedResult: AnalyzeResult | undefined =
    status === "Non-Compliant" ? "flagged" : status === "At Risk" ? "suspicious" : undefined;
  return { name: row.factory, city: row.city, co2, score, status, forcedResult };
}

function statusBadge(status: Status) {
  const base = "px-3 py-1 rounded-full text-xs font-semibold";
  if (status === "Compliant") return <span className={`${base} bg-[#2dd4a0]/15 text-[#1a8a66]`}>{status}</span>;
  if (status === "At Risk") return <span className={`${base} bg-yellow-100 text-yellow-800`}>{status}</span>;
  return <span className={`${base} bg-[#ff6b6b]/15 text-[#c14545]`}>{status}</span>;
}

function resultBadge(result: AnalyzeResult) {
  const base = "ml-2 px-3 py-1 rounded-full text-xs font-semibold";
  if (result === "clean") return <span className={`${base} bg-green-100 text-green-700`}>✓ Clean</span>;
  if (result === "suspicious") return <span className={`${base} bg-orange-100 text-orange-700`}>⚠ Suspicious</span>;
  return <span className={`${base} bg-red-100 text-red-700`}>🚨 Flagged</span>;
}

function NoBannerData() {
  return (
    <div className="rounded-xl border border-[#2dd4a0] bg-[#2dd4a0]/10 px-6 py-4 text-sm font-medium text-[#1a1a2e]">
      ⚠️ No data loaded yet — please upload a CSV in Factory Manager first
    </div>
  );
}

function AdminPanel() {
  const { factoryData } = useFactoryData();
  const hasCSV = factoryData !== null;

  const factories: Factory[] = hasCSV
    ? factoryData.map(rowToFactory)
    : STATIC_FACTORIES;

  const [results, setResults] = useState<Record<string, AnalyzeResult>>({});
  const [analysisDetails, setAnalysisDetails] = useState<Record<string, AnalysisDetails>>({});
  const [panelFactory, setPanelFactory] = useState<string | null>(null);
  const [underReview, setUnderReview] = useState<Set<string>>(new Set());
  const [loadingFactory, setLoadingFactory] = useState<string | null>(null);
  const [errorFactory, setErrorFactory] = useState<Record<string, string>>({});

  async function analyze(f: Factory) {
    setLoadingFactory(f.name);
    setErrorFactory((prev) => ({ ...prev, [f.name]: "" }));

    const prompt = `You are an auditor for EcoThread AI.
Analyze this factory for greenwashing:
${JSON.stringify(f, null, 2)}
Return ONLY this JSON, nothing else:
{
  anomaly_detected: true/false,
  severity: low/medium/high,
  finding: one sentence,
  action: recommended action
}`;

    try {
      const text = await generateGeminiContent(prompt);
      const raw = text.trim();
      let parsed: any;

      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Unable to parse Gemini JSON response.");
        parsed = JSON.parse(match[0]);
      }

      const anomaly_detected = Boolean(parsed.anomaly_detected);
      const severity = String(parsed.severity ?? "medium").toLowerCase() as AnalysisDetails["severity"];
      const finding = String(parsed.finding ?? "No finding provided.");
      const action = String(parsed.action ?? "No action recommended.");

      const result: AnalyzeResult = anomaly_detected
        ? severity === "high"
          ? "flagged"
          : "suspicious"
        : "clean";

      setResults((r) => ({ ...r, [f.name]: result }));
      setAnalysisDetails((prev) => ({
        ...prev,
        [f.name]: { anomaly_detected, severity, finding, action },
      }));

      if (anomaly_detected) {
        setPanelFactory(f.name);
        setUnderReview((prev) => new Set(prev).add(f.name));
      }
    } catch (error) {
      setErrorFactory((prev) => ({
        ...prev,
        [f.name]: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setLoadingFactory(null);
    }
  }

  const totalFactories = factories.length;
  const totalCO2 = factories.reduce((sum, f) => sum + f.co2, 0).toLocaleString();
  const anomalies = factories.filter((f) => f.forcedResult === "flagged").length;

  return (
    <div className="space-y-6">
      {/* Top banner */}
      <div className="rounded-2xl p-8 shadow-sm" style={{ background: "#1a1a2e" }}>
        <h1 className="text-3xl font-bold" style={{ color: "#2dd4a0" }}>
          Admin Control Center ✦
        </h1>
        <p className="mt-2" style={{ color: "#ff6b6b" }}>
          Monitor all factories and detect greenwashing in real time
        </p>
      </div>

      {!hasCSV && <NoBannerData />}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="🏭 Total Factories" value={String(totalFactories)} accent="#2dd4a0" />
        <StatCard label="🌿 CO2 Tracked" value={`${totalCO2} kg`} accent="#ff6b6b" />
        <StatCard label="⚠️ Anomalies Flagged" value={String(anomalies)} accent="#eab308" />
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#2dd4a0]/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2dd4a0]/20">
          <h2 className="text-lg font-bold" style={{ color: "#1a1a2e" }}>
            ✦ Factory Audit Log {hasCSV && <span className="ml-2 text-xs font-normal text-[#2dd4a0]">(from uploaded CSV)</span>}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f0fdf8] text-[#1a1a2e]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Factory Name</th>
                <th className="text-left px-4 py-3 font-semibold">City</th>
                <th className="text-left px-4 py-3 font-semibold">CO2 (kg)</th>
                <th className="text-left px-4 py-3 font-semibold">Score</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {factories.map((f) => (
                <tr key={f.name} className="border-t border-gray-100 hover:bg-[#f0fdf8]/50">
                  <td className="px-4 py-3 font-medium text-[#1a1a2e]">{f.name}</td>
                  <td className="px-4 py-3 text-[#1a1a2e]/70">{f.city}</td>
                  <td className="px-4 py-3 text-[#1a1a2e]/70">{f.co2.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-[#1a1a2e]">{f.score}</td>
                  <td className="px-4 py-3">
                    {underReview.has(f.name)
                      ? <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">🚨 Under Review</span>
                      : statusBadge(f.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => analyze(f)}
                        disabled={loadingFactory === f.name}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ background: "#2dd4a0" }}
                      >
                        {loadingFactory === f.name ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-3 w-3 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                            Analyzing...
                          </span>
                        ) : (
                          "Analyze ✦"
                        )}
                      </button>
                      {results[f.name] && resultBadge(results[f.name])}
                    </div>
                    {errorFactory[f.name] ? (
                      <p className="mt-2 text-xs text-rose-600">{errorFactory[f.name]}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in panel */}
      {panelFactory && (
        <div
          className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 p-6 transition-transform"
          style={{ borderLeft: "6px solid #ff6b6b", animation: "slideIn 0.3s ease-out" }}
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold" style={{ color: "#ff6b6b" }}>
              🚨 Anomaly Report
            </h3>
            <button onClick={() => setPanelFactory(null)} className="text-[#1a1a2e]/60 hover:text-[#1a1a2e]">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs uppercase tracking-wide text-[#1a1a2e]/60 mb-2">Factory</p>
          <p className="font-semibold text-[#1a1a2e] mb-4">{panelFactory}</p>
          {analysisDetails[panelFactory] ? (
            <>
              <p className="text-xs uppercase tracking-wide text-[#1a1a2e]/60 mb-2">Severity</p>
              <p className="text-[#1a1a2e] mb-4 capitalize">{analysisDetails[panelFactory].severity}</p>
              <p className="text-xs uppercase tracking-wide text-[#1a1a2e]/60 mb-2">Finding</p>
              <p className="text-[#1a1a2e] leading-relaxed mb-4">
                {analysisDetails[panelFactory].finding}
              </p>
              <p className="text-xs uppercase tracking-wide text-[#1a1a2e]/60 mb-2">Recommended Action</p>
              <p className="text-[#1a1a2e] leading-relaxed mb-6">
                {analysisDetails[panelFactory].action}
              </p>
              <p className="text-xs italic text-coral mb-4">Powered by Gemini AI ✦</p>
            </>
          ) : (
            <p className="text-[#1a1a2e] leading-relaxed mb-6">
              Analysis details are not available for this factory yet.
            </p>
          )}
          <button
            onClick={() => {
              setUnderReview((prev) => new Set(prev).add(panelFactory));
              setPanelFactory(null);
            }}
            className="w-full py-2.5 rounded-lg font-semibold text-white hover:opacity-90 transition"
            style={{ background: "#2dd4a0" }}
          >
            Mark for Review ✦
          </button>
          <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-6 border-t-4"
      style={{ borderTopColor: accent }}
    >
      <p className="text-sm font-medium text-[#1a1a2e]/70">{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color: "#1a1a2e" }}>
        {value}
      </p>
    </div>
  );
}
