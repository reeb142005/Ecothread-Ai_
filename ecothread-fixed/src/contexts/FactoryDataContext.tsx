import { createContext, useContext, useState, ReactNode } from "react";

export type FactoryRow = {
  factory: string;
  city: string;
  energy: string;
  water: string;
  co2: string;
  score: string;
  status: string;
};

type FactoryDataContextType = {
  factoryData: FactoryRow[] | null;
  setFactoryData: (rows: FactoryRow[]) => void;
};

const FactoryDataContext = createContext<FactoryDataContextType | null>(null);

export function FactoryDataProvider({ children }: { children: ReactNode }) {
  const [factoryData, setFactoryData] = useState<FactoryRow[] | null>(null);

  return (
    <FactoryDataContext.Provider value={{ factoryData, setFactoryData }}>
      {children}
    </FactoryDataContext.Provider>
  );
}

export function useFactoryData() {
  const ctx = useContext(FactoryDataContext);
  if (!ctx) throw new Error("useFactoryData must be used within FactoryDataProvider");
  return ctx;
}
