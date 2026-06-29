import { create } from 'zustand';
import type { ScriptPreference } from '../types/api';

interface ScriptState {
  script: ScriptPreference;
  setScript: (s: ScriptPreference) => void;
}

export const useScriptStore = create<ScriptState>((set) => ({
  script: 'uthmani',
  setScript: (script) => set({ script }),
}));

