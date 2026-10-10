import { useState, useEffect, useRef, useCallback } from 'react';
import { loadSettings, saveSettings } from './settings';
import { CalculatorSettings, ToastNotice, AngleMode } from './types';
import {
  evaluateExpression,
  balanceParentheses,
  ComplexNumber,
  formatComplexResult,
  isIncompleteExpression,
  isMathErrorExpression,
  hasCycleOrSelfReference,
} from './mathEngine';
import { ActionSheet } from './components/ActionSheet';

const MAX_INPUT_CHARS = 5000;

// Constantes globales de símbolos y validación optimizadas fuera del ciclo de render
const NUMBERS = '0123456789';
const VARIABLES = 'xyzw';
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹½⅓¼⅛⅔⅜¾⅝⅞';

const isNumber = (char: string) => Boolean(char && NUMBERS.includes(char));
const isVariable = (char: string) => Boolean(char && (VARIABLES.includes(char) || 'XYZW'.includes(char)));
const isSuperscript = (char: string) => Boolean(char && SUPERSCRIPTS.includes(char));
const isTargetSuperscript = (char: string) => char === '²' || char === '³' || char === '⁴';

export const isImaginaryUnitChar = (char: string): boolean =>
  char === 'i' || char === 'I' || char === '\u{1D422}' || char === '\u{1D5F6}';

export const isImaginaryUnit = isImaginaryUnitChar;

export function getCharEndingAt(text: string, pos: number): { char: string; len: number } {
  if (pos <= 0 || pos > text.length) return { char: '', len: 0 };
  if (pos >= 2) {
    const code = text.charCodeAt(pos - 1);
    const prev = text.charCodeAt(pos - 2);
    if (code >= 0xdc00 && code <= 0xdfff && prev >= 0xd800 && prev <= 0xdbff) {
      return { char: text.slice(pos - 2, pos), len: 2 };
    }
  }
  return { char: text[pos - 1], len: 1 };
}

export const isLetterDifferentFromI = (char: string): boolean => {
  if (!char) return false;
  if (isImaginaryUnitChar(char)) return false;
  if (
    char === '×' ||
    char === '÷' ||
    char === '*' ||
    char === '/' ||
    char === '+' ||
    char === '-' ||
    char === '^' ||
    char === ':' ||
    char === '%' ||
    char === '(' ||
    char === ')'
  ) {
    return false;
  }
  return /^[a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u1E00-\u1EFF]$/u.test(char);
};

export function isImaginaryUnitAt(text: string, pos: number): boolean {
  if (pos <= 0 || pos > text.length) return false;
  const { char } = getCharEndingAt(text, pos);
  if (!isImaginaryUnitChar(char)) return false;

  // Retroceder por toda la secuencia continua de caracteres de unidad imaginaria (i, I, 𝐢, 𝗶)
  let p = pos;
  while (p > 0) {
    const { char: c, len: l } = getCharEndingAt(text, p);
    if (isImaginaryUnitChar(c)) {
      p -= l;
    } else {
      break;
    }
  }

  // Omitir espacios en blanco previos si los hubiera
  while (p > 0 && /\s/.test(text[p - 1])) {
    p--;
  }

  if (p <= 0) {
    return true; // e.g. "i", "ii", "iii" al inicio de la expresión
  }

  const { char: tokenBefore } = getCharEndingAt(text, p);
  // Si delante de i o varias i continuas (iiii) hay una letra diferente a i (como en 'si', 'siii', 'Noni', 'Noniiii', 'arcsi', 'Arseniii'), NO debe aplicar
  if (isLetterDifferentFromI(tokenBefore)) {
    return false;
  }

  return true;
}

export const BOLD_I = '\u{1D422}'; // 𝐢

const STORAGE_VARS = new Set(['x', 'y', 'z', 'w', 'X', 'Y', 'Z', 'W']);

const VARIABLE_POWER_CYCLE: Record<string, string> = {
  '¹': '²',
  '²': '³',
  '³': '⁴',
  '⁴': '⁵',
  '⁵': '⁶',
  '⁶': '⁷',
  '⁷': '⁸',
  '⁸': '⁹',
};

const VIRTUAL_X_POWER_CYCLE: Record<string, string> = {
  '¹': '²',
  '²': '³',
  '³': '⁴',
  '⁴': '⁵',
  '⁵': '⁶',
  '⁶': '⁷',
  '⁷': '⁸',
  '⁸': '⁹',
  '⁹': '¹⁰',
};

export const isOppositeCaseVariable = (varChar: string, key: string): boolean => {
  if (!STORAGE_VARS.has(varChar)) return false;
  if (varChar === varChar.toLowerCase()) {
    return key === varChar.toUpperCase();
  } else {
    return key === varChar.toLowerCase();
  }
};

export const tryAdvanceImaginaryPower = (
  textBefore: string,
  textAfter: string = ''
): { replacedText: string; newCursor: number; limitReached?: boolean } | null => {
  if (!textBefore) return null;

  const matchAfter = textAfter.match(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/);
  const supsAfter = matchAfter ? matchAfter[0] : '';

  // 1. Cursor is immediately after imaginary unit:
  const { char: unitChar, len: unitLen } = getCharEndingAt(textBefore, textBefore.length);
  if (isImaginaryUnitChar(unitChar)) {
    if (unitChar === BOLD_I || isImaginaryUnitAt(textBefore, textBefore.length)) {
      if (supsAfter.length >= 3) {
        return { replacedText: textBefore + textAfter, newCursor: textBefore.length, limitReached: true };
      }
      const base = textBefore.slice(0, -unitLen);
      const newTextBefore = base + BOLD_I + '²';
      return {
        replacedText: newTextBefore + textAfter,
        newCursor: newTextBefore.length,
      };
    }
  }

  // 2. Cursor is immediately after superscript(s) preceded by imaginary unit:
  const matchBefore = textBefore.match(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/);
  if (matchBefore) {
    const currentSup = matchBefore[1];
    const textBeforeSup = textBefore.slice(0, -currentSup.length);
    const { char: prevUnitChar, len: prevUnitLen } = getCharEndingAt(textBeforeSup, textBeforeSup.length);
    if (isImaginaryUnitChar(prevUnitChar)) {
      if (prevUnitChar === BOLD_I || isImaginaryUnitAt(textBeforeSup, textBeforeSup.length)) {
        const base = textBeforeSup.slice(0, -prevUnitLen);
        const totalDigits = currentSup.length + supsAfter.length;

        // If currentSup is exactly "¹⁰" and cursor is at end: cycle resets to imaginary unit itself
        if (currentSup === '¹⁰' && supsAfter.length === 0) {
          const newTextBefore = base + BOLD_I;
          return {
            replacedText: newTextBefore + textAfter,
            newCursor: newTextBefore.length,
          };
        }

        const lastSupChar = currentSup[currentSup.length - 1];

        // 2. Exponent > 10 ending in 0 (e.g. "𝐢²⁰" -> "𝐢²¹", "𝐢²²⁰" -> "𝐢²²¹") or cursor inside: 0 rises to 1
        if (lastSupChar === '⁰') {
          const newTextBefore = textBefore.slice(0, -1) + '¹';
          return {
            replacedText: newTextBefore + textAfter,
            newCursor: newTextBefore.length,
          };
        }

        // 3. '¹' through '⁸': cycle to next digit ('¹'->'²', '²'->'³', ..., '⁸'->'⁹')
        if (VARIABLE_POWER_CYCLE[lastSupChar]) {
          const nextSup = VARIABLE_POWER_CYCLE[lastSupChar];
          const newTextBefore = textBefore.slice(0, -1) + nextSup;
          return {
            replacedText: newTextBefore + textAfter,
            newCursor: newTextBefore.length,
          };
        }

        // '⁹':
        if (lastSupChar === '⁹') {
          if (supsAfter.length === 0 && currentSup === '⁹') {
            const newTextBefore = textBefore.slice(0, -1) + '¹⁰';
            return {
              replacedText: newTextBefore + textAfter,
              newCursor: newTextBefore.length,
            };
          }
          if (supsAfter.length > 0) {
            const isLeadingDigit = currentSup.length === 1;
            const newDigit = isLeadingDigit ? '¹' : '⁰';
            const newTextBefore = textBefore.slice(0, -1) + newDigit;
            return {
              replacedText: newTextBefore + textAfter,
              newCursor: newTextBefore.length,
            };
          }
          if (totalDigits <= 3) {
            const newTextBefore = textBefore.slice(0, -1) + '⁰';
            return {
              replacedText: newTextBefore + textAfter,
              newCursor: newTextBefore.length,
            };
          }
          return { replacedText: textBefore + textAfter, newCursor: textBefore.length, limitReached: true };
        }
      }
    }
  }

  return null;
};

export const tryAdvanceVariablePower = (
  textBefore: string,
  textAfter: string,
  key: string
): { replacedText: string; newCursor: number; limitReached?: boolean } | null => {
  if (!textBefore) return null;

  const matchAfter = textAfter.match(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/);
  const supsAfter = matchAfter ? matchAfter[0] : '';

  // 1. Cursor is immediately after variable v:
  const lastChar = textBefore[textBefore.length - 1];
  if (STORAGE_VARS.has(lastChar) && isOppositeCaseVariable(lastChar, key)) {
    if (supsAfter.length >= 3) {
      return { replacedText: textBefore + textAfter, newCursor: textBefore.length, limitReached: true };
    }
    const newTextBefore = textBefore + '²';
    return {
      replacedText: newTextBefore + textAfter,
      newCursor: newTextBefore.length,
    };
  }

  // 2. Cursor is immediately after superscript(s) preceded by variable v:
  const matchBefore = textBefore.match(/([xyzwXYZW])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/);
  if (matchBefore) {
    const v = matchBefore[1];
    const currentSup = matchBefore[2];
    if (isOppositeCaseVariable(v, key)) {
      const totalDigits = currentSup.length + supsAfter.length;

      // If currentSup is exactly "¹⁰" and cursor is at end: cycle resets to variable itself
      if (currentSup === '¹⁰' && supsAfter.length === 0) {
        const newTextBefore = textBefore.slice(0, -2);
        return {
          replacedText: newTextBefore + textAfter,
          newCursor: newTextBefore.length,
        };
      }

      const lastSupChar = currentSup[currentSup.length - 1];

      // 2. Exponent > 10 ending in 0 (e.g. "x²⁰" -> "x²¹", "x²²⁰" -> "x²²¹") or cursor inside: 0 rises to 1
      if (lastSupChar === '⁰') {
        const newTextBefore = textBefore.slice(0, -1) + '¹';
        return {
          replacedText: newTextBefore + textAfter,
          newCursor: newTextBefore.length,
        };
      }

      // 3. '¹' through '⁸': cycle to next digit ('¹'->'²', '²'->'³', ..., '⁸'->'⁹')
      if (VARIABLE_POWER_CYCLE[lastSupChar]) {
        const nextSup = VARIABLE_POWER_CYCLE[lastSupChar];
        const newTextBefore = textBefore.slice(0, -1) + nextSup;
        return {
          replacedText: newTextBefore + textAfter,
          newCursor: newTextBefore.length,
        };
      }

      // '⁹':
      if (lastSupChar === '⁹') {
        if (supsAfter.length === 0 && currentSup === '⁹') {
          const newTextBefore = textBefore.slice(0, -1) + '¹⁰';
          return {
            replacedText: newTextBefore + textAfter,
            newCursor: newTextBefore.length,
          };
        }
        if (supsAfter.length > 0) {
          const isLeadingDigit = currentSup.length === 1;
          const newDigit = isLeadingDigit ? '¹' : '⁰';
          const newTextBefore = textBefore.slice(0, -1) + newDigit;
          return {
            replacedText: newTextBefore + textAfter,
            newCursor: newTextBefore.length,
          };
        }
        if (totalDigits <= 3) {
          const newTextBefore = textBefore.slice(0, -1) + '⁰';
          return {
            replacedText: newTextBefore + textAfter,
            newCursor: newTextBefore.length,
          };
        }
        return { replacedText: textBefore + textAfter, newCursor: textBefore.length, limitReached: true };
      }
    }
  }

  return null;
};

