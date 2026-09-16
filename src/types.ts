export type Language = 'Español' | 'Inglés';
export type AngleMode = 'RAD' | 'DEG';

export interface CalculatorSettings {
  x: string;
  y: string;
  z: string;
  w: string;
  angleMode: AngleMode;
  language: Language;
  decimalPlaces: number;
  mostrarInfo: boolean;
}

export interface ToastNotice {
  id: string;
  message: string;
  type?: 'info' | 'error' | 'success';
}
