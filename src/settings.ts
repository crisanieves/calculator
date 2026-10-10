import { CalculatorSettings } from './types';

const STORAGE_KEY = 'eva_calculator_settings';

const defaultSettings: CalculatorSettings = {
  x: '',
  y: '',
  z: '',
  w: '',
  angleMode: 'RAD',
  language: 'Español',
  decimalPlaces: 10,
  mostrarInfo: true,
};

export function loadSettings(): CalculatorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...defaultSettings };

    return {
      x: typeof parsed.x === 'string' ? parsed.x.slice(0, 1000) : '',
      y: typeof parsed.y === 'string' ? parsed.y.slice(0, 1000) : '',
      z: typeof parsed.z === 'string' ? parsed.z.slice(0, 1000) : '',
      w: typeof parsed.w === 'string' ? parsed.w.slice(0, 1000) : '',
      angleMode: parsed.angleMode === 'DEG' ? 'DEG' : 'RAD',
      language: parsed.language === 'Inglés' ? 'Inglés' : 'Español',
      decimalPlaces:
        typeof parsed.decimalPlaces === 'number' &&
        Number.isInteger(parsed.decimalPlaces) &&
        parsed.decimalPlaces >= 1 &&
        parsed.decimalPlaces <= 15
          ? parsed.decimalPlaces
          : 10,
      mostrarInfo: typeof parsed.mostrarInfo === 'boolean' ? parsed.mostrarInfo : true,
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: CalculatorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}
