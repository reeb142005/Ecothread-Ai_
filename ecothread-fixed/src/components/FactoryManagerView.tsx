import { useRef, useState } from "react";
import { useFactoryData, type FactoryRow } from "@/contexts/FactoryDataContext";
import { generateGeminiContent } from "@/lib/gemini";

type Row = FactoryRow;

const SAMPLE: Row[] = [
  { factory: "Lahore Textile Co.", city: "Lahore", energy: "12,400", water: "85,000", co2: "3,210", score: "88", status: "Compliant" },
  { factory: "Karachi Weavers", city: "Karachi", energy: "18,900", water: "120,500", co2: "5,840", score: "62", status: "At Risk" },
  { factory: "Faisalabad Mills", city: "Faisalabad", energy: "24,300", water: "210,000", co2: "9,120", score: "41", status: "Non-Compliant" },
  { factory: "Sialkot Fabrics", city: "Sialkot", energy: "9,800", water: "62,300", co2: "2,450", score: "92", status: "Compliant" },
];

function parseCSV(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const c = line.split(",").map((s) => s.trim());
    return {
      factory: c[0] ?? "",
      city: c[1] ?? "",
      energy: c[2] ?? "",
      water: c[3] ?? "",
      co2: c[4] ?? "",
      score: c[5] ?? "",
      status: c[6] ?? "At Risk",
    };
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s.includes("non")
      ? "bg-coral-soft text-coral"
      : s.includes("risk")
      ? "bg-yellow-100 text-yellow-700"
      : "bg-mint-soft text-foreground";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export function FactoryManagerView() {
  const [rows, setRows] = useState<Row[]>(SAMPLE);
  const [dragOver, setDragOver] = useState(false);
  const [question, setQuestion] = useState("");
  const [responseText, setResponseText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setFactoryData } = useFactoryData();

  const selectedFactoryRow = rows[0];

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result ?? ""));
      if (parsed.length) {
        setRows(parsed);
        setFactoryData(parsed);
      }
    };
    reader.readAsText(file);
  };

  const askAgent = async () => {
    if (!selectedFactoryRow || !question.trim()) return;
    setLoading(true);
    setError(null);
    setResponseText(null);

    const factoryData = JSON.stringify(selectedFactoryRow, null, 2);
    const prompt = `You are EcoThread AI, a sustainability compliance expert for Pakistani textile factories.
Factory data: ${factoryData}
Manager asks: ${question}
Respond with:
1. Direct answer
2. EU CBAM compliance risk (Low/Medium/High)
3. One specific recommendation
Under 150 words.`;

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
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-8 shadow-lg shadow-mint/20"
        style={{ background: "linear-gradient(135deg, var(--mint), var(--coral))" }}
      >
        <h1 className="text-3xl font-bold text-white">Welcome, Factory Manager ✦</h1>
        <p className="mt-2 text-white/90">
          Upload your monthly data and get instant EU compliance insights
        </p>
      </div>

      {/* CSV upload */}
      <section>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`upload-pulse flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-coral bg-white p-10 text-center transition-colors ${
            dragOver ? "bg-coral-soft/40" : "hover:bg-coral-soft/20"
          }`}
        >
          <div className="text-4xl">🌿</div>
          <p className="mt-3 font-medium text-foreground">
            Drop your factory CSV here or click to browse
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Columns: Factory Name, City, Energy, Water, CO2, Score, Status
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        <a
          href="https://www.kaggle.com/datasets/areebanaveed312/ecothread-data"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-coral hover:underline"
        >
          📊 View Source Dataset on Kaggle ↗
        </a>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-mint-soft bg-card shadow-md shadow-mint/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-mint-soft text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Factory Name</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Energy (kWh)</th>
                <th className="px-4 py-3 font-semibold">Water (L)</th>
                <th className="px-4 py-3 font-semibold">CO2 (kg)</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-mint-soft/60">
                  <td className="px-4 py-3 font-medium">{r.factory}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.city}</td>
                  <td className="px-4 py-3">{r.energy}</td>
                  <td className="px-4 py-3">{r.water}</td>
                  <td className="px-4 py-3">{r.co2}</td>
                  <td className="px-4 py-3 font-semibold">{r.score}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI chat */}
      <section className="overflow-hidden rounded-2xl border border-mint-soft bg-card shadow-lg shadow-mint/10">
        <div
          className="px-6 py-4"
          style={{ background: "linear-gradient(135deg, var(--mint), var(--mint-soft))" }}
        >
          <h2 className="text-lg font-bold text-foreground">✦ Ask EcoThread Agent</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your compliance data..."
              className="flex-1 rounded-xl border border-mint-soft bg-white px-4 py-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/30"
            />
            <button
              onClick={askAgent}
              disabled={loading || !question.trim() || !selectedFactoryRow}
              className="inline-flex items-center justify-center rounded-xl bg-coral px-6 py-3 text-sm font-semibold text-white shadow-md shadow-coral/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Generating...
                </span>
              ) : (
                "Ask Agent ✦"
              )}
            </button>
          </div>

          <div className="rounded-2xl bg-white p-5 ring-1 ring-mint-soft">
            <span className="inline-block rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-foreground">
              AI Response
            </span>
            {loading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
                <span className="h-4 w-4 rounded-full border-2 border-mint-soft/50 border-t-mint-soft animate-spin" />
                Generating your answer...
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
                Ask a question to generate a compliance recommendation for your selected factory.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
