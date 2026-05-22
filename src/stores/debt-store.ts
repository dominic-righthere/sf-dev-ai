import { create } from "zustand";
import type { DebtScanResult, DebtCategory } from "@/lib/debt/types";

interface DebtState {
  scanResult: DebtScanResult | null;
  isScanning: boolean;
  error: string | null;
  selectedCategory: DebtCategory | null;
  fromCache: boolean;

  setScanResult: (result: DebtScanResult, fromCache: boolean) => void;
  setIsScanning: (scanning: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCategory: (category: DebtCategory | null) => void;
}

export const useDebtStore = create<DebtState>((set) => ({
  scanResult: null,
  isScanning: false,
  error: null,
  selectedCategory: null,
  fromCache: false,

  setScanResult: (result, fromCache) => set({ scanResult: result, fromCache, error: null }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setError: (error) => set({ error }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
