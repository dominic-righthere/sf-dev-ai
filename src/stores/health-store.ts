import { create } from "zustand";
import type { HealthScanResult, Category } from "@/lib/health/types";

interface HealthState {
  scanResult: HealthScanResult | null;
  isScanning: boolean;
  error: string | null;
  selectedCategory: Category | null;
  fromCache: boolean;

  setScanResult: (result: HealthScanResult, fromCache: boolean) => void;
  setIsScanning: (scanning: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCategory: (category: Category | null) => void;
}

export const useHealthStore = create<HealthState>((set) => ({
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