export const isStorageVariableExponentDigit = (text: string, index: number): boolean => {
  if (index < 0 || index >= text.length) return false;
  const ch = text[index];
  if (!isSuperscript(ch) && !/[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(ch)) return false;

  let k = index - 1;
  while (k >= 0 && (isSuperscript(text[k]) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(text[k]))) {
    k--;
  }

  if (k < 0) return false;

  if (STORAGE_VARS.has(text[k])) {
    const digitPosition = index - k;
    return digitPosition <= 3;
  }

  const { char: unitChar } = getCharEndingAt(text, k + 1);
  if (isImaginaryUnitChar(unitChar)) {
    const digitPosition = index - (k + 1) + 1;
    return digitPosition <= 3;
  }

  return false;
};

export const getStorageOrImaginaryPowerMatch = (
  text: string
): { supsLen: number; newBefore: string } | null => {
  const matchPowerSuffix = text.match(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/);
  if (!matchPowerSuffix) return null;
  const supsLen = matchPowerSuffix[1].length;
  const beforeSups = text.slice(0, -supsLen);
  const { char: varChar } = getCharEndingAt(beforeSups, beforeSups.length);
  if (
    STORAGE_VARS.has(varChar) ||
    (isImaginaryUnitChar(varChar) && (varChar === BOLD_I || isImaginaryUnitAt(beforeSups, beforeSups.length)))
  ) {
    return { supsLen, newBefore: beforeSups };
  }
  return null;
};

// Expresión regular para detectar operadores potencialmente duplicados
const REGEX_OTHER_DUPLICATES = /(%{2,}|[,.]{2,}|\^{2,}|²{2,}|³{2,}|⁴{2,})/;

export const cleanOtherDuplicates = (
  rawVal: string,
  cursor: number
): { cleaned: string; newCursor: number; hasChanged: boolean } => {
  if (!REGEX_OTHER_DUPLICATES.test(rawVal)) {
    return { cleaned: rawVal, newCursor: cursor, hasChanged: false };
  }

  let cleaned = '';
  let i = 0;
  let newCursor = cursor;
  let hasChanged = false;

  while (i < rawVal.length) {
    const char = rawVal[i];
    cleaned += char;
    if (['%', ',', '.', '^', '²', '³', '⁴'].includes(char)) {
      let j = i + 1;
      while (
        j < rawVal.length &&
        ((char === '%' && rawVal[j] === '%') ||
          ((char === ',' || char === '.') && (rawVal[j] === ',' || rawVal[j] === '.')) ||
          (char === '^' && rawVal[j] === '^') ||
          (char === '²' && rawVal[j] === '²') ||
          (char === '³' && rawVal[j] === '³') ||
          (char === '⁴' && rawVal[j] === '⁴'))
      ) {
        // Excepción para variables de almacenamiento x, y, z, w: permitir superíndices seguidos (hasta 3 dígitos)
        if (('²³⁴'.includes(char) || isSuperscript(char)) && isStorageVariableExponentDigit(rawVal, j)) {
          break;
        }

        hasChanged = true;
        if (j <= cursor) {
          newCursor--;
        }
        j++;
      }
      i = j;
    } else {
      i++;
    }
  }

  return { cleaned, newCursor, hasChanged };
};

// Caracteres prohibidos después de una coma decimal (, o .) para teclados externos a la APP
// e, %, -, +, (, ), x, y, z, w, π, ^, $, ", ;, #, ¿, ?, ¡, !, ², ³, ⁴, ×, /, +, - (y , o .)
const FORBIDDEN_AFTER_COMMA_SET = new Set([
  ',', '.',
  'e', 'E',
  '%',
  '-', '+',
  '(', ')',
  'x', 'X', 'y', 'Y', 'z', 'Z', 'w', 'W',
  'π', '^', '$', '"', '°', "'", '|', ';', '#', '¿', '?', '¡', '!', '²', '³', '⁴',
  '×', '*', '/', '÷', 'i', 'I', '\u{1D422}', '\u{1D5F6}'
]);

const OTHER_DUPLICATE_KEYS_SET = new Set(['%', ',', '.', '^', '²', '³', '⁴']);

// Expresiones regulares compiladas una sola vez a nivel de módulo
const REGEX_COMMA_FORBIDDEN = /([,.])\s*([π^$";#¿?¡!²³⁴%()×*\/÷+\-,.'°|iI\u{1D422}\u{1D5F6}eExXyYzZwW])/u;
const REGEX_NEWLINES = /[\r\n]/g;
const REGEX_ACCENT_MARKS = /[¨´`~\u0300-\u036f]/g;
const BOUNDARY_REGEX = /[+\-×*\/÷:^%;!?,¿¡"'$#|°()√ª¹²³⁴⁰⁵⁶⁷⁸⁹a-zA-Z\u03c0\u{1D422}\u{1D5F6}εμ]/u;

const isNumberBoundary = (ch: string): boolean => BOUNDARY_REGEX.test(ch);

const hasDecimalInCurrentNumber = (text: string, start: number, end: number = start): boolean => {
  for (let i = start - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ',' || ch === '.') return true;
    if (isNumberBoundary(ch)) break;
  }
  for (let i = end; i < text.length; i++) {
    const ch = text[i];
    if (ch === ',' || ch === '.') return true;
    if (isNumberBoundary(ch)) break;
  }
  return false;
};

const cleanDuplicateDecimals = (text: string): string => {
  let result = '';
  let inNumberHasDecimal = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ',' || ch === '.') {
      if (inNumberHasDecimal) {
        continue;
      } else {
        inNumberHasDecimal = true;
        result += ch;
      }
    } else {
      if (isNumberBoundary(ch)) {
        inNumberHasDecimal = false;
      }
      result += ch;
    }
  }
  return result;
};

const isMathOperator = (char: string): boolean =>
  char === '+' || char === '-' || char === '×' || char === '*' || char === '/' || char === '÷';

const isMulOrDiv = (char: string): boolean =>
  char === '×' || char === '*' || char === '/' || char === '÷';

const isSameOperator = (a: string, b: string): boolean => {
  if (a === b) return true;
  if ((a === '*' || a === '×') && (b === '*' || b === '×')) return true;
  if ((a === '/' || a === '÷') && (b === '/' || b === '÷')) return true;
  return false;
};

const hasNumberOrCloseParenBefore = (text: string, pos: number): boolean => {
  if (pos <= 0) return false;
  const { char: prev, len } = getCharEndingAt(text, pos);
  if (/\d/.test(prev) || prev === ')' || isSuperscript(prev) || isVariable(prev)) return true;
  if (isImaginaryUnitAt(text, pos)) return true;

  if (isMathOperator(prev) && pos >= len + 1) {
    const beforePos = pos - len;
    const { char: beforePrev } = getCharEndingAt(text, beforePos);
    if (/\d/.test(beforePrev) || beforePrev === ')' || isSuperscript(beforePrev) || isVariable(beforePrev)) return true;
    if (isImaginaryUnitAt(text, beforePos)) return true;
  }
  return false;
};

const isOtherDuplicateKey = (
  key: string,
  charBefore: string,
  charAfter: string
): boolean => {
  if (key === '%') {
    return charBefore === '%' || charAfter === '%';
  }
  if (key === ',' || key === '.') {
    return (
      charBefore === ',' ||
      charBefore === '.' ||
      charAfter === ',' ||
      charAfter === '.'
    );
  }
  if (key === '^') {
    return charBefore === '^' || charAfter === '^';
  }
  if (key === '²') {
    return charBefore === '²' || charAfter === '²';
  }
  if (key === '³') {
    return charBefore === '³' || charAfter === '³';
  }
  if (key === '⁴') {
    return charBefore === '⁴' || charAfter === '⁴';
  }
  return false;
};

// Mapeo completo de funciones trigonométricas, hiperbólicas y logarítmicas con sus abreviaciones
const RAW_FUNCTION_PATTERNS: [string, string][] = [
  // Arc hiperbólicas
  ['arcsinh', 'arcsinh'],
  ['arccosh', 'arccosh'],
  ['arctanh', 'arctanh'],
  ['asinh', 'arcsinh'],
  ['acosh', 'arccosh'],
  ['atanh', 'arctanh'],
  ['arcsh', 'arcsinh'],
  ['arcch', 'arccosh'],
  ['arcth', 'arctanh'],
  ['ash', 'arcsinh'],
  ['ach', 'arccosh'],
  ['ath', 'arctanh'],

  // Arc trigonométricas
  ['arcsin', 'arcsin'],
  ['arccos', 'arccos'],
  ['arctan', 'arctan'],
  ['arcsen', 'arcsin'],
  ['arcco', 'arccos'],
  ['arcsn', 'arcsin'],
  ['arctn', 'arctan'],
  ['arcc', 'arccos'],
  ['arcs', 'arcsin'],
  ['arct', 'arctan'],
  ['asin', 'arcsin'],
  ['asen', 'arcsin'],
  ['acos', 'arccos'],
  ['atan', 'arctan'],
  ['aco', 'arccos'],
  ['asn', 'arcsin'],
  ['atn', 'arctan'],
  ['ac', 'arccos'],
  ['as', 'arcsin'],
  ['at', 'arctan'],

  // Hiperbólicas
  ['sinh', 'sinh'],
  ['cosh', 'cosh'],
  ['tanh', 'tanh'],
  ['sh', 'sinh'],
  ['ch', 'cosh'],
  ['th', 'tanh'],

  // Trigonométricas estándar
  ['sin', 'sin'],
  ['sen', 'sin'],
  ['cos', 'cos'],
  ['tan', 'tan'],
  ['sn', 'sin'],
  ['co', 'cos'],
  ['tn', 'tan'],
  ['s', 'sin'],
  ['c', 'cos'],
  ['t', 'tan'],

  // Logaritmo (LOG)
  ['log', 'log'],
  ['l', 'log'],

  // Logaritmo (LN)
  ['ln', 'ln'],
];

const FUNCTION_PATTERNS: [string, string][] = [...RAW_FUNCTION_PATTERNS].sort(
  (a, b) => b[0].length - a[0].length
);

function decomposeLettersToFunctions(str: string): string[] | null {
  if (str === '') return [];
  for (const [pattern, canonical] of FUNCTION_PATTERNS) {
    if (str.startsWith(pattern)) {
      const rest = decomposeLettersToFunctions(str.slice(pattern.length));
      if (rest !== null) {
        return [canonical, ...rest];
      }
    }
  }
  return null;
}

export function replaceKeyboardLettersWithFunctions(expr: string): string {
  return expr.replace(/([a-zA-Z]+)(\()?/g, (fullMatch, letters: string) => {
    const lower = letters.toLowerCase();
    const funcs = decomposeLettersToFunctions(lower);
    if (!funcs || funcs.length === 0) {
      return fullMatch;
    }
    return funcs.map((fn) => fn + '(').join('');
  });
}

export default function App() {
  const [settings, setSettings] = useState<CalculatorSettings>(loadSettings);
  const [mathEnter, setMathEnterState] = useState<string>('');
  const [mathResult, setMathResult] = useState<string>('');

  const setMathEnter = (valueOrUpdater: string | ((prev: string) => string)) => {
    setMathEnterState((prev) => {
      const nextVal = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      if (nextVal.length > MAX_INPUT_CHARS) {
        return nextVal.slice(0, MAX_INPUT_CHARS);
      }
      return nextVal;
    });
  };
  const [ram, setRam] = useState<string[]>([]);
  const [ramIndex, setRamIndex] = useState<number>(0);
  const [mColor, setMColor] = useState<'yellowgreen' | 'orange'>('yellowgreen');
  const [toast, setToast] = useState<ToastNotice | null>(null);

  // Modal / ActionSheet state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string | null;
    message?: string | null;
    cancelButton?: string | null;
    buttons: string[];
    alignLeft?: boolean;
    onSelect: (selected: string | null) => void;
  }>({
    isOpen: false,
    buttons: [],
    onSelect: () => {},
  });

  const lastTapRef = useRef<number>(0);
  const lastTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mathResultContainerRef = useRef<HTMLDivElement | null>(null);
  const mathResultLabelRef = useRef<HTMLDivElement | null>(null);
  const measureSpanRef = useRef<HTMLSpanElement | null>(null);
  const currentComplexResultRef = useRef<{ complex: ComplexNumber; expr: string } | null>(null);
  const [resultFontSize, setResultFontSize] = useState<string>('');
  const hasShownSyntaxErrorModalRef = useRef<boolean>(false);

  // Computes the maximum decimal precision (<= settings.decimalPlaces) and adaptive font size
  // so that both real and complex numbers fit completely within the responsive result container without clipping or overflow.
  const getFittedResult = useCallback(
    (
      complex: ComplexNumber,
      currentSettings: CalculatorSettings,
      targetContainer?: HTMLElement | null
    ): string => {
      const container = targetContainer || mathResultContainerRef.current;
      const measureSpan = measureSpanRef.current;
      const maxDec = currentSettings.decimalPlaces;

      // If container or measure element is not yet attached, return standard full format
      if (!container || !measureSpan) {
        setResultFontSize('');
        return formatComplexResult(complex, currentSettings, maxDec);
      }

      const style = window.getComputedStyle(container);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const availableWidth = container.clientWidth - paddingLeft - paddingRight;

      if (availableWidth <= 0) {
        setResultFontSize('');
        return formatComplexResult(complex, currentSettings, maxDec);
      }

      // Tier 1: Check if full precision or reduced decimals fit at default font size
      measureSpan.style.fontSize = '';
      const fullText = formatComplexResult(complex, currentSettings, maxDec);
      measureSpan.textContent = fullText;
      if (measureSpan.getBoundingClientRect().width <= availableWidth - 2) {
        setResultFontSize('');
        return fullText;
      }

      for (let dec = maxDec - 1; dec >= 0; dec--) {
        const candidate = formatComplexResult(complex, currentSettings, dec);
        measureSpan.textContent = candidate;
        if (measureSpan.getBoundingClientRect().width <= availableWidth - 2) {
          setResultFontSize('');
          return candidate;
        }
      }

      // Tier 2: If even 0 decimals does not fit at default font size (for large numbers like (2×⁴√(-1))^45 or x⁹⁹⁹),
      // adaptively scale font size down while maximizing readable decimals:
      const fontTiers = ['1.25rem', '1.125rem', '1rem', '0.875rem', '0.8rem', '0.75rem', '0.7rem', '0.65rem', '0.6rem', '0.55rem', '0.5rem'];
      for (const tier of fontTiers) {
        measureSpan.style.fontSize = tier;
        for (let dec = maxDec; dec >= 0; dec--) {
          const candidate = formatComplexResult(complex, currentSettings, dec);
          measureSpan.textContent = candidate;
          if (measureSpan.getBoundingClientRect().width <= availableWidth - 2) {
            setResultFontSize(tier);
            return candidate;
          }
        }
      }

      // Fallback: smallest font size with 0 decimal places
      const smallestTier = fontTiers[fontTiers.length - 1];
      setResultFontSize(smallestTier);
      return formatComplexResult(complex, currentSettings, 0);
    },
    []
  );

  // Dynamically re-evaluate responsive decimal precision on window resize or device orientation change
  useEffect(() => {
    let resizeRafId: number | null = null;
    const scheduleResize = () => {
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        if (currentComplexResultRef.current && mathResultContainerRef.current) {
          const { complex } = currentComplexResultRef.current;
          const fitted = getFittedResult(complex, settings);
          setMathResult((prev) => (prev !== fitted ? fitted : prev));
        }
        resizeRafId = null;
      });
    };

    window.addEventListener('resize', scheduleResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mathResultContainerRef.current) {
      observer = new ResizeObserver(() => {
        scheduleResize();
      });
      observer.observe(mathResultContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleResize);
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      if (observer) observer.disconnect();
    };
  }, [settings, getFittedResult]);

  // Clean up asynchronous timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (lastTapTimerRef.current) clearTimeout(lastTapTimerRef.current);
    };
  }, []);

  // Dynamic responsive lines for math input (minimum 2 lines, expands cleanly if device height allows)
  const [visibleLines, setVisibleLines] = useState<number>(2);
  const [enterHeight, setEnterHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.scrollTop = inputRef.current.scrollHeight;
    }
  }, [mathEnter]);

  // Constants
  const productSymbol = '×';
  const divisionSymbol = '÷';
  const piSymbol = 'π';
  const eulerSymbol = 'e';
  const expSymbol = 'ε';

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: Date.now().toString(), message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2400);
  }, []);

  const isSpanish = settings.language === 'Español';

  // Informative alert on start if enabled
  useEffect(() => {
    if (settings.mostrarInfo) {
      setModalConfig({
        isOpen: true,
        title: isSpanish ? 'Recuerda...' : 'Remind...',
        message: isSpanish
          ? '\nToca el logo de la app, en la esquina superior izquierda, para ver el menú de opciones. ¿Quieres seguir viendo este mensaje?'
          : '\nTouch the logo of the app, at the upper left corner, to see the options menu. Would you like to see this message again?',
        cancelButton: null,
        buttons: isSpanish ? ['Si', 'No'] : ['Yes', 'No'],
        alignLeft: true,
        onSelect: (choice) => {
          if (choice === 'No') {
            const next = { ...settings, mostrarInfo: false };
            setSettings(next);
            saveSettings(next);
          }
          setModalConfig((m) => ({ ...m, isOpen: false }));
        },
      });
    }
  }, []);

  // Orientation state to guarantee portrait display even when device auto-rotates horizontally
  const [orientationInfo, setOrientationInfo] = useState(() => {
    if (typeof window === 'undefined') {
      return { isLandscape: false, angle: 0, width: 400, height: 800 };
    }
    return {
      isLandscape: false,
      angle: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window === 'undefined') return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      let angle = 0;
      let isLandscape = false;

      if (window.screen?.orientation) {
        angle = window.screen.orientation.angle || 0;
        isLandscape = window.screen.orientation.type?.includes('landscape') || angle === 90 || angle === 270;
      } else if (typeof (window as any).orientation === 'number') {
        angle = (window as any).orientation;
        isLandscape = angle === 90 || angle === -90 || angle === 270;
      }

      const isTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;

      // On mobile / touch devices, if width exceeds height, it is physically held in landscape
      if (isTouch && w > h) {
        isLandscape = true;
        if (angle === 0) {
          angle = 90;
        }
      }

      // Do not rotate on standard desktop PCs / laptops with mice and widescreen monitors
      const isDesktop =
        !isTouch &&
        window.matchMedia('(pointer: fine)').matches &&
        !window.matchMedia('(pointer: coarse)').matches &&
        (angle === 0 || angle === undefined);

      if (isDesktop) {
        isLandscape = false;
        angle = 0;
      }

      setOrientationInfo({
        isLandscape,
        angle,
        width: w,
        height: h,
      });

      // Also request system orientation lock if supported by the browser
      try {
        if (
          window.screen?.orientation &&
          typeof (window.screen.orientation as any).lock === 'function'
        ) {
          const lockResult = (window.screen.orientation as any).lock('portrait-primary');
          if (lockResult && typeof lockResult.catch === 'function') {
            lockResult.catch(() => {
              try {
                const fallbackLock = (window.screen.orientation as any).lock('portrait');
                if (fallbackLock && typeof fallbackLock.catch === 'function') {
                  fallbackLock.catch(() => {});
                }
              } catch {
                // Handled silently
              }
            });
          }
        }
      } catch {
        // Handled silently
      }
    };

    updateOrientation();

    window.addEventListener('orientationchange', updateOrientation);
    window.screen?.orientation?.addEventListener?.('change', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.screen?.orientation?.removeEventListener?.('change', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  // Measure available vertical space to dynamically allow more visible lines in the input without deforming the calculator
  const measureInputLines = useCallback(() => {
    if (typeof window === 'undefined' || !containerRef.current || !inputRef.current) return;

    const container = containerRef.current;
    const textarea = inputRef.current;

    // Viewport height (if rotated physically to landscape, use orientationInfo.width as the vertical height)
    const vh = orientationInfo.isLandscape ? orientationInfo.width : window.innerHeight;

    // Calculate the height of all other elements inside the calculator container
    let othersHeight = 0;
    for (const child of Array.from(container.children)) {
      if ((child as HTMLElement).id !== 'math-enter-container') {
        othersHeight += (child as HTMLElement).offsetHeight;
      }
    }

    const containerStyle = window.getComputedStyle(container);
    const padTop = parseFloat(containerStyle.paddingTop) || 12;
    const padBottom = parseFloat(containerStyle.paddingBottom) || 12;
    const rowGap = parseFloat(containerStyle.rowGap || containerStyle.gap) || 6;
    const totalGaps = rowGap * (container.children.length - 1);
    const safetyBuffer = 32; // Safety margin for viewport padding and device status/home bars

    const totalFixed = othersHeight + padTop + padBottom + totalGaps + safetyBuffer;
    const availableHeight = vh - totalFixed;

    // Compute actual rendered line height of the textarea based on current text size settings
    const textareaStyle = window.getComputedStyle(textarea);
    let lh = parseFloat(textareaStyle.lineHeight);
    if (isNaN(lh) || lh <= 0) {
      const fs = parseFloat(textareaStyle.fontSize) || 24;
      lh = fs * 1.35;
    }

    const padY = (parseFloat(textareaStyle.paddingTop) || 4) + (parseFloat(textareaStyle.paddingBottom) || 4) + 8;

    // Maximum full lines that fit comfortably
    const possibleLines = Math.floor((availableHeight - padY) / lh);

    // Strictly enforce minimum 2 lines ("El mínimo de líneas/filas horizontales visibles es dos (2)... Nunca menos de dos")
    // Cap at 6 to preserve pristine visual hierarchy
    const targetLines = Math.min(6, Math.max(2, possibleLines));

    setVisibleLines(targetLines);
    setEnterHeight(Math.round(targetLines * lh + padY));
  }, [orientationInfo.isLandscape, orientationInfo.width]);

  useEffect(() => {
    measureInputLines();

    let rafId: number | null = null;
    const scheduleMeasure = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        measureInputLines();
        rafId = null;
      });
    };

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        scheduleMeasure();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [measureInputLines]);

  const getLastDigit = (text: string = mathEnter): string => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    const { char } = getCharEndingAt(trimmed, trimmed.length);
    return char;
  };

  const countParens = (str: string) => {
    let open = 0;
    let close = 0;
    for (const char of str) {
      if (char === '(') open++;
      else if (char === ')') close++;
    }
    return { open, close };
  };

  const needNumberToast = () =>
    showToast(isSpanish ? 'Primero ingresa un número.' : 'Enter at least a number first.');

  const alreadyExistsToast = () =>
    showToast(isSpanish ? 'Este símbolo ya existe.' : 'It already exists.');

  const resultIsNegativeToast = () =>
    showToast(isSpanish ? 'El resultado es negativo.' : 'Result is negative.');

  const powerLimitReachedToast = () =>
    showToast(isSpanish ? 'Ha alcanzado el límite máximo.' : 'Power reached the maximum limit.');

  const isValidPredecessor = (last: string, allowPercent = true) =>
    isNumber(last) ||
    isVariable(last) ||
    isImaginaryUnitChar(last) ||
    last === ')' ||
    (allowPercent && last === '%') ||
    last === piSymbol ||
    last === eulerSymbol ||
    isSuperscript(last);

  const isValidPredecessorIn = (text: string, pos?: number, allowPercent = true): boolean => {
    const targetPos = pos !== undefined ? pos : text.length;
    if (targetPos <= 0) return false;
    const { char: last } = getCharEndingAt(text, targetPos);
    if (!last) return false;
    if (isImaginaryUnitChar(last)) {
      return isImaginaryUnitAt(text, targetPos);
    }
    return isValidPredecessor(last, allowPercent);
  };

  const productAfterCharacter = (current: string): string => {
    if (!current || !current.trim()) return current;
    const trimmed = current.trim();
    const last = getLastDigit(trimmed);
    if (!last) return current;
    if (
      last === ')' ||
      last === '%' ||
      last === piSymbol ||
      last === eulerSymbol ||
      isSuperscript(last) ||
      isImaginaryUnitAt(trimmed, trimmed.length) ||
      (isVariable(last) && !current.includes('Inf'))
    ) {
      return current + productSymbol;
    }
    return current;
  };

  const addNumber = (digit: string) => {
    setMathEnter((prev) => {
      let cur = prev.trim();
      if (!cur) return digit;
      cur = productAfterCharacter(cur);

      const tokens = cur.split(/[×+\-÷\/√^();]/);
      if (tokens[tokens.length - 1] === '0') {
        cur += ',';
      }
      return cur + digit;
    });
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let rawVal = e.target.value
      .replace(REGEX_NEWLINES, '')
      .replace(REGEX_ACCENT_MARKS, '');

    // 1. Si se presiona "*", en los teclados externos a la APP, debe cambiarse al simbolo "×"
    if (rawVal.includes('*')) {
      rawVal = rawVal.replace(/\*/g, productSymbol);
    }

    let cursor = e.target.selectionStart ?? rawVal.length;

    // Control de exponente/potencia solo para la unidad imaginaria con 'I':
    if (cursor >= 1 && rawVal[cursor - 1] === 'I') {
      const textBeforeI = rawVal.slice(0, cursor - 1);
      const textAfterI = rawVal.slice(cursor);
      const advanced = tryAdvanceImaginaryPower(textBeforeI, textAfterI);
      if (advanced) {
        if (advanced.limitReached) {
          powerLimitReachedToast();
          rawVal = textBeforeI + textAfterI;
          cursor = textBeforeI.length;
        } else {
          setMathEnter(advanced.replacedText);
          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(advanced.newCursor, advanced.newCursor);
            }
          });
          return;
        }
      }
    }

    // Control de exponente/potencia para variables de almacenamiento (x, y, z, w, X, Y, Z, W):
    if (cursor >= 1) {
      const insertedChar = rawVal[cursor - 1];
      if (STORAGE_VARS.has(insertedChar)) {
        const textBeforeVar = rawVal.slice(0, cursor - 1);
        const textAfterVar = rawVal.slice(cursor);
        const varAdv = tryAdvanceVariablePower(textBeforeVar, textAfterVar, insertedChar);
        if (varAdv) {
          if (varAdv.limitReached) {
            powerLimitReachedToast();
            rawVal = textBeforeVar + textAfterVar;
            cursor = textBeforeVar.length;
          } else {
            setMathEnter(varAdv.replacedText);
            requestAnimationFrame(() => {
              if (inputRef.current) {
                inputRef.current.setSelectionRange(varAdv.newCursor, varAdv.newCursor);
              }
            });
            return;
          }
        }
      }
    }

    // Control de límite máximo de 3 superíndices por exponente para variables de almacenamiento (x, y, z, w, X, Y, Z, W) y unidad imaginaria (i, 𝐢)
    if (cursor >= 1) {
      const insertedChar = rawVal[cursor - 1];
      if (isSuperscript(insertedChar) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(insertedChar)) {
        let k = cursor - 2;
        while (k >= 0 && (isSuperscript(rawVal[k]) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(rawVal[k]))) {
          k--;
        }
        const { char: varChar } = k >= 0 ? getCharEndingAt(rawVal, k + 1) : { char: '' };
        if (k >= 0 && (STORAGE_VARS.has(rawVal[k]) || isImaginaryUnitChar(varChar))) {
          let end = cursor - 1;
          while (end < rawVal.length && (isSuperscript(rawVal[end]) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(rawVal[end]))) {
            end++;
          }
          const totalSuperscripts = end - (k + 1);
          if (totalSuperscripts > 3) {
            powerLimitReachedToast();
            rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
            cursor = cursor - 1;
          }
        }
      }
    }

    // Prevención adicional de exponentes extensos en superíndices para variables de almacenamiento y unidad imaginaria (ej. pegado o ingreso masivo)
    if (/([xyzwXYZW])([⁰¹²³⁴⁵⁶⁷⁸⁹]{4,})/.test(rawVal) || /([𝐢iI\u{1D5F6}])([⁰¹²³⁴⁵⁶⁷⁸⁹]{4,})/u.test(rawVal)) {
      powerLimitReachedToast();
      rawVal = rawVal
        .replace(/([xyzwXYZW])([⁰¹²³⁴⁵⁶⁷⁸⁹]{3})[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '$1$2')
        .replace(/([𝐢iI\u{1D5F6}])([⁰¹²³⁴⁵⁶⁷⁸⁹]{3})[⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu, '$1$2');
      cursor = Math.min(cursor, rawVal.length);
    }

    // Control para evitar más de una coma decimal (, o .) en el mismo número desde teclados externos:
    if (cursor >= 1) {
      const insertedChar = rawVal[cursor - 1];
      if (insertedChar === ',' || insertedChar === '.') {
        const textWithoutInserted = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
        if (hasDecimalInCurrentNumber(textWithoutInserted, cursor - 1, cursor - 1)) {
          alreadyExistsToast();
          rawVal = textWithoutInserted;
          cursor = cursor - 1;
        } else if (insertedChar === ',') {
          // Control independiente para teclado externo y teclado virtual de dispositivo móvil:
          // Si no hay un número delante de la coma (,), ingresar automáticamente un cero ("0,")
          const textBeforeComma = rawVal.slice(0, cursor - 1);
          const { char: charBeforeComma } = getCharEndingAt(textBeforeComma, textBeforeComma.length);
          if (!isNumber(charBeforeComma)) {
            rawVal = textBeforeComma + '0,' + rawVal.slice(cursor);
            cursor = cursor + 1;
          }
        }
      }
    }

    // 2. Control después de una coma decimal (, o .) para evitar caracteres prohibidos:
    // e, %, -, +, (, ), x, y, z, w, etc., sin importar si hay espacios o no inmediatamente después
    if (cursor >= 1) {
      const insertedChar = rawVal[cursor - 1];
      const textBeforeInserted = rawVal.slice(0, cursor - 1);
      const textBeforeTrimmed = textBeforeInserted.trimEnd();
      const lastCharBefore = textBeforeTrimmed.length > 0 ? textBeforeTrimmed[textBeforeTrimmed.length - 1] : '';

      if ((lastCharBefore === ',' || lastCharBefore === '.') && FORBIDDEN_AFTER_COMMA_SET.has(insertedChar)) {
        if (insertedChar === ',' || insertedChar === '.') {
          alreadyExistsToast();
        } else {
          needNumberToast();
        }
        rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
        cursor = cursor - 1;
      }
    }

    // 1. Validación para división (/) y producto (×), y bloqueo tras 'i' inválida:
    if (cursor >= 1) {
      const insertedChar = rawVal[cursor - 1];
      const textBeforeOp = rawVal.slice(0, cursor - 1);
      const { char: charBeforeOp } = getCharEndingAt(textBeforeOp, textBeforeOp.length);

      // Si delante de i hay una letra diferente a i (como en 'si', 'arcsi', 'Arseni'),
      // NO se permite ingresar inmediatamente después operadores matemáticos (+, -, *, /, ×, ÷), ^ o superíndices (², ³, ⁴):
      if (
        isImaginaryUnitChar(charBeforeOp) &&
        !isImaginaryUnitAt(textBeforeOp, textBeforeOp.length) &&
        (isMathOperator(insertedChar) || insertedChar === '^' || isTargetSuperscript(insertedChar))
      ) {
        needNumberToast();
        rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
        cursor = cursor - 1;
      } else if (insertedChar === '/' || insertedChar === '÷' || insertedChar === '×') {
        const isValidBefore =
          /\d/.test(charBeforeOp) ||
          charBeforeOp === ')' ||
          isSuperscript(charBeforeOp) ||
          isVariable(charBeforeOp) ||
          isImaginaryUnitAt(textBeforeOp, textBeforeOp.length);
        if (!isValidBefore) {
          needNumberToast();
          rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
          cursor = cursor - 1;
        }
      }
    }

    // Control independiente para superíndices (² ³ ⁴) y exponentes:
    // Intercambio automático entre superíndices diferentes, con '^' y prevención de replicación
    if (cursor >= 2) {
      const prevChar = rawVal[cursor - 2];
      const insertedChar = rawVal[cursor - 1];
      if (
        (isTargetSuperscript(prevChar) || prevChar === '^' || isSuperscript(prevChar)) &&
        (isTargetSuperscript(insertedChar) || insertedChar === '^' || isSuperscript(insertedChar) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(insertedChar))
      ) {
        if (insertedChar === '^') {
          const textBeforeInserted = rawVal.slice(0, cursor - 1);
          const matchVarOrImag = getStorageOrImaginaryPowerMatch(textBeforeInserted);
          if (matchVarOrImag) {
            const matchAfter = rawVal.slice(cursor).match(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/);
            const afterLen = matchAfter ? matchAfter[0].length : 0;
            const supsLen = matchVarOrImag.supsLen;
            const newBefore = textBeforeInserted.slice(0, -supsLen);
            rawVal = newBefore + '^' + rawVal.slice(cursor + afterLen);
            cursor = newBefore.length + 1;
          } else if (!isStorageVariableExponentDigit(rawVal, cursor - 1)) {
            if (prevChar === insertedChar) {
              alreadyExistsToast();
              rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
              cursor = cursor - 1;
            } else {
              // Intercambiar el superíndice o '^' anterior por el nuevo
              rawVal = rawVal.slice(0, cursor - 2) + insertedChar + rawVal.slice(cursor);
              cursor = cursor - 1;
            }
          }
        } else if (!isStorageVariableExponentDigit(rawVal, cursor - 1)) {
          if (prevChar === insertedChar) {
            alreadyExistsToast();
            rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
            cursor = cursor - 1;
          } else {
            // Intercambiar el superíndice o '^' anterior por el nuevo
            rawVal = rawVal.slice(0, cursor - 2) + insertedChar + rawVal.slice(cursor);
            cursor = cursor - 1;
          }
        }
      }
    }

    if (cursor >= 1 && cursor < rawVal.length) {
      const insertedChar = rawVal[cursor - 1];
      const nextChar = rawVal[cursor];
      if (
        (isTargetSuperscript(insertedChar) || insertedChar === '^' || isSuperscript(insertedChar) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(insertedChar)) &&
        (isTargetSuperscript(nextChar) || nextChar === '^' || isSuperscript(nextChar))
      ) {
        if (!isStorageVariableExponentDigit(rawVal, cursor - 1) && !isStorageVariableExponentDigit(rawVal, cursor)) {
          if (insertedChar === nextChar) {
            alreadyExistsToast();
            rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
            cursor = cursor - 1;
          } else {
            rawVal = rawVal.slice(0, cursor) + rawVal.slice(cursor + 1);
          }
        }
      }
    }

    // Bloqueo de exponentes (superíndices numéricos y ^) inmediatamente después de un operador matemático (×, ÷, /, +, -, *) o sin número previo:
    if (cursor >= 1) {
      const insertedChar = rawVal[cursor - 1];
      if (isTargetSuperscript(insertedChar) || isSuperscript(insertedChar) || insertedChar === '^' || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(insertedChar)) {
        const textBeforeInserted = rawVal.slice(0, cursor - 1);
        const { char: charBefore } = getCharEndingAt(textBeforeInserted, textBeforeInserted.length);
        if (isMathOperator(charBefore) || !isValidPredecessorIn(textBeforeInserted, textBeforeInserted.length, false)) {
          needNumberToast();
          rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
          cursor = cursor - 1;
        }
      }
    }

    // Control independiente para teclado externo y teclado virtual de dispositivo móvil:
    // Intercambio automático de operadores matemáticos adyacentes (×, /, +, -)
    if (cursor >= 2) {
      const prevChar = rawVal[cursor - 2];
      const insertedChar = rawVal[cursor - 1];

      if (isMathOperator(prevChar) && isMathOperator(insertedChar)) {
        const textBeforePrev = rawVal.slice(0, cursor - 2);
        const { char: beforePrev } = getCharEndingAt(textBeforePrev, textBeforePrev.length);

        // 1. La aplicación debe permitir ingresar, con el botón - del teclado propio del ordenador o del teclado virtual propio del sistema móvil,
        // el signo negativo (-) inmediatamente después del símbolo de multiplicación (×) o división (÷, /)
        if (isMulOrDiv(prevChar) && insertedChar === '-') {
          // Se permite el signo '-' tras multiplicación o división sin reemplazar el operador anterior
        }
        // 2. Y en el caso que delante del signo negativo - este × o / o ÷ de la forma (×-) o (/-) o (÷-)
        // y el usuario presiona el mismo botón -, la app solo visualizará × o / o ÷ respectivamente suprimiendo el signo -
        else if (prevChar === '-' && insertedChar === '-') {
          if (
            !beforePrev ||
            beforePrev === '(' ||
            beforePrev === '^' ||
            isMulOrDiv(beforePrev)
          ) {
            // Suprimir el signo - dejando el operador anterior o la pantalla vacía si estaba vacía
            rawVal = rawVal.slice(0, cursor - 2) + rawVal.slice(cursor);
            cursor = cursor - 2;
          } else {
            // Si delante hay un número u otro carácter (ej. 5-- o 22𝐢--), cambia a +
            rawVal = rawVal.slice(0, cursor - 2) + '+' + rawVal.slice(cursor);
            cursor = cursor - 1;
          }
        }
        // En el caso que delante del signo negativo - este × o / o ÷ de la forma (×-) o (/-) o (÷-)
        // y el usuario presiona el +, la app continuará visualizando ×-, /-, ÷- y lanzará el Toast correspondiente
        else if (prevChar === '-' && isMulOrDiv(beforePrev) && insertedChar === '+') {
          rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
          cursor = cursor - 1;
          resultIsNegativeToast();
        }
        // Si delante hay + y se presiona -, cambia a -
        else if (prevChar === '+' && insertedChar === '-') {
          rawVal = rawVal.slice(0, cursor - 2) + '-' + rawVal.slice(cursor);
          cursor = cursor - 1;
        }
        // Mismo operador duplicado (++ o // o ××)
        else if (isSameOperator(prevChar, insertedChar)) {
          alreadyExistsToast();
          rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
          cursor = cursor - 1;
        }
        // Si hay un operador delante (×, /, +, -) y se presiona otro operador matemático diferente,
        // la app cambia automáticamente un operador por el otro (ej: + con / -> /, - con * -> ×, × con / -> /, × con + -> +)
        else {
          if (
            (insertedChar === '/' || insertedChar === '÷' || insertedChar === '×') &&
            !(
              /\d/.test(beforePrev) ||
              beforePrev === ')' ||
              isSuperscript(beforePrev) ||
              isVariable(beforePrev) ||
              isImaginaryUnitAt(textBeforePrev, textBeforePrev.length)
            )
          ) {
            needNumberToast();
            rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
            cursor = cursor - 1;
          } else {
            rawVal = rawVal.slice(0, cursor - 2) + insertedChar + rawVal.slice(cursor);
            cursor = cursor - 1;
          }
        }
      }
    }

    // Limpieza general de caracteres prohibidos tras comas si se pegó texto
    if (REGEX_COMMA_FORBIDDEN.test(rawVal)) {
      let cleaned = '';
      let i = 0;
      let newCursor = cursor;
      while (i < rawVal.length) {
        const char = rawVal[i];
        cleaned += char;
        if (char === ',' || char === '.') {
          let j = i + 1;
          while (j < rawVal.length && FORBIDDEN_AFTER_COMMA_SET.has(rawVal[j])) {
            if (j < cursor) {
              newCursor--;
            }
            j++;
          }
          i = j;
        } else {
          i++;
        }
      }
      rawVal = cleaned;
      cursor = Math.max(0, Math.min(newCursor, rawVal.length));
    }

    // Limpieza general de comas/puntos duplicados en el mismo número (ej: si se pegó texto como "1.0,5" o "1,2.5+24 , .")
    const cleanedDecimals = cleanDuplicateDecimals(rawVal);
    if (cleanedDecimals !== rawVal) {
      alreadyExistsToast();
      let diffBeforeCursor = 0;
      let inNum = false;
      for (let i = 0; i < cursor; i++) {
        const ch = rawVal[i];
        if (ch === ',' || ch === '.') {
          if (inNum) diffBeforeCursor++;
          else inNum = true;
        } else if (isNumberBoundary(ch)) {
          inNum = false;
        }
      }
      rawVal = cleanedDecimals;
      cursor = Math.max(0, cursor - diffBeforeCursor);
    }

    // Si se insertó un operador inmediatamente antes de otro operador existente
    if (cursor >= 1 && cursor < rawVal.length) {
      const insertedChar = rawVal[cursor - 1];
      const nextChar = rawVal[cursor];

      if (isMathOperator(insertedChar) && isMathOperator(nextChar)) {
        if (nextChar === '-' && insertedChar === '-') {
          const beforeInserted = cursor >= 2 ? rawVal[cursor - 2] : '';
          if (!beforeInserted || beforeInserted === '(' || beforeInserted === '^' || isMulOrDiv(beforeInserted)) {
            rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor + 1);
            cursor = cursor - 1;
          } else {
            rawVal = rawVal.slice(0, cursor - 1) + '+' + rawVal.slice(cursor + 1);
          }
        } else if (nextChar === '+' && insertedChar === '-') {
          rawVal = rawVal.slice(0, cursor - 1) + '-' + rawVal.slice(cursor + 1);
        } else if (insertedChar === '+' && nextChar === '-') {
          const beforeInserted = cursor >= 2 ? rawVal[cursor - 2] : '';
          if (isMulOrDiv(beforeInserted)) {
            rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
            cursor = cursor - 1;
            resultIsNegativeToast();
          } else {
            rawVal = rawVal.slice(0, cursor) + rawVal.slice(cursor + 1);
          }
        } else if (isMulOrDiv(insertedChar) && nextChar === '-') {
          // Permitir operador de producto/división antes de signo negativo
        } else if (isSameOperator(insertedChar, nextChar)) {
          alreadyExistsToast();
          rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
          cursor = cursor - 1;
        } else {
          rawVal = rawVal.slice(0, cursor) + rawVal.slice(cursor + 1);
        }
      }
    }

    // Si se insertó un superíndice inmediatamente antes de otro superíndice existente
    if (cursor >= 1 && cursor < rawVal.length) {
      const insertedChar = rawVal[cursor - 1];
      const nextChar = rawVal[cursor];
      if (isTargetSuperscript(insertedChar) && isTargetSuperscript(nextChar)) {
        if (!isStorageVariableExponentDigit(rawVal, cursor - 1) && !isStorageVariableExponentDigit(rawVal, cursor)) {
          if (insertedChar === nextChar) {
            alreadyExistsToast();
            rawVal = rawVal.slice(0, cursor - 1) + rawVal.slice(cursor);
            cursor = cursor - 1;
          } else {
            rawVal = rawVal.slice(0, cursor) + rawVal.slice(cursor + 1);
          }
        }
      }
    }

    // Control para evitar la replicación accidental de otros operadores: (%%) o (,,) o (..) o (^^) o (²²) o (³³) o (⁴⁴)
    const duplicateRes = cleanOtherDuplicates(rawVal, cursor);
    if (duplicateRes.hasChanged) {
      alreadyExistsToast();
      rawVal = duplicateRes.cleaned;
      cursor = Math.max(0, Math.min(duplicateRes.newCursor, rawVal.length));
    }

    setMathEnter(rawVal);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(cursor, cursor);
      }
    });
  };

  // Execution (= / EXE)
  const handleExecute = (overrideInput?: string) => {
    const rawExpr = overrideInput !== undefined ? overrideInput : mathEnter;
    if (!rawExpr.trim()) {
      needNumberToast();
      return;
    }

    // Suppress all whitespace (before, between, and after) from input data
    const cleanedExpr = rawExpr.replace(/\s+/g, '');
    const exprWithFunctions = replaceKeyboardLettersWithFunctions(cleanedExpr);
    const exprToRun = balanceParentheses(exprWithFunctions);
    setMathEnter(exprToRun);

    const { result, isSyntaxError: syntaxErr, isMathError, rawComplex, unassignedVars } = evaluateExpression(exprToRun, settings, (warning) => {
      if (warning === 'tan_undefined') {
        showToast(
          isSpanish
            ? 'El resultado no está definido o tiende a infinito para el valor ingresado.'
            : 'It is not defined or tends to infinity in a tangent function.'
        );
      } else if (warning === 'zero_divided_by_zero') {
        setModalConfig({
          isOpen: true,
          title: null,
          message: isSpanish
            ? 'La solución matemática, en la expresión cero entre cero, no tiene una respuesta correcta o no está determinada: el resultado de la expresión suele interpretarse como cero. También puede ser interpretado como un valor que tiende a infinito.'
            : 'The math solution, zero divided by zero, has no correct answer or is not defined: the result of the expression is usually interpreted as zero. It can also be interpreted as a value that tends toward infinity.',
          cancelButton: isSpanish ? 'Aceptar' : 'OK',
          buttons: [],
          alignLeft: true,
          onSelect: () => setModalConfig((m) => ({ ...m, isOpen: false })),
        });
      } else if (warning === 'division_by_zero') {
        setModalConfig({
          isOpen: true,
          title: null,
          message: isSpanish
            ? 'Es posible que el resultado tienda a infinito por una división entre cero o un número que tiende a cero.'
            : 'It is possible that the result tends toward infinity due to division by zero or a number tending to zero.',
          cancelButton: isSpanish ? 'Aceptar' : 'OK',
          buttons: [],
          alignLeft: true,
          onSelect: () => setModalConfig((m) => ({ ...m, isOpen: false })),
        });
      }
    });

    if (result === 'Math Error' || isMathError) {
      currentComplexResultRef.current = null;
      setResultFontSize('');
      setMathResult('Math Error');
      return;
    }

    if (syntaxErr || result === 'Sys Error') {
      currentComplexResultRef.current = null;
      setResultFontSize('');
      setMathResult('Sys Error');
      if (!hasShownSyntaxErrorModalRef.current) {
        hasShownSyntaxErrorModalRef.current = true;
        setModalConfig({
          isOpen: true,
          title: 'Error de sintaxis',
          message: '\nLa expresión es incorrecta.',
          cancelButton: isSpanish ? 'Aceptar' : 'OK',
          buttons: [],
          alignLeft: true,
          onSelect: () => setModalConfig((m) => ({ ...m, isOpen: false })),
        });
      } else if (unassignedVars && unassignedVars.length > 0) {
        const varsStr = unassignedVars.join(', ');
        showToast(
          isSpanish
            ? `La(s) variable(s) ${varsStr} no tiene(n) un valor asignado.`
            : `No value has been assigned to variable(s) ${varsStr}.`
        );
      }
      return;
    }

    let finalResult = result;
    if (rawComplex && Number.isFinite(rawComplex.re) && Number.isFinite(rawComplex.im)) {
      currentComplexResultRef.current = { complex: rawComplex, expr: exprToRun };
      finalResult = getFittedResult(rawComplex, settings);
    } else {
      currentComplexResultRef.current = null;
      setResultFontSize('');
    }

    if (mathResult === finalResult && finalResult !== 'NaN') {
      showToast(isSpanish ? 'El resultado es el mismo.' : 'Result is the same.');
    }

    setMathResult(finalResult);

    if (exprToRun.trim() && !ram.includes(exprToRun)) {
      const nextRam = [...ram, exprToRun].slice(-20);
      setRam(nextRam);
      setRamIndex(nextRam.length - 1);
    }
  };

  // Retornar (m) RAM history
  const handleRetornar = () => {
    if (ram.length === 0) return;
    setMColor((c) => (c === 'yellowgreen' ? 'orange' : 'yellowgreen'));
    setMathEnter(ram[ramIndex]);
    setRamIndex((prev) => (prev <= 0 ? ram.length - 1 : prev - 1));
  };

  // Rad / Deg toggle
  const handleToggleRadDeg = () => {
    const nextMode: AngleMode = settings.angleMode === 'RAD' ? 'DEG' : 'RAD';
    const updated: CalculatorSettings = { ...settings, angleMode: nextMode };
    setSettings(updated);
    saveSettings(updated);

    if (/[sct]|arc/.test(mathEnter)) {
      const { result, rawComplex } = evaluateExpression(mathEnter, updated);
      if (rawComplex && Number.isFinite(rawComplex.re) && Number.isFinite(rawComplex.im)) {
        currentComplexResultRef.current = { complex: rawComplex, expr: mathEnter };
        const fitted = getFittedResult(rawComplex, updated);
        setMathResult(fitted);
      } else {
        currentComplexResultRef.current = null;
        setResultFontSize('');
        setMathResult(result);
      }
    }
  };

  // DEL button
  const handleDel = () => {
    if (!mathEnter || mathEnter.length <= 1) {
      setMathEnter('');
      return;
    }
    const match = mathEnter.match(
      /(arcsinh\(|arccosh\(|arctanh\(|arcsin\(|arccos\(|arctan\(|sinh\(|cosh\(|tanh\(|sin\(|cos\(|tan\(|log\(|ln\(|ª√\(|√\(|[\uD800-\uDBFF][\uDC00-\uDFFF]|.)$/
    );
    setMathEnter(match ? mathEnter.slice(0, -match[0].length) : '');
  };

  // AC button
  const handleAC = () => {
    if (mathEnter) setMathEnter('');
    else {
      setMathResult('');
      setResultFontSize('');
      currentComplexResultRef.current = null;
    }
  };

  // Operators and symbols handlers
  const handleBinaryOp = (op: string) => {
    const trimmed = mathEnter.trimEnd();
    const last = getLastDigit(trimmed);
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }

    // En el caso que delante del signo negativo - este × o / o ÷ de la forma (×-) o (/-) o (÷-)
    // y el usuario presiona con el teclado virtual propio de la APP el +, la app continúa visualizando
    // ×-, /- o ÷- y lanza el Toast: "El resultado es negativo." / "Result is negative."
    if (op === '+' && last === '-') {
      const beforeMinus = trimmed.length > 1 ? trimmed.slice(0, -1).trimEnd() : '';
      const charBeforeMinus = getLastDigit(beforeMinus);
      if (isMulOrDiv(charBeforeMinus)) {
        resultIsNegativeToast();
        return;
      }
    }

    if (isValidPredecessorIn(trimmed) || (op === '+' && (last === expSymbol || last === '^'))) {
      setMathEnter((prev) => prev + op);
    } else if (
      last === '+' ||
      last === productSymbol ||
      last === divisionSymbol ||
      last === '/' ||
      (last === '-' && (
        isValidPredecessorIn(trimmed.slice(0, -last.length)) ||
        (op === '+' && (mathEnter.endsWith(expSymbol + '-') || mathEnter.endsWith('^-')))
      ))
    ) {
      if (last === op || (op === divisionSymbol && last === '/')) {
        alreadyExistsToast();
      } else {
        setMathEnter((prev) => {
          const t = prev.trimEnd();
          if (t.endsWith(last)) {
            return t.slice(0, -last.length) + op;
          }
          return prev.slice(0, -last.length) + op;
        });
      }
    } else {
      needNumberToast();
    }
  };

  const handleSubtract = () => {
    const trimmed = mathEnter.trimEnd();
    const last = getLastDigit(trimmed);
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    if (last === '-') {
      const lastIndex = mathEnter.lastIndexOf('-');
      const beforeMinus = lastIndex !== -1 ? mathEnter.slice(0, lastIndex) : '';
      const trimmedBefore = beforeMinus.trimEnd();
      if (
        !trimmedBefore ||
        trimmedBefore.endsWith('(') ||
        trimmedBefore.endsWith('^') ||
        trimmedBefore.endsWith(expSymbol) ||
        trimmedBefore.endsWith(productSymbol) ||
        trimmedBefore.endsWith(divisionSymbol) ||
        trimmedBefore.endsWith('/') ||
        trimmedBefore.endsWith('*')
      ) {
        setMathEnter(beforeMinus);
      } else {
        setMathEnter(beforeMinus + '+');
      }
      return;
    }

    if (
      isValidPredecessorIn(trimmed) ||
      last === '(' ||
      last === expSymbol ||
      last === '^' ||
      last === productSymbol ||
      last === divisionSymbol ||
      last === '/' ||
      last === '*' ||
      !mathEnter.trim()
    ) {
      setMathEnter((prev) => prev + '-');
    } else if (last === '+') {
      setMathEnter((prev) => prev.slice(0, -1) + '-');
    } else {
      needNumberToast();
    }
  };

  const handlePower = () => {
    const trimmed = mathEnter.trimEnd();
    const last = getLastDigit(trimmed);
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    const matchVarOrImag = getStorageOrImaginaryPowerMatch(trimmed);
    if (matchVarOrImag) {
      setMathEnter((prev) => {
        const t = prev.trimEnd();
        return t.slice(0, -matchVarOrImag.supsLen) + '^';
      });
      return;
    }
    if (last && ('¹²³⁴'.includes(last) || isTargetSuperscript(last) || isSuperscript(last) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(last))) {
      setMathEnter((prev) => prev.slice(0, -1) + '^');
    } else if (isValidPredecessorIn(trimmed, undefined, false)) {
      setMathEnter((prev) => prev + '^');
    } else {
      needNumberToast();
    }
  };

  const handleSquared = () => {
    const trimmed = mathEnter.trimEnd();
    const last = getLastDigit(trimmed);
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    if (last === '²') {
      alreadyExistsToast();
    } else if (isSuperscript(last) || /[⁰¹³⁴⁵⁶⁷⁸⁹]/.test(last)) {
      setMathEnter((prev) => {
        const t = prev.trimEnd();
        if (t.endsWith(last)) {
          return t.slice(0, -last.length) + '²';
        }
        return prev.slice(0, -last.length) + '²';
      });
    } else if (last === '^') {
      setMathEnter((prev) => {
        const t = prev.trimEnd();
        if (t.endsWith('^')) {
          return t.slice(0, -last.length) + '²';
        }
        return prev.slice(0, -last.length) + '²';
      });
    } else if (isValidPredecessorIn(trimmed, undefined, false)) {
      setMathEnter((prev) => prev + '²');
    } else {
      needNumberToast();
    }
  };

  const handlePercent = () => {
    const trimmed = mathEnter.trimEnd();
    const last = getLastDigit(trimmed);
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    if (last === '%') {
      alreadyExistsToast();
    } else if (isValidPredecessorIn(trimmed, undefined, false)) {
      setMathEnter((prev) => prev + '%');
    } else {
      needNumberToast();
    }
  };

  const handleSemicolon = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    if (isNumber(last) || last === ')' || isSuperscript(last)) {
      setMathEnter((prev) => prev + ';');
    } else {
      needNumberToast();
    }
  };

  const handleGeneralRoot = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    if (isNumber(last)) {
      setMathEnter((prev) => prev + 'ª√(');
    } else {
      needNumberToast();
    }
  };

  const handleParenClose = () => {
    const trimmed = mathEnter.trimEnd();
    const last = getLastDigit(trimmed);
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    if (isValidPredecessorIn(trimmed) || isSuperscript(last)) {
      setMathEnter((prev) => {
        const { open, close } = countParens(prev);
        return open <= close ? '(' + prev + ')' : prev + ')';
      });
    } else {
      needNumberToast();
    }
  };

  const handleComma = () => {
    const tokens = mathEnter.trim().split(/[×*+\-÷\/:√^();%!ε]/);
    const currentToken = (tokens[tokens.length - 1] ?? '').trim();
    if (currentToken.includes(',') || currentToken.includes('.')) {
      return;
    }

    const last = getLastDigit();
    if (last === ',' || last === '.') {
      return;
    }
    if (isNumber(last)) {
      setMathEnter((prev) => prev + ',');
    } else {
      setMathEnter((prev) => productAfterCharacter(prev) + '0,');
    }
  };

  const handleExp = () => {
    const trimmed = mathEnter.trimEnd();
    const last = getLastDigit(trimmed);
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    if (isValidPredecessorIn(trimmed)) {
      setMathEnter((prev) => prev + expSymbol);
    } else if (last === expSymbol) {
      alreadyExistsToast();
    } else {
      needNumberToast();
    }
  };

  // Factorial χ!
  const handleFactorial = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      showToast(isSpanish ? 'Ingresa delante un número entero.' : 'Enter an integer number first.');
      return;
    }
    const tokens = mathEnter.split(/[×+\-÷\/√^();]/);
    const lastToken = tokens[tokens.length - 1];
    if (!lastToken || !/^\d+$/.test(lastToken)) {
      showToast(isSpanish ? 'Ingresa delante un número entero.' : 'Enter an integer number first.');
      return;
    }
    const n = parseInt(lastToken, 10);
    if (!isNaN(n) && n >= 0) {
      if (n > 170) {
        showToast(isSpanish ? 'El resultado tiende a infinito.' : 'The result is infinity.');
        return;
      }
      let fact = 1;
      for (let i = 2; i <= n; i++) fact *= i;
      if (!isFinite(fact)) {
        showToast(isSpanish ? 'El resultado tiende a infinito.' : 'The result is infinity.');
        return;
      }
      const base = mathEnter.slice(0, mathEnter.length - lastToken.length);
      const factStr = fact > 1e15 ? fact.toExponential().replace('e+', 'ε') : fact.toString();
      setMathEnter(base + factStr);
    } else {
      showToast(isSpanish ? 'Ingresa delante un número entero.' : 'Enter an integer number first.');
    }
  };

  // Functions and symbols helper handlers
  const handleFunction = (fn: string) => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    setMathEnter((prev) => productAfterCharacter(prev) + fn + '(');
  };

  const handleSqrt = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    setMathEnter((prev) => productAfterCharacter(prev) + '√(');
  };

  const handleParenOpen = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    setMathEnter((prev) => prev + '(');
  };

  const handleEuler = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    setMathEnter((prev) => productAfterCharacter(prev) + eulerSymbol + '^');
  };

  const handlePi = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    setMathEnter((prev) => productAfterCharacter(prev) + piSymbol);
  };

  // More functions dialog
  const handleMoreFunctions = () => {
    const last = getLastDigit();
    if (last === ',' || last === '.') {
      needNumberToast();
      return;
    }
    setModalConfig({
      isOpen: true,
      title: isSpanish ? 'Elige una opción:' : 'Choose an option:',
      cancelButton: isSpanish ? 'Cancelar' : 'Cancel',
      buttons: ['sinh', 'arcsin', 'arcsinh', 'cosh', 'arccos', 'arccosh', 'tanh', 'arctan', 'arctanh'],
      onSelect: (selected) => {
        if (selected) {
          const currentLast = getLastDigit();
          if (currentLast === ',' || currentLast === '.') {
            needNumberToast();
          } else {
            setMathEnter((prev) => productAfterCharacter(prev) + selected + '(');
          }
        }
        setModalConfig((m) => ({ ...m, isOpen: false }));
      },
    });
  };

  // SaveData (Set)
  const handleSaveData = () => {
    const rawTrimmed = mathEnter.trim();
    if (!rawTrimmed) {
      needNumberToast();
      return;
    }

    // Expand keyboard shorthand functions (e.g. "c4" -> "cos(4", "s8" -> "sin(8", "ath0,1" -> "arctanh(0,1", "c" -> "cos(")
    const cleanedExpr = rawTrimmed.replace(/\s+/g, '');
    const expandedExpr = replaceKeyboardLettersWithFunctions(cleanedExpr);

    // 1. Incomplete expression check (empty, ends in comma/point "1,", trailing operators "7,8+",
    // or functions without arguments like "c", "s", "ash", "45,5+c", "ath", "l" which expand to "cos(", "sin(", etc.)
    if (isIncompleteExpression(expandedExpr) || isIncompleteExpression(rawTrimmed)) {
      needNumberToast();
      return;
    }

    // Balance parentheses for complete functions (e.g. "cos(4" -> "cos(4)", "arctanh(0,1" -> "arctanh(0,1)")
    const canonicalExpr = balanceParentheses(expandedExpr);

    // If balanced expression has empty parentheses or syntax error (e.g. "cos()", "sin()", "()", etc.)
    if (isIncompleteExpression(canonicalExpr)) {
      needNumberToast();
      return;
    }

    // 2. Non-mathematical content / Invalid expression check (Math Error, e.g. "hola, ¿cómo estás?", "6tan(6sjdlsjdlsjdlsatan(6))")
    if (isMathErrorExpression(canonicalExpr, settings) || isMathErrorExpression(rawTrimmed, settings)) {
      showToast(isSpanish ? 'Imposible guardar.' : 'Not possible to save it.');
      return;
    }

    // 3. Strict evaluation check: NO expression that generates Sys Error or Math Error can ever be stored
    const evalRes = evaluateExpression(canonicalExpr, settings);
    if (evalRes.result === 'Math Error' || evalRes.isMathError) {
      setMathEnter(canonicalExpr);
      handleExecute(canonicalExpr);
      showToast(isSpanish ? 'Imposible guardar.' : 'Not possible to save it.');
      return;
    }

    if (evalRes.result === 'Sys Error' || evalRes.isSyntaxError) {
      setMathEnter(canonicalExpr);
      handleExecute(canonicalExpr);
      if (isIncompleteExpression(canonicalExpr) || isIncompleteExpression(expandedExpr) || isIncompleteExpression(rawTrimmed)) {
        needNumberToast();
      } else {
        showToast(isSpanish ? 'Imposible guardar.' : 'Not possible to save it.');
      }
      return;
    }

    // 4. Already stored in a variable check
    const currentNormalized = canonicalExpr.replace(/\s+/g, '');
    const vars: ('x' | 'y' | 'z' | 'w')[] = ['x', 'y', 'z', 'w'];
    for (const v of vars) {
      const stored = settings[v];
      if (stored && stored.replace(/\s+/g, '') === currentNormalized) {
        showToast(
          isSpanish
            ? `El dato ya está guardado en la variable ${v}.`
            : `Data is already stored in variable ${v}.`
        );
        return;
      }
    }

    setMathEnter(canonicalExpr);
    handleExecute(canonicalExpr);

    setModalConfig({
      isOpen: true,
      title: isSpanish ? 'Guardar en...' : 'Set to...',
      cancelButton: isSpanish ? 'Cancelar' : 'Cancel',
      buttons: ['x', 'y', 'z', 'w'],
      onSelect: (variable) => {
        if (variable) {
          const finalEval = evaluateExpression(canonicalExpr, settings);
          if (
            finalEval.result === 'Sys Error' ||
            finalEval.result === 'Math Error' ||
            finalEval.isSyntaxError ||
            finalEval.isMathError ||
            isIncompleteExpression(canonicalExpr) ||
            isMathErrorExpression(canonicalExpr, settings)
          ) {
            showToast(isSpanish ? 'Imposible guardar.' : 'Not possible to save it.');
            setModalConfig((m) => ({ ...m, isOpen: false }));
            return;
          }

          const checkNormalized = canonicalExpr.replace(/\s+/g, '');
          for (const v of (['x', 'y', 'z', 'w'] as const)) {
            const stored = settings[v];
            if (stored && stored.replace(/\s+/g, '') === checkNormalized) {
              showToast(
                isSpanish
                  ? `El dato ya está guardado en la variable ${v}.`
                  : `Data is already stored in variable ${v}.`
              );
              setModalConfig((m) => ({ ...m, isOpen: false }));
              return;
            }
          }

          const targetVar = variable as 'x' | 'y' | 'z' | 'w';
          if (hasCycleOrSelfReference(targetVar, canonicalExpr, settings)) {
            showToast(
              isSpanish
                ? `No es posible guardar la variable ${variable} sobre sí misma.`
                : `It is not possible to save the variable ${variable} about itself.`
            );
          } else {
            const next = { ...settings, [variable]: canonicalExpr };
            setSettings(next);
            saveSettings(next);
            showToast(isSpanish ? `Guardado en ${variable}.` : `Saved in ${variable}.`);
          }
        }
        setModalConfig((m) => ({ ...m, isOpen: false }));
      },
    });
  };

  // GetData (Get)
  const handleGetData = () => {
    setModalConfig({
      isOpen: true,
      title: isSpanish ? 'Recuperar...' : 'Get from...',
      cancelButton: isSpanish ? 'Cancelar' : 'Cancel',
      buttons: ['x', 'y', 'z', 'w'].filter((k) => !!settings[k as keyof CalculatorSettings]),
      onSelect: (variable) => {
        if (variable) {
          const val = settings[variable as keyof CalculatorSettings] as string;
          if (val) {
            setMathEnter(val);
          }
        }
        setModalConfig((m) => ({ ...m, isOpen: false }));
      },
    });
  };

  // Eva Button (Logo Options Menu)
  const handleEvaOptions = () => {
    const helpLabel = isSpanish ? 'Ayuda' : 'Help';
    const langLabel = isSpanish ? 'Idioma (Lenguaje)' : 'Language';
    const decLabel = `${isSpanish ? 'Cifras decimales' : 'Decimal places'} (${settings.decimalPlaces})`;
    const aboutLabel = isSpanish ? 'Acerca de Eva Calculator' : 'About Eva Calculator';

    setModalConfig({
      isOpen: true,
      title: 'Eva Calculator',
      cancelButton: isSpanish ? 'Cerrar' : 'Close',
      buttons: [helpLabel, langLabel, decLabel, aboutLabel],
      onSelect: (choice) => {
        if (choice === helpLabel) {
          const helpContent = isSpanish
            ? `\nToca la pantalla de resultados para subir un dato a la pantalla de entrada:\n1. Una vez para añadir.\n2. Dos veces para reemplazar.\n\n` +
              `El botón <M> es una memoria temporal y cuando aparece podrás volver atrás para recuperar alguna ecuación.\n\n` +
              `El botón <SET> permite guardar permanentemente una ecuación en cualquiera de las cuatro posiciones de memoria (x, y, z, w).\n\n` +
              `El botón <GET> permite cargar un dato guardado.\n\n` +
              `El botón <RAD/DEG> cambia dinámicamente entre radianes y grados.\n\n` +
              `Equivalencias logarítmicas:\nlog(a;b) = ln(a)/ln(b)\n\n` +
              `Funciones inversas e hiperbólicas:\narcsin, arccos, arctan, sinh, cosh, tanh, etc.`
            : `\nTap the results screen to upload data to the input screen:\n1. Once to add.\n2. Twice to replace.\n\n` +
              `The <M> button is temporary memory to retrieve past equations.\n\n` +
              `The <SET> button saves an equation permanently into x, y, z, or w.\n\n` +
              `The <GET> button loads stored equations.\n\n` +
              `The <RAD/DEG> button dynamically switches between radians and degrees.\n\n` +
              `Logarithm equivalences:\nlog(a;b) = ln(a)/ln(b)\n\n` +
              `Inverse & hyperbolic functions:\narcsin, arccos, arctan, sinh, cosh, tanh, etc.`;

          setModalConfig({
            isOpen: true,
            title: helpLabel,
            message: helpContent,
            cancelButton: isSpanish ? 'Cerrar' : 'Close',
            buttons: [],
            onSelect: () => setModalConfig((m) => ({ ...m, isOpen: false })),
          });
        } else if (choice === langLabel) {
          setModalConfig({
            isOpen: true,
            title: langLabel,
            cancelButton: isSpanish ? 'Cancelar' : 'Cancel',
            buttons: ['Español', 'English'],
            onSelect: (langChoice) => {
              if (langChoice) {
                const nextLang = langChoice === 'English' ? 'Inglés' : 'Español';
                const next = { ...settings, language: nextLang as any };
                setSettings(next);
                saveSettings(next);
              }
              setModalConfig((m) => ({ ...m, isOpen: false }));
            },
          });
        } else if (choice?.startsWith(isSpanish ? 'Cifras decimales' : 'Decimal places')) {
          setModalConfig({
            isOpen: true,
            title: isSpanish ? 'Precisión decimal' : 'Decimal precision',
            cancelButton: isSpanish ? 'Cancelar' : 'Cancel',
            buttons: Array.from({ length: 15 }, (_, i) => (i + 1).toString()),
            onSelect: (placesStr) => {
              if (placesStr) {
                const p = parseInt(placesStr, 10);
                const next = { ...settings, decimalPlaces: p };
                setSettings(next);
                saveSettings(next);
                if (currentComplexResultRef.current) {
                  const fitted = getFittedResult(currentComplexResultRef.current.complex, next);
                  setMathResult(fitted);
                }
              }
              setModalConfig((m) => ({ ...m, isOpen: false }));
            },
          });
        } else if (choice === aboutLabel) {
          const aboutContent = `eCalculator\nVersión 1.10\nGrupo EvaApps\n© 2025 Eva Corporation\nTodos los derechos reservados.\n\nDiseño y desarrollo:\nCristian A. Nieves\n\nAgradecimientos:\nMathos Project (Parser engine)`;
          setModalConfig({
            isOpen: true,
            title: 'Eva Calculator',
            message: aboutContent,
            cancelButton: isSpanish ? 'Cerrar' : 'Close',
            buttons: [],
            onSelect: () => setModalConfig((m) => ({ ...m, isOpen: false })),
          });
        } else {
          setModalConfig((m) => ({ ...m, isOpen: false }));
        }
      },
    });
  };

  // Result Click handler (single tap: add, double tap: replace)
  const handleResultClick = () => {
    if (
      !mathResult ||
      mathResult.includes('Error') ||
      mathResult.includes('NaN') ||
      mathResult.includes('Infinito')
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (lastTapTimerRef.current) {
        clearTimeout(lastTapTimerRef.current);
        lastTapTimerRef.current = null;
      }
      setMathEnter(mathResult);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      if (lastTapTimerRef.current) {
        clearTimeout(lastTapTimerRef.current);
      }
      lastTapTimerRef.current = setTimeout(() => {
        if (lastTapRef.current === now) {
          const last = getLastDigit();
          if (last === ',' || last === '.') {
            needNumberToast();
            return;
          }
          if (isNumber(last) || last === ')' || isImaginaryUnit(last)) {
            setMathEnter((prev) => prev + productSymbol + mathResult);
          } else {
            setMathEnter((prev) => prev + mathResult);
          }
        }
        lastTapTimerRef.current = null;
      }, 330);
    }
  };

  const hasAnySavedVar = Boolean(settings.x || settings.y || settings.z || settings.w);
  const btnBase = 'rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white transition-transform active:scale-95 flex items-center justify-center select-none whitespace-nowrap overflow-hidden text-ellipsis';
  const btnSymbol = `h-11 ${btnBase} text-base font-medium`;
  const btnFn = `h-11 ${btnBase} text-xs sm:text-sm font-medium`;
  const btnKeypad = `h-12 ${btnBase} text-lg font-medium`;
  const btnOp = `h-12 ${btnBase} text-xl font-medium`;
  const btnKeyAction = `h-12 ${btnBase} text-sm sm:text-base font-medium`;
  const btnExp = `h-12 ${btnBase} text-base font-medium`;

  const isCounterRotated = orientationInfo.isLandscape;
  const rotationDeg = orientationInfo.angle === 270 || orientationInfo.angle === -90 ? 90 : -90;

  const containerStyle: React.CSSProperties = isCounterRotated
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: `${orientationInfo.height}px`,
        height: `${orientationInfo.width}px`,
        transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
        transformOrigin: 'center center',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }
    : {};

  return (
    <>
      {isCounterRotated && (
        <div className="fixed inset-0 bg-black z-40 pointer-events-none" />
      )}
      <div
        id="calculator-root"
        className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-2 sm:p-4"
        style={containerStyle}
      >
        {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className="fixed bottom-6 z-50 px-4 py-2 rounded-full bg-zinc-800/95 border border-zinc-700 text-xs sm:text-sm text-zinc-100 shadow-xl backdrop-blur-xs animate-in fade-in slide-in-from-bottom-4 text-center max-w-[90vw]"
        >
          {toast.message}
        </div>
      )}

      {/* Main Calculator Shell - Strictly portrait structure across all devices (phones, tablets, PCs) */}
      <div
        id="calculator-container"
        ref={containerRef}
        className="w-full max-w-[420px] bg-black border border-zinc-900 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col gap-1.5 shrink-0"
      >
        {/* ROW 0: Header (Eva logo + Variables + Memory + Rad/Deg) */}
        <div id="header-row" className="flex items-center justify-between gap-1 min-h-[44px] w-full px-0.5">
          {/* Logo Button */}
          <div
            id="eva-logo-btn"
            onClick={handleEvaOptions}
            className="flex items-center cursor-pointer hover:opacity-80 active:scale-95 transition-all select-none shrink-0"
            title="Menu & Settings"
          >
            <img
              id="eva-logo-img"
              src="/eCalculator.png"
              alt="eCalculator"
              className="h-8 sm:h-9 max-w-[115px] sm:max-w-[130px] object-contain"
            />
          </div>

          {/* Action Buttons: x, GET, SET, DEG/RAD */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* x button */}
            <button
              id="var-x-btn"
              onClick={() => {
                if (settings.x) {
                  const last = getLastDigit();
                  if (last === ',' || last === '.') {
                    needNumberToast();
                    return;
                  }
                  setMathEnter((prev) => {
                    const trimmed = prev.trimEnd();
                    const match0 = trimmed.match(/([xX])⁰$/);
                    if (match0) {
                      return trimmed.slice(0, -2) + match0[1];
                    }
                    const match10 = trimmed.match(/([xX])¹⁰$/);
                    if (match10) {
                      return trimmed.slice(0, -3) + match10[1];
                    }
                    const matchSup = trimmed.match(/([xX])([¹²³⁴⁵⁶⁷⁸⁹])$/);
                    if (matchSup) {
                      const varChar = matchSup[1];
                      const currentDigit = matchSup[2];
                      const nextSup = VIRTUAL_X_POWER_CYCLE[currentDigit];
                      if (nextSup) {
                        return trimmed.slice(0, -2) + varChar + nextSup;
                      }
                    }
                    const matchVar = trimmed.match(/([xX])$/);
                    if (matchVar) {
                      return trimmed.slice(0, -1) + matchVar[1] + '²';
                    }
                    return productAfterCharacter(prev) + 'x';
                  });
                } else {
                  showToast(isSpanish ? 'Variable x no asignada.' : 'Variable x not assigned.');
                }
              }}
              className={`h-9 min-w-[34px] px-2 text-xs font-bold rounded-lg border border-transparent transition-all active:scale-95 whitespace-nowrap flex items-center justify-center ${
                settings.x
                  ? 'text-orange-400 hover:bg-zinc-900 active:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              x
            </button>

            {/* GET button */}
            <button
              id="get-data-btn"
              onClick={handleGetData}
              className={`h-9 min-w-[42px] px-2 text-xs font-bold rounded-lg border border-transparent transition-all active:scale-95 whitespace-nowrap flex items-center justify-center ${
                hasAnySavedVar
                  ? 'text-orange-400 hover:bg-zinc-900 active:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              GET
            </button>

            {/* SET button */}
            <button
              id="set-data-btn"
              onClick={handleSaveData}
              className="h-9 min-w-[42px] px-2 text-xs font-bold text-white hover:bg-zinc-900 active:bg-zinc-800 rounded-lg border border-transparent transition-all active:scale-95 whitespace-nowrap flex items-center justify-center"
            >
              SET
            </button>

            {/* Rad / Deg toggle */}
            <button
              id="rad-deg-btn"
              onClick={handleToggleRadDeg}
              style={{ color: '#ffdead' }}
              className="h-9 min-w-[44px] px-2 text-xs font-bold hover:bg-zinc-900 active:bg-zinc-800 rounded-lg border border-transparent transition-all active:scale-95 whitespace-nowrap flex items-center justify-center"
            >
              {settings.angleMode}
            </button>
          </div>
        </div>

        {/* ROW 1 & 2: MathEnter Equation Input */}
        <div
          id="math-enter-container"
          onClick={() => inputRef.current?.focus()}
          style={enterHeight ? { height: `${enterHeight}px`, minHeight: '76px' } : { minHeight: '76px' }}
          className={`w-full ${enterHeight ? '' : 'h-[76px] sm:h-[84px]'} bg-black px-2 py-1 flex items-center cursor-text transition-[height] duration-150`}
        >
          <textarea
            id="math-enter-input"
            ref={inputRef}
            rows={visibleLines}
            value={mathEnter}
            maxLength={MAX_INPUT_CHARS}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                handleExecute();
                return;
              }

              if (e.key === 'Escape') {
                e.preventDefault();
                handleAC();
                return;
              }

              const isDeadOrAccent =
                e.key === 'Dead' ||
                e.key === '¨' ||
                e.key === '´' ||
                e.key === '`' ||
                e.key === '~';

              if (isDeadOrAccent) {
                e.preventDefault();
                return;
              }

              const textarea = inputRef.current;
              if (textarea && !e.metaKey && !e.ctrlKey) {
                const start = textarea.selectionStart ?? mathEnter.length;
                const end = textarea.selectionEnd ?? mathEnter.length;
                const textBefore = mathEnter.slice(0, start);
                const textAfter = mathEnter.slice(end);
                const { char: charBefore, len: lenBefore } = getCharEndingAt(textBefore, textBefore.length);
                const charAfter = textAfter.length > 0 ? textAfter[0] : '';

                // Control de exponente/potencia solo para la unidad imaginaria con 'I':
                if (e.key === 'I') {
                  const advanced = tryAdvanceImaginaryPower(textBefore, textAfter);
                  if (advanced) {
                    e.preventDefault();
                    if (advanced.limitReached) {
                      powerLimitReachedToast();
                      return;
                    }
                    setMathEnter(advanced.replacedText);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(advanced.newCursor, advanced.newCursor);
                      }
                    });
                    return;
                  }
                }

                // Control de exponente/potencia para variables de almacenamiento (x, y, z, w, X, Y, Z, W):
                if (STORAGE_VARS.has(e.key)) {
                  const varAdv = tryAdvanceVariablePower(textBefore, textAfter, e.key);
                  if (varAdv) {
                    e.preventDefault();
                    if (varAdv.limitReached) {
                      powerLimitReachedToast();
                      return;
                    }
                    setMathEnter(varAdv.replacedText);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(varAdv.newCursor, varAdv.newCursor);
                      }
                    });
                    return;
                  }
                }

                // Si delante de i hay una letra diferente a i (como en 'si', 'arcsi', 'Arseni'),
                // NO se permite ingresar inmediatamente después operadores matemáticos (+, -, *, /, ×, ÷), ^ o superíndices (², ³, ⁴):
                if (isImaginaryUnitChar(charBefore) && !isImaginaryUnitAt(textBefore, textBefore.length)) {
                  if (
                    isMathOperator(e.key) ||
                    e.key === '*' ||
                    e.key === '/' ||
                    e.key === '÷' ||
                    e.key === '×' ||
                    e.key === '^' ||
                    isTargetSuperscript(e.key)
                  ) {
                    e.preventDefault();
                    needNumberToast();
                    return;
                  }
                }

                // Control independiente de coma decimal (, o .) para evitar más de una por número desde teclados externos
                if (e.key === ',' || e.key === '.') {
                  if (hasDecimalInCurrentNumber(mathEnter, start, end)) {
                    e.preventDefault();
                    alreadyExistsToast();
                    return;
                  }

                  // Control independiente de teclado externo del ordenador:
                  // Si no hay un número delante de la coma (,), ingresar automáticamente un cero ("0,")
                  if (e.key === ',' && !isNumber(charBefore)) {
                    e.preventDefault();
                    const nextVal = textBefore + '0,' + textAfter;
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start + 2, start + 2);
                      }
                    });
                    return;
                  }
                }

                // 2. Control independiente después de una coma decimal (, o .) para evitar caracteres prohibidos:
                // Sin importar si hay espacios o no inmediatamente después del punto/coma decimal (.) o (,)
                // EVITAR el ingreso manual de: e, %, -, +, (, ), x, y, z, w, etc.
                const textBeforeTrimmed = textBefore.trimEnd();
                const lastCharBeforeDecimal = textBeforeTrimmed.length > 0 ? textBeforeTrimmed[textBeforeTrimmed.length - 1] : '';
                if (lastCharBeforeDecimal === ',' || lastCharBeforeDecimal === '.') {
                  if (FORBIDDEN_AFTER_COMMA_SET.has(e.key)) {
                    e.preventDefault();
                    if (e.key === ',' || e.key === '.') {
                      alreadyExistsToast();
                    } else {
                      needNumberToast();
                    }
                    return;
                  }
                }

                // 1. El usuario NO debe poder ingresar, desde un teclado físico o virtual externo a la APP,
                // los operadores de división (/) y de producto (×) si no hay un número o un paréntesis de cierre delante.
                if (e.key === '/' || e.key === '÷' || e.key === '*' || e.key === '×') {
                  const hasValidLeading = hasNumberOrCloseParenBefore(mathEnter, start);
                  if (!hasValidLeading) {
                    e.preventDefault();
                    needNumberToast();
                    return;
                  }
                }

                // Control independiente de operadores matemáticos (×, /, +, -)
                if (isMathOperator(e.key)) {
                  e.preventDefault();

                  // 1. Si se presiona "*", en los teclados externos a la APP, debe cambiarse al símbolo "×"
                  const incomingKey = e.key === '*' ? productSymbol : e.key;

                  // Reemplazo de selección de texto
                  if (start < end) {
                    const nextVal = textBefore + incomingKey + textAfter;
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start + 1, start + 1);
                      }
                    });
                    return;
                  }

                  // 2. Si delante hay un Operador matemático (×, /, +, -) y se presiona otro operador matemático diferente,
                  // la app cambia automáticamente a un operador por el otro operador.
                  if (isMathOperator(charBefore)) {
                    const textBeforeOp = textBefore.slice(0, -lenBefore);
                    const { char: beforePrev } = getCharEndingAt(textBeforeOp, textBeforeOp.length);

                    // 1. La aplicación debe permitir ingresar, con el botón - del teclado propio del ordenador o del teclado virtual propio del sistema móvil,
                    // el signo negativo (-) inmediatamente después del símbolo de multiplicación (×) o división (÷, /)
                    if (isMulOrDiv(charBefore) && incomingKey === '-') {
                      const nextVal = textBefore + '-' + textAfter;
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start + 1, start + 1);
                        }
                      });
                      return;
                    }

                    // 2. Y en el caso que delante del signo negativo - este × o / o ÷ de la forma (×-) o (/-) o (÷-)
                    // y el usuario presiona el mismo botón -, la app solo visualizará × o / o ÷ respectivamente suprimiendo el signo -
                    if (charBefore === '-' && incomingKey === '-') {
                      if (
                        !beforePrev ||
                        beforePrev === '(' ||
                        beforePrev === '^' ||
                        isMulOrDiv(beforePrev)
                      ) {
                        const nextVal = textBefore.slice(0, -lenBefore) + textAfter;
                        setMathEnter(nextVal);
                        requestAnimationFrame(() => {
                          if (inputRef.current) {
                            inputRef.current.setSelectionRange(start - lenBefore, start - lenBefore);
                          }
                        });
                        return;
                      }

                      // En otros casos (ej. 5- seguido de -), la app lo cambia a +
                      const nextVal = textBefore.slice(0, -lenBefore) + '+' + textAfter;
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start, start);
                        }
                      });
                      return;
                    }

                    // En el caso que delante del signo negativo - esté ×, /, ÷ de la forma (×-), (/-), (÷-)
                    // y el usuario presiona con el teclado propio del ordenador o del sistema móvil el +,
                    // la app continuará visualizando ×-, /-, ÷- y lanzará el Toast: "El resultado es negativo." / "Result is negative."
                    if (charBefore === '-' && isMulOrDiv(beforePrev) && incomingKey === '+') {
                      resultIsNegativeToast();
                      return;
                    }

                    if (isMulOrDiv(charBefore) && charAfter === '-' && incomingKey === '+') {
                      resultIsNegativeToast();
                      return;
                    }

                    // Y si delante hay + y se presiona - cambia a -
                    if (charBefore === '+' && incomingKey === '-') {
                      const nextVal = textBefore.slice(0, -lenBefore) + '-' + textAfter;
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start, start);
                        }
                      });
                      return;
                    }

                    // Mismo operador presionado de nuevo: duplicado (++ o // o ××)
                    if (isSameOperator(charBefore, incomingKey)) {
                      alreadyExistsToast();
                      return;
                    }

                    // Cambio automático de operador (ejemplos: + con / -> /, - con * -> ×, × con / -> /, × con + -> +)
                    if (
                      (incomingKey === '/' || incomingKey === '÷' || incomingKey === '×') &&
                      !(
                        /\d/.test(beforePrev) ||
                        beforePrev === ')' ||
                        isSuperscript(beforePrev) ||
                        isVariable(beforePrev) ||
                        isImaginaryUnitAt(textBeforeOp, textBeforeOp.length)
                      )
                    ) {
                      needNumberToast();
                      return;
                    }

                    const nextVal = textBefore.slice(0, -lenBefore) + incomingKey + textAfter;
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start, start);
                      }
                    });
                    return;
                  }

                  // Si el cursor está justo antes de un operador existente (charAfter)
                  if (isMathOperator(charAfter)) {
                    if (charAfter === '-' && incomingKey === '-') {
                      const charBeforeBefore = textBefore.length >= 1 ? textBefore[textBefore.length - 1] : '';
                      if (isMulOrDiv(charBeforeBefore)) {
                        const nextVal = textBefore + textAfter.slice(1);
                        setMathEnter(nextVal);
                        requestAnimationFrame(() => {
                          if (inputRef.current) {
                            inputRef.current.setSelectionRange(start, start);
                          }
                        });
                        return;
                      }
                      const nextVal = textBefore + '+' + textAfter.slice(1);
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start + 1, start + 1);
                        }
                      });
                      return;
                    }
                    if (charAfter === '+' && incomingKey === '-') {
                      const nextVal = textBefore + '-' + textAfter.slice(1);
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start + 1, start + 1);
                        }
                      });
                      return;
                    }
                    if (charAfter === '-' && incomingKey === '+') {
                      const charBeforeBefore = textBefore.length >= 1 ? textBefore[textBefore.length - 1] : '';
                      if (isMulOrDiv(charBeforeBefore)) {
                        resultIsNegativeToast();
                        return;
                      }
                      const nextVal = textBefore + '+' + textAfter.slice(1);
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start + 1, start + 1);
                        }
                      });
                      return;
                    }
                    if (isMulOrDiv(incomingKey) && charAfter === '-') {
                      const nextVal = textBefore + incomingKey + textAfter;
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start + 1, start + 1);
                        }
                      });
                      return;
                    }
                    if (isSameOperator(charAfter, incomingKey)) {
                      alreadyExistsToast();
                      return;
                    }
                    const nextVal = textBefore + incomingKey + textAfter.slice(1);
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start + 1, start + 1);
                      }
                    });
                    return;
                  }

                  // Inserción estándar del operador en la posición exacta del cursor
                  const nextVal = textBefore + incomingKey + textAfter;
                  setMathEnter(nextVal);
                  requestAnimationFrame(() => {
                    if (inputRef.current) {
                      inputRef.current.setSelectionRange(start + 1, start + 1);
                    }
                  });
                  return;
                }

                // Control independiente para superíndices (² ³ ⁴) y exponentes:
                // Intercambio automático entre superíndices diferentes, con '^' y prevención de replicación
                const isExponentInput = isTargetSuperscript(e.key) || isSuperscript(e.key) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(e.key);
                if (isExponentInput) {
                  e.preventDefault();

                  const matchStorageBefore = textBefore.match(/([xyzwXYZW])([⁰¹²³⁴⁵⁶⁷⁸⁹]*)$/);
                  const matchAfter = textAfter.match(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]*/);
                  const supsAfterCount = matchAfter ? matchAfter[0].length : 0;

                  if (matchStorageBefore) {
                    const currentSupCount = matchStorageBefore[2].length;
                    const totalDigits = currentSupCount + supsAfterCount + 1;
                    if (totalDigits > 3) {
                      powerLimitReachedToast();
                      return;
                    }
                    const nextVal = textBefore + e.key + textAfter;
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start + 1, start + 1);
                      }
                    });
                    return;
                  }

                  // Control de superíndices para unidad imaginaria (i, 𝐢):
                  const matchImaginarySups = textBefore.match(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*)$/);
                  if (matchImaginarySups) {
                    const supsBeforeStr = matchImaginarySups[1];
                    const textBeforeSups = textBefore.slice(0, textBefore.length - supsBeforeStr.length);
                    const { char: unitChar } = getCharEndingAt(textBeforeSups, textBeforeSups.length);
                    if (isImaginaryUnitChar(unitChar) && (unitChar === BOLD_I || isImaginaryUnitAt(textBeforeSups, textBeforeSups.length))) {
                      const totalDigits = supsBeforeStr.length + supsAfterCount + 1;
                      if (totalDigits > 3) {
                        powerLimitReachedToast();
                        return;
                      }
                      const nextVal = textBefore + e.key + textAfter;
                      setMathEnter(nextVal);
                      requestAnimationFrame(() => {
                        if (inputRef.current) {
                          inputRef.current.setSelectionRange(start + 1, start + 1);
                        }
                      });
                      return;
                    }
                  }

                  if (charBefore === e.key || charAfter === e.key) {
                    alreadyExistsToast();
                    return;
                  }

                  if (isTargetSuperscript(charBefore) || charBefore === '^' || isSuperscript(charBefore)) {
                    const nextVal = textBefore.slice(0, -1) + e.key + textAfter;
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start, start);
                      }
                    });
                    return;
                  }

                  if (isTargetSuperscript(charAfter) || charAfter === '^' || isSuperscript(charAfter)) {
                    const nextVal = textBefore + e.key + textAfter.slice(1);
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start + 1, start + 1);
                      }
                    });
                    return;
                  }

                  // No se permite ingresar inmediatamente después de un operador matemático (×, ÷, /, +, -, *) o sin número previo:
                  if (isMathOperator(charBefore) || !isValidPredecessorIn(textBefore, textBefore.length, false)) {
                    needNumberToast();
                    return;
                  }

                  const nextVal = textBefore + e.key + textAfter;
                  setMathEnter(nextVal);
                  requestAnimationFrame(() => {
                    if (inputRef.current) {
                      inputRef.current.setSelectionRange(start + 1, start + 1);
                    }
                  });
                  return;
                }

                if (e.key === '^') {
                  e.preventDefault();
                  if (charBefore === '^' || charAfter === '^') {
                    alreadyExistsToast();
                    return;
                  }

                  const matchVarOrImag = getStorageOrImaginaryPowerMatch(textBefore);
                  if (matchVarOrImag) {
                    const matchAfter = textAfter.match(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/);
                    const afterLen = matchAfter ? matchAfter[0].length : 0;
                    const supsLen = matchVarOrImag.supsLen;
                    const newBefore = textBefore.slice(0, -supsLen);
                    const nextVal = newBefore + '^' + textAfter.slice(afterLen);
                    setMathEnter(nextVal);
                    const newCursor = newBefore.length + 1;
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(newCursor, newCursor);
                      }
                    });
                    return;
                  }

                  if (charBefore && ('¹²³⁴'.includes(charBefore) || isTargetSuperscript(charBefore) || isSuperscript(charBefore) || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(charBefore))) {
                    const nextVal = textBefore.slice(0, -1) + '^' + textAfter;
                    setMathEnter(nextVal);
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.setSelectionRange(start, start);
                      }
                    });
                    return;
                  }
                  // No se permite ingresar inmediatamente después de un operador matemático (×, ÷, /, +, -, *) o sin número previo:
                  if (isMathOperator(charBefore) || !isValidPredecessorIn(textBefore, textBefore.length, false)) {
                    needNumberToast();
                    return;
                  }
                  const nextVal = textBefore + '^' + textAfter;
                  setMathEnter(nextVal);
                  requestAnimationFrame(() => {
                    if (inputRef.current) {
                      inputRef.current.setSelectionRange(start + 1, start + 1);
                    }
                  });
                  return;
                }

                // Control para evitar la replicación accidental de otros operadores: (%%) o (,,) o (..) o (^^)
                if (OTHER_DUPLICATE_KEYS_SET.has(e.key)) {
                  if (isOtherDuplicateKey(e.key, charBefore, charAfter)) {
                    e.preventDefault();
                    alreadyExistsToast();
                    return;
                  }
                }
              }
            }}
            placeholder="0"
            className="w-full h-full bg-transparent text-white text-2xl sm:text-3xl font-light tracking-wide outline-hidden placeholder-zinc-700 resize-none break-all whitespace-pre-wrap overflow-y-auto no-scrollbar leading-snug sm:leading-snug p-0 border-0"
            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          />
        </div>

        {/* ROW 3: MathResult Display */}
        <div
          id="math-result-container"
          ref={mathResultContainerRef}
          onClick={handleResultClick}
          className={`w-full min-h-[46px] bg-black px-2 py-1 flex items-center overflow-x-hidden cursor-pointer hover:opacity-90 select-none no-scrollbar ${
            mathResult.includes('Infinito') || mathResult === 'NaN' || mathResult === 'Sys Error' || mathResult === 'Math Error' ? 'justify-center' : 'justify-end'
          }`}
          title="Single tap to append, double tap to replace"
        >
          <div
            id="math-result-label"
            ref={mathResultLabelRef}
            style={{ fontSize: resultFontSize || undefined }}
            className={`text-2xl sm:text-3xl font-light tracking-wide text-zinc-100 whitespace-nowrap ${
              mathResult.includes('Infinito') || mathResult === 'NaN' || mathResult === 'Sys Error' || mathResult === 'Math Error' ? 'text-center' : 'text-right'
            }`}
          >
            {mathResult || ' '}
          </div>
        </div>

        {/* Hidden off-screen measurement span to test candidate lengths under responsive font styles */}
        <span
          ref={measureSpanRef}
          style={{ fontSize: resultFontSize || undefined }}
          className="absolute invisible pointer-events-none -left-[9999px] -top-[9999px] text-2xl sm:text-3xl font-light tracking-wide whitespace-nowrap"
          aria-hidden="true"
        />

        {/* ROW 4: Symbols Line 3 (•••, log, ln, sin, cos, tan) */}
        <div id="symbols-line-3" className="grid grid-cols-6 gap-1.5 pt-1">
          <button
            id="btn-more"
            onClick={handleMoreFunctions}
            className={`h-11 ${btnBase} text-lg font-medium`}
          >
            •••
          </button>
          {[
            { id: 'btn-log', label: 'LOG', fn: 'log' },
            { id: 'btn-ln', label: 'LN', fn: 'ln' },
            { id: 'btn-sin', label: 'SIN', fn: 'sin' },
            { id: 'btn-cos', label: 'COS', fn: 'cos' },
            { id: 'btn-tan', label: 'TAN', fn: 'tan' },
          ].map((b) => (
            <button
              key={b.id}
              id={b.id}
              onClick={() => handleFunction(b.fn)}
              className={btnFn}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* ROW 5: Symbols Line 2 (m, χⁿ, χ!, ª√, euler, pi) */}
        <div id="symbols-line-2" className="grid grid-cols-6 gap-1.5">
          <button
            id="btn-retornar"
            onClick={handleRetornar}
            style={{ color: mColor === 'yellowgreen' ? '#9acd32' : '#ffa500' }}
            className={`h-11 ${btnBase} text-base font-bold ${ram.length > 0 ? '' : 'invisible'}`}
            title="Recall calculation memory"
          >
            m
          </button>
          <button id="btn-power" onClick={handlePower} className={btnSymbol}>χⁿ</button>
          <button id="btn-factorial" onClick={handleFactorial} className={btnSymbol} title="x!">X!</button>
          <button id="btn-general-root" onClick={handleGeneralRoot} className={btnSymbol}>ª√</button>
          <button
            id="btn-euler"
            onClick={handleEuler}
            className={`h-11 ${btnBase}`}
            title="e"
          >
            <img
              src="/euler.png"
              alt="e"
              className="h-5 sm:h-5.5 w-auto object-contain invert select-none pointer-events-none"
            />
          </button>
          <button
            id="btn-pi"
            onClick={handlePi}
            className={`h-11 ${btnBase}`}
            title="π"
          >
            <img
              src="/Pi.png"
              alt="π"
              className="h-5 sm:h-5.5 w-auto object-contain invert select-none pointer-events-none"
            />
          </button>
        </div>

        {/* ROW 6: Symbols Line 1 (;, χ², %, √, (, )) */}
        <div id="symbols-line-1" className="grid grid-cols-6 gap-1.5">
          <button id="btn-semicolon" onClick={handleSemicolon} className={btnSymbol}>;</button>
          <button id="btn-squared" onClick={handleSquared} className={btnSymbol}>χ²</button>
          <button id="btn-percent" onClick={handlePercent} className={btnSymbol}>%</button>
          <button id="btn-sqrt" onClick={handleSqrt} className={btnSymbol}>√</button>
          <button id="btn-paren-open" onClick={handleParenOpen} className={btnSymbol}>(</button>
          <button id="btn-paren-close" onClick={handleParenClose} className={btnSymbol}>)</button>
        </div>

        {/* KEYPAD (Numbers & Basic Operators) */}
        <div id="keypad-grid" className="grid grid-cols-5 gap-1.5 pt-1">
          {/* Row 1: 7, 8, 9, DEL, AC */}
          <button id="btn-7" onClick={() => addNumber('7')} className={btnKeypad}>7</button>
          <button id="btn-8" onClick={() => addNumber('8')} className={btnKeypad}>8</button>
          <button id="btn-9" onClick={() => addNumber('9')} className={btnKeypad}>9</button>
          <button id="btn-del" onClick={handleDel} className={btnKeyAction}>DEL</button>
          <button id="btn-ac" onClick={handleAC} className={btnKeyAction}>AC</button>

          {/* Row 2: 4, 5, 6, ×, ÷ */}
          <button id="btn-4" onClick={() => addNumber('4')} className={btnKeypad}>4</button>
          <button id="btn-5" onClick={() => addNumber('5')} className={btnKeypad}>5</button>
          <button id="btn-6" onClick={() => addNumber('6')} className={btnKeypad}>6</button>
          <button id="btn-multiply" onClick={() => handleBinaryOp(productSymbol)} className={btnOp}>×</button>
          <button id="btn-divide" onClick={() => handleBinaryOp(divisionSymbol)} className={btnOp}>÷</button>

          {/* Row 3: 1, 2, 3, +, - */}
          <button id="btn-1" onClick={() => addNumber('1')} className={btnKeypad}>1</button>
          <button id="btn-2" onClick={() => addNumber('2')} className={btnKeypad}>2</button>
          <button id="btn-3" onClick={() => addNumber('3')} className={btnKeypad}>3</button>
          <button id="btn-add" onClick={() => handleBinaryOp('+')} className={btnOp}>+</button>
          <button id="btn-subtract" onClick={handleSubtract} className={btnOp}>-</button>

          {/* Row 4: 0, ,, EXP, EXE */}
          <button id="btn-0" onClick={() => addNumber('0')} className={btnKeypad}>0</button>
          <button id="btn-comma" onClick={handleComma} className={btnKeypad}>,</button>
          <button id="btn-exp" onClick={handleExp} className={btnExp}>EXP</button>
          <button
            id="btn-exe"
            onClick={() => handleExecute()}
            style={{ backgroundColor: '#7fffd4' }}
            className="col-span-2 h-12 rounded-lg text-black font-semibold text-base shadow-sm hover:brightness-105 active:scale-95 transition-transform flex items-center justify-center whitespace-nowrap select-none"
          >
            EXE
          </button>
        </div>
      </div>

      {/* ActionSheet Modal */}
      <ActionSheet
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        cancelButton={modalConfig.cancelButton}
        buttons={modalConfig.buttons}
        alignLeft={modalConfig.alignLeft}
        onSelect={modalConfig.onSelect}
      />
    </div>
    </>
  );
}
