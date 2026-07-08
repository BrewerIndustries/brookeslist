import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { DEFAULT_CONFIG, type AppConfig } from '../lib/types';

interface SettingsState {
  config: AppConfig;
  refresh: () => Promise<void>;
  save: (patch: Partial<AppConfig>) => Promise<void>;
}

const SettingsCtx = createContext<SettingsState>(null as any);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    api.getSettings().then(setConfig).catch(() => setConfig(DEFAULT_CONFIG));
  }, []);

  const refresh = async () => setConfig(await api.getSettings());
  const save = async (patch: Partial<AppConfig>) => setConfig(await api.updateSettings(patch));

  return <SettingsCtx.Provider value={{ config, refresh, save }}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  return useContext(SettingsCtx);
}
