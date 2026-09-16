import { useState, useEffect, useRef } from 'react';
import { loadSettings, saveSettings } from './settings';
import { CalculatorSettings, ToastNotice, AngleMode } from './types';
import { evaluateExpression } from './mathEngine';
import { ActionSheet } from './components/ActionSheet';

export default function App() {
  const [settings, setSettings] = useState<CalculatorSettings>(loadSettings);
  const [mathEnter, setMathEnter] = useState<string>('');
  const [mathResult, setMathResult] = useState<string>('');
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
    onSelect: (selected: string | null) => void;
  }>({
    isOpen: false,
    buttons: [],
    onSelect: () => {},
  });

  const lastTapRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Constants
  const productSymbol = '×';
  const divisionSymbol = '÷';
  const piSymbol = 'π';
  const eulerSymbol = 'e';
  const expSymbol = 'ε';
  const numbers = '0123456789';
  const variables = 'xyzw';
  const isNumber = (char: string) => Boolean(char && numbers.includes(char));
  const isVariable = (char: string) => Boolean(char && variables.includes(char));
  const isSuperscript = (char: string) => Boolean(char && '¹½⅓¼⅛²⅔⅜³¾⁴⅝⅞'.includes(char));

  const showToast = (message: string) => {
    setToast({ id: Date.now().toString(), message });
    setTimeout(() => {
      setToast(null);
    }, 2400);
  };

  const isSpanish = settings.language === 'Español';

  // Informative alert on start if enabled
  useEffect(() => {
    if (settings.mostrarInfo) {
      setModalConfig({
        isOpen: true,
        title: isSpanish ? 'Recuerda...' : 'Remind...',
        message: isSpanish
          ? 'Toca el logo de la app, en la esquina superior izquierda, para ver el menú de opciones.\n¿Quieres seguir viendo este mensaje?'
          : 'Touch the logo of the app, at the upper left corner, to see the options menu.\nWould you like to see this message again?',
        cancelButton: null,
        buttons: isSpanish ? ['Si', 'No'] : ['Yes', 'No'],
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

  const getLastDigit = (text: string = mathEnter): string => {
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed[trimmed.length - 1] : '';
  };

  const productAfterCharacter = (current: string): string => {
    if (!current || !current.trim()) return current;
    const last = getLastDigit(current);
    if (!last) return current;
    if (
      last === ')' ||
      last === '%' ||
      last === piSymbol ||
      last === eulerSymbol ||
      isSuperscript(last) ||
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

      // Point after zero check
      const tokens = cur.split(/[×+\-÷\/√^();]/);
      const lastToken = tokens[tokens.length - 1];
      if (lastToken === '0') {
        cur += ',';
      }

      return cur + digit;
    });
  };

  // Execution (= / EXE)
  const handleExecute = (overrideInput?: string) => {
    let rawExpr = overrideInput !== undefined ? overrideInput : mathEnter;
    if (!rawExpr.trim()) {
      showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
      return;
    }

    // Autocomplete closing parentheses if opening parentheses exceed closing ones
    let openCount = 0;
    let closeCount = 0;
    for (const char of rawExpr) {
      if (char === '(') openCount++;
      else if (char === ')') closeCount++;
    }

    let exprToRun = rawExpr;
    if (openCount > closeCount) {
      const missingCount = openCount - closeCount;
      exprToRun = rawExpr + ')'.repeat(missingCount);
      setMathEnter(exprToRun);
    }

    const { result } = evaluateExpression(exprToRun, settings, (warning) => {
      if (warning === 'tan_undefined') {
        showToast(
          isSpanish
            ? 'El resultado no está definido o tiende a infinito para este valor en una función tangente.'
            : 'It is not defined or tends to infinity in a tangent function.'
        );
      }
    });

    if (mathResult === result && result !== 'NaN') {
      showToast(isSpanish ? 'El resultado es el mismo.' : 'Result is the same.');
    }

    setMathResult(result);

    // Save to RAM history
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
    const nextItem = ram[ramIndex];
    setMathEnter(nextItem);
    setRamIndex((prev) => (prev <= 0 ? ram.length - 1 : prev - 1));
  };

  // Rad / Deg toggle
  const handleToggleRadDeg = () => {
    const nextMode: AngleMode = settings.angleMode === 'RAD' ? 'DEG' : 'RAD';
    const updated: CalculatorSettings = { ...settings, angleMode: nextMode };
    setSettings(updated);
    saveSettings(updated);

    // Re-evaluate dynamically if input contains trig
    if (/[sct]|arc/.test(mathEnter)) {
      const { result } = evaluateExpression(mathEnter, updated);
      setMathResult(result);
    }
  };

  // DEL button
  const handleDel = () => {
    if (!mathEnter || mathEnter.length <= 1) {
      setMathEnter('');
      return;
    }

    let temp = mathEnter;

    // Check compound tokens at the end
    if (temp.endsWith(')')) {
      temp = temp.slice(0, -1);
    } else if (temp.endsWith('sinh(') || temp.endsWith('cosh(') || temp.endsWith('tanh(')) {
      temp = temp.slice(0, -5);
    } else if (
      temp.endsWith('arcsin(') ||
      temp.endsWith('arccos(') ||
      temp.endsWith('arctan(')
    ) {
      temp = temp.slice(0, -7);
    } else if (
      temp.endsWith('arcsinh(') ||
      temp.endsWith('arccosh(') ||
      temp.endsWith('arctanh(')
    ) {
      temp = temp.slice(0, -8);
    } else if (temp.endsWith('sin(') || temp.endsWith('cos(') || temp.endsWith('tan(') || temp.endsWith('log(')) {
      temp = temp.slice(0, -4);
    } else if (temp.endsWith('ln(') || temp.endsWith('ª√(')) {
      temp = temp.slice(0, -3);
    } else if (temp.endsWith('√(')) {
      temp = temp.slice(0, -2);
    } else {
      temp = temp.slice(0, -1);
    }

    setMathEnter(temp);
  };

  // AC button
  const handleAC = () => {
    if (mathEnter) {
      setMathEnter('');
    } else {
      setMathResult('');
    }
  };

  // Factorial χ!
  const handleFactorial = () => {
    const tokens = mathEnter.split(/[×+\-÷\/√^();]/);
    const lastToken = tokens[tokens.length - 1];
    const n = parseInt(lastToken, 10);
    if (!isNaN(n) && n >= 0 && n <= 170) {
      let fact = 1;
      for (let i = 2; i <= n; i++) fact *= i;
      const base = mathEnter.slice(0, mathEnter.length - lastToken.length);
      const factStr = fact > 1e15 ? fact.toExponential().replace('e+', 'ε') : fact.toString();
      setMathEnter(base + factStr);
    } else {
      showToast(isSpanish ? 'Ingresa delante un número entero.' : 'Enter an integer number first.');
    }
  };

  // More functions dialog
  const handleMoreFunctions = () => {
    setModalConfig({
      isOpen: true,
      title: isSpanish ? 'Elige una opción:' : 'Choose an option:',
      cancelButton: isSpanish ? 'Cancelar' : 'Cancel',
      buttons: ['sinh', 'arcsin', 'arcsinh', 'cosh', 'arccos', 'arccosh', 'tanh', 'arctan', 'arctanh'],
      onSelect: (selected) => {
        if (selected) {
          setMathEnter((prev) => productAfterCharacter(prev) + selected + '(');
        }
        setModalConfig((m) => ({ ...m, isOpen: false }));
      },
    });
  };

  // SaveData (Set)
  const handleSaveData = () => {
    if (!mathEnter.trim()) {
      showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
      return;
    }

    handleExecute();

    setModalConfig({
      isOpen: true,
      title: isSpanish ? 'Guardar en...' : 'Set to...',
      cancelButton: isSpanish ? 'Cancelar' : 'Cancel',
      buttons: ['x', 'y', 'z', 'w'],
      onSelect: (variable) => {
        if (variable) {
          if (mathEnter.includes(variable)) {
            showToast(
              isSpanish
                ? `No es posible guardar la variable ${variable} sobre sí misma.`
                : `It is not possible to save the variable ${variable} about itself.`
            );
          } else {
            const next = { ...settings, [variable]: mathEnter };
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
              }
              setModalConfig((m) => ({ ...m, isOpen: false }));
            },
          });
        } else if (choice === aboutLabel) {
          const aboutContent = `eCalculator\nVersión 1.05\nGrupo EvaApps\n© 2025 Eva Corporation\nTodos los derechos reservados.\n\nDiseño y desarrollo:\nCristian A. Nieves\n\nAgradecimientos:\nMathos Project (Parser engine)`;
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
    if (!mathResult || mathResult.includes('Error') || mathResult.includes('NaN')) return;

    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      // Double tap: replace
      setMathEnter(mathResult);
      lastTapRef.current = 0;
    } else {
      // Single tap: add with multiplication if following a number
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          const last = getLastDigit();
          if (isNumber(last) || last === ')') {
            setMathEnter((prev) => prev + productSymbol + mathResult);
          } else {
            setMathEnter((prev) => prev + mathResult);
          }
        }
      }, 330);
    }
  };

  const hasAnySavedVar = Boolean(settings.x || settings.y || settings.z || settings.w);

  return (
    <div id="calculator-root" className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className="fixed bottom-6 z-50 px-4 py-2 rounded-full bg-zinc-800/95 border border-zinc-700 text-xs sm:text-sm text-zinc-100 shadow-xl backdrop-blur-xs animate-in fade-in slide-in-from-bottom-4"
        >
          {toast.message}
        </div>
      )}

      {/* Main Calculator Shell */}
      <div
        id="calculator-container"
        className="w-full max-w-[420px] bg-black border border-zinc-900 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col gap-1.5"
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
                  setMathEnter((prev) => productAfterCharacter(prev) + 'x');
                } else {
                  showToast(isSpanish ? 'Variable x no asignada.' : 'Variable x not assigned.');
                }
              }}
              className={`h-9 min-w-[34px] px-2 text-xs font-bold rounded-lg border border-transparent transition-all active:scale-95 ${
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
              className={`h-9 min-w-[42px] px-2 text-xs font-bold rounded-lg border border-transparent transition-all active:scale-95 ${
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
              className="h-9 min-w-[42px] px-2 text-xs font-bold text-white hover:bg-zinc-900 active:bg-zinc-800 rounded-lg border border-transparent transition-all active:scale-95"
            >
              SET
            </button>

            {/* Rad / Deg toggle */}
            <button
              id="rad-deg-btn"
              onClick={handleToggleRadDeg}
              style={{ color: '#ffdead' }}
              className="h-9 min-w-[44px] px-2 text-xs font-bold hover:bg-zinc-900 active:bg-zinc-800 rounded-lg border border-transparent transition-all active:scale-95 whitespace-nowrap"
            >
              {settings.angleMode}
            </button>
          </div>
        </div>

        {/* ROW 1 & 2: MathEnter Equation Input */}
        <div id="math-enter-container" className="w-full min-h-[72px] bg-black px-2 py-1 flex items-end">
          <input
            id="math-enter-input"
            ref={inputRef}
            type="text"
            value={mathEnter}
            onChange={(e) => setMathEnter(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-white text-2xl sm:text-3xl font-light tracking-wide outline-hidden placeholder-zinc-700"
          />
        </div>

        {/* ROW 3: MathResult Display */}
        <div
          id="math-result-container"
          onClick={handleResultClick}
          className="w-full min-h-[46px] bg-black px-2 py-1 flex items-center justify-end overflow-x-auto cursor-pointer hover:opacity-90 select-none"
          title="Single tap to append, double tap to replace"
        >
          <div
            id="math-result-label"
            className="text-2xl sm:text-3xl font-light tracking-wide text-zinc-100 text-right whitespace-nowrap"
          >
            {mathResult || ' '}
          </div>
        </div>

        {/* ROW 4: Symbols Line 3 (•••, log, ln, sin, cos, tan) */}
        <div id="symbols-line-3" className="grid grid-cols-6 gap-1.5 pt-1">
          <button
            id="btn-more"
            onClick={handleMoreFunctions}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            •••
          </button>
          <button
            id="btn-log"
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + 'log(')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-sm font-medium transition-transform active:scale-95"
          >
            LOG
          </button>
          <button
            id="btn-ln"
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + 'ln(')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-sm font-medium transition-transform active:scale-95"
          >
            LN
          </button>
          <button
            id="btn-sin"
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + 'sin(')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-sm font-medium transition-transform active:scale-95"
          >
            SIN
          </button>
          <button
            id="btn-cos"
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + 'cos(')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-sm font-medium transition-transform active:scale-95"
          >
            COS
          </button>
          <button
            id="btn-tan"
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + 'tan(')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-sm font-medium transition-transform active:scale-95"
          >
            TAN
          </button>
        </div>

        {/* ROW 5: Symbols Line 2 (m, χⁿ, χ!, ª√, euler, pi) */}
        <div id="symbols-line-2" className="grid grid-cols-6 gap-1.5">
          <button
            id="btn-retornar"
            onClick={handleRetornar}
            style={{ color: mColor === 'yellowgreen' ? '#9acd32' : '#ffa500' }}
            className={`h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-base font-bold transition-transform active:scale-95 ${
              ram.length > 0 ? '' : 'invisible'
            }`}
            title="Recall calculation memory"
          >
            m
          </button>
          <button
            id="btn-power"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || isVariable(last) || last === ')' || last === piSymbol || last === eulerSymbol) {
                setMathEnter((prev) => prev + '^');
              } else if (last && '¹²³⁴'.includes(last)) {
                setMathEnter((prev) => prev.slice(0, -1) + '^');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            χⁿ
          </button>
          <button
            id="btn-factorial"
            onClick={handleFactorial}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
            title="x!"
          >
            X!
          </button>
          <button
            id="btn-general-root"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last)) {
                setMathEnter((prev) => prev + 'ª√(');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            ª√
          </button>
          <button
            id="btn-euler"
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + eulerSymbol + '^')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white flex items-center justify-center transition-transform active:scale-95"
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
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + piSymbol)}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white flex items-center justify-center transition-transform active:scale-95"
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
          <button
            id="btn-semicolon"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || last === ')' || isSuperscript(last)) {
                setMathEnter((prev) => prev + ';');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            ;
          </button>
          <button
            id="btn-squared"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || isVariable(last) || last === ')' || last === piSymbol || last === eulerSymbol) {
                setMathEnter((prev) => prev + '²');
              } else if (last === '^') {
                setMathEnter((prev) => prev.slice(0, -1) + '²');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            χ²
          </button>
          <button
            id="btn-percent"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || isVariable(last) || last === ')' || last === piSymbol || last === eulerSymbol) {
                setMathEnter((prev) => prev + '%');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            %
          </button>
          <button
            id="btn-sqrt"
            onClick={() => setMathEnter((prev) => productAfterCharacter(prev) + '√(')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            √
          </button>
          <button
            id="btn-paren-open"
            onClick={() => setMathEnter((prev) => prev + '(')}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            (
          </button>
          <button
            id="btn-paren-close"
            onClick={() => {
              const last = getLastDigit();
              if (
                isNumber(last) ||
                isVariable(last) ||
                last === ')' ||
                last === piSymbol ||
                last === eulerSymbol ||
                last === '%' ||
                isSuperscript(last)
              ) {
                setMathEnter((prev) => {
                  let openCount = 0;
                  let closeCount = 0;
                  for (const char of prev) {
                    if (char === '(') openCount++;
                    else if (char === ')') closeCount++;
                  }

                  // If there are no unmatched open parentheses, prepend '(' to balance the operation
                  if (openCount <= closeCount) {
                    return '(' + prev + ')';
                  }
                  return prev + ')';
                });
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-11 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            )
          </button>
        </div>

        {/* KEYPAD (Numbers & Basic Operators) */}
        <div id="keypad-grid" className="grid grid-cols-5 gap-1.5 pt-1">
          {/* Row 1: 7, 8, 9, DEL, AC */}
          <button
            id="btn-7"
            onClick={() => addNumber('7')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            7
          </button>
          <button
            id="btn-8"
            onClick={() => addNumber('8')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            8
          </button>
          <button
            id="btn-9"
            onClick={() => addNumber('9')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            9
          </button>
          <button
            id="btn-del"
            onClick={handleDel}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            DEL
          </button>
          <button
            id="btn-ac"
            onClick={handleAC}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-base font-medium transition-transform active:scale-95"
          >
            AC
          </button>

          {/* Row 2: 4, 5, 6, ×, ÷ */}
          <button
            id="btn-4"
            onClick={() => addNumber('4')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            4
          </button>
          <button
            id="btn-5"
            onClick={() => addNumber('5')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            5
          </button>
          <button
            id="btn-6"
            onClick={() => addNumber('6')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            6
          </button>
          <button
            id="btn-multiply"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || isVariable(last) || last === ')' || last === '%' || last === piSymbol || last === eulerSymbol) {
                setMathEnter((prev) => prev + productSymbol);
              } else if (last === '+' || last === divisionSymbol) {
                setMathEnter((prev) => prev.slice(0, -1) + productSymbol);
              } else if (last === productSymbol) {
                showToast(isSpanish ? 'Este símbolo ya existe.' : 'It already exists.');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            ×
          </button>
          <button
            id="btn-divide"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || isVariable(last) || last === ')' || last === '%' || last === piSymbol || last === eulerSymbol) {
                setMathEnter((prev) => prev + divisionSymbol);
              } else if (last === '+' || last === productSymbol) {
                setMathEnter((prev) => prev.slice(0, -1) + divisionSymbol);
              } else if (last === divisionSymbol) {
                showToast(isSpanish ? 'Este símbolo ya existe.' : 'It already exists.');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            ÷
          </button>

          {/* Row 3: 1, 2, 3, +, - */}
          <button
            id="btn-1"
            onClick={() => addNumber('1')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            1
          </button>
          <button
            id="btn-2"
            onClick={() => addNumber('2')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            2
          </button>
          <button
            id="btn-3"
            onClick={() => addNumber('3')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            3
          </button>
          <button
            id="btn-add"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || isVariable(last) || last === ')' || last === '%' || last === piSymbol || last === eulerSymbol) {
                setMathEnter((prev) => prev + '+');
              } else if (last === productSymbol || last === divisionSymbol) {
                setMathEnter((prev) => prev.slice(0, -1) + '+');
              } else if (last === '+') {
                showToast(isSpanish ? 'Este símbolo ya existe.' : 'It already exists.');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            +
          </button>
          <button
            id="btn-subtract"
            onClick={() => {
              const last = getLastDigit();
              if (
                isNumber(last) ||
                isVariable(last) ||
                last === ')' ||
                last === '%' ||
                last === piSymbol ||
                last === eulerSymbol ||
                last === '(' ||
                !mathEnter.trim()
              ) {
                setMathEnter((prev) => prev + '-');
              } else if (last === '+') {
                setMathEnter((prev) => prev.slice(0, -1) + '-');
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            -
          </button>

          {/* Row 4: 0, ,, EXP, EXE (EXE spans 2 cols with Aquamarine color) */}
          <button
            id="btn-0"
            onClick={() => addNumber('0')}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            0
          </button>
          <button
            id="btn-comma"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last)) {
                const tokens = mathEnter.split(/[×+\-÷\/√^();]/);
                const lastToken = tokens[tokens.length - 1];
                if (!lastToken.includes(',')) {
                  setMathEnter((prev) => prev + ',');
                }
              } else {
                setMathEnter((prev) => productAfterCharacter(prev) + '0,');
              }
            }}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-lg font-medium transition-transform active:scale-95"
          >
            ,
          </button>
          <button
            id="btn-exp"
            onClick={() => {
              const last = getLastDigit();
              if (isNumber(last) || last === ')' || last === '%' || last === piSymbol || last === eulerSymbol) {
                setMathEnter((prev) => prev + expSymbol);
              } else {
                showToast(isSpanish ? 'Primero ingresa al menos un número.' : 'Enter at least a number first.');
              }
            }}
            className="h-12 rounded-lg bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white text-sm font-medium transition-transform active:scale-95"
          >
            EXP
          </button>
          <button
            id="btn-exe"
            onClick={() => handleExecute()}
            style={{ backgroundColor: '#7fffd4' }}
            className="col-span-2 h-12 rounded-lg text-black font-semibold text-base shadow-sm hover:brightness-105 active:scale-95 transition-transform"
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
        onSelect={modalConfig.onSelect}
      />
    </div>
  );
}
