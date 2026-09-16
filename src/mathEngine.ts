import { CalculatorSettings } from './types';

export class MathParser {
  private operators: Map<string, (a: number, b: number) => number> = new Map();
  private localFunctions: Map<string, (inputs: number[]) => number> = new Map();
  private localVariables: Map<string, number> = new Map();
  public onWarning?: (msg: string) => void;

  constructor() {
    this.initOperators();
    this.initVariables();
    this.initFunctions();
  }

  private initOperators() {
    this.operators.set('^', (a, b) => Math.pow(a, b));
    this.operators.set('%', (a, b) => a % b);
    this.operators.set(':', (a, b) => a / b);
    this.operators.set('/', (a, b) => a / b);
    this.operators.set('*', (a, b) => a * b);
    this.operators.set('-', (a, b) => a - b);
    this.operators.set('+', (a, b) => a + b);
    this.operators.set('>', (a, b) => (a > b ? 1 : 0));
    this.operators.set('<', (a, b) => (a < b ? 1 : 0));
    this.operators.set('=', (a, b) => (Math.abs(a - b) < 0.00000001 ? 1 : 0));
  }

  private initVariables() {
    this.localVariables.set('pi', 3.141592653589793);
    this.localVariables.set('tao', 6.28318530717959);
    this.localVariables.set('e', 2.718281828459045);
    this.localVariables.set('phi', 1.61803398874989);
    this.localVariables.set('major', 0.61803398874989);
    this.localVariables.set('minor', 0.38196601125011);
    this.localVariables.set('pitograd', 57.2957795130823);
    this.localVariables.set('piofgrad', 0.01745329251994);
  }

  private initFunctions() {
    const round15 = (n: number) => {
      if (Math.abs(n) < 1e-15) return 0;
      return parseFloat(n.toPrecision(15));
    };

    this.localFunctions.set('abs', (inputs) => Math.abs(inputs[0]));
    this.localFunctions.set('cos', (inputs) => round15(Math.cos(inputs[0])));
    this.localFunctions.set('cosh', (inputs) => Math.cosh(inputs[0]));
    this.localFunctions.set('acos', (inputs) => Math.acos(inputs[0]));
    this.localFunctions.set('arccos', (inputs) => Math.acos(inputs[0]));

    this.localFunctions.set('sin', (inputs) => round15(Math.sin(inputs[0])));
    this.localFunctions.set('sinh', (inputs) => Math.sinh(inputs[0]));
    this.localFunctions.set('asin', (inputs) => Math.asin(inputs[0]));
    this.localFunctions.set('arcsin', (inputs) => Math.asin(inputs[0]));

    this.localFunctions.set('tan', (inputs) => {
      const val = Math.abs(inputs[0]);
      if (Math.abs(val - 1.5707963267949) < 1e-6 || Math.abs(val - 4.71238898038469) < 1e-6) {
        if (this.onWarning) {
          this.onWarning('tan_undefined');
        }
        return 2 * Math.pow(10, 308);
      }
      return round15(Math.tan(inputs[0]));
    });
    this.localFunctions.set('tanh', (inputs) => Math.tanh(inputs[0]));
    this.localFunctions.set('atan', (inputs) => Math.atan(inputs[0]));
    this.localFunctions.set('arctan', (inputs) => Math.atan(inputs[0]));

    // DEG functions matching MathParser.cs
    this.localFunctions.set('ċos', (inputs) => round15(Math.cos((Math.PI / 180) * inputs[0])));
    this.localFunctions.set('ċosh', (inputs) => Math.cosh(inputs[0]));
    this.localFunctions.set('arcċos', (inputs) => (180 / Math.PI) * Math.acos(inputs[0]));
    this.localFunctions.set('arcċosh', (inputs) => Math.log(inputs[0] + Math.sqrt(Math.pow(inputs[0], 2) - 1)));
    this.localFunctions.set('arccosh', (inputs) => Math.log(inputs[0] + Math.sqrt(Math.pow(inputs[0], 2) - 1)));

    this.localFunctions.set('siɳ', (inputs) => round15(Math.sin((Math.PI / 180) * inputs[0])));
    this.localFunctions.set('siɳh', (inputs) => Math.sinh(inputs[0]));
    this.localFunctions.set('arcsiɳ', (inputs) => (180 / Math.PI) * Math.asin(inputs[0]));
    this.localFunctions.set('arcsiɳh', (inputs) => Math.log(inputs[0] + Math.sqrt(Math.pow(inputs[0], 2) + 1)));
    this.localFunctions.set('arcsinh', (inputs) => Math.log(inputs[0] + Math.sqrt(Math.pow(inputs[0], 2) + 1)));

    this.localFunctions.set('taɳ', (inputs) => {
      const val = Math.abs(inputs[0]);
      if (Math.abs(val - 90) < 1e-6 || Math.abs(val - 270) < 1e-6) {
        if (this.onWarning) {
          this.onWarning('tan_undefined');
        }
        return 2 * Math.pow(10, 308);
      }
      return round15(Math.tan((Math.PI / 180) * inputs[0]));
    });
    this.localFunctions.set('taɳh', (inputs) => Math.tanh(inputs[0]));
    this.localFunctions.set('arctaŋ', (inputs) => (180 / Math.PI) * Math.atan(inputs[0]));
    this.localFunctions.set('arctaŋh', (inputs) => Math.log((1 + inputs[0]) / (1 - inputs[0])) * 0.5);
    this.localFunctions.set('arctanh', (inputs) => Math.log((1 + inputs[0]) / (1 - inputs[0])) * 0.5);

    this.localFunctions.set('sqrt', (inputs) => Math.sqrt(inputs[0]));
    this.localFunctions.set('pow', (inputs) => Math.pow(inputs[0], inputs[1]));
    this.localFunctions.set('root', (inputs) => Math.pow(inputs[0], 1 / inputs[1]));
    this.localFunctions.set('exp', (inputs) => Math.exp(inputs[0]));
    this.localFunctions.set('log', (inputs) => {
      if (inputs.length === 1) return Math.log10(inputs[0]);
      if (inputs.length === 2) return Math.log(inputs[0]) / Math.log(inputs[1]);
      return 0;
    });
    this.localFunctions.set('ln', (inputs) => Math.log(inputs[0]));
  }

  private lexer(expr: string): string[] {
    let s = expr;
    s = s.replace(/\+-/g, '-');
    s = s.replace(/-\+/g, '-');
    s = s.replace(/--/g, '+');

    const tokens: string[] = [];
    let token = '';

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];

      if (/\s/.test(ch)) continue;

      if (/[a-zA-Z\u0080-\uFFFF]/.test(ch) && ch !== '.') {
        if (i !== 0 && (/\d/.test(s[i - 1]) || s[i - 1] === ')')) {
          tokens.push('*');
        }

        token += ch;
        while (i + 1 < s.length && /[a-zA-Z0-9\u0080-\uFFFF]/.test(s[i + 1])) {
          token += s[++i];
        }
        tokens.push(token);
        token = '';
        continue;
      }

      if (/\d/.test(ch)) {
        token += ch;
        while (i + 1 < s.length && (/\d/.test(s[i + 1]) || s[i + 1] === '.')) {
          token += s[++i];
        }
        tokens.push(token);
        token = '';
        continue;
      }

      if (ch === '.') {
        token += ch;
        while (i + 1 < s.length && /\d/.test(s[i + 1])) {
          token += s[++i];
        }
        tokens.push(token);
        token = '';
        continue;
      }

      if (
        i + 1 < s.length &&
        (ch === '-' || ch === '+') &&
        /\d/.test(s[i + 1]) &&
        (i === 0 || this.operators.has(s[i - 1]) || (i - 1 >= 0 && s[i - 1] === '('))
      ) {
        token += ch;
        while (i + 1 < s.length && (/\d/.test(s[i + 1]) || s[i + 1] === '.')) {
          token += s[++i];
        }
        tokens.push(token);
        token = '';
        continue;
      }

      if (ch === '(') {
        if (i !== 0 && (/\d/.test(s[i - 1]) || s[i - 1] === ')')) {
          tokens.push('*');
          tokens.push('(');
        } else {
          tokens.push('(');
        }
      } else {
        tokens.push(ch);
      }
    }

    return tokens;
  }

  public parse(mathExpression: string): number {
    const tokens = this.lexer(mathExpression);
    return this.mathParserLogic(tokens);
  }

  private mathParserLogic(tokens: string[]): number {
    for (let i = 0; i < tokens.length; i++) {
      if (this.localVariables.has(tokens[i])) {
        tokens[i] = this.localVariables.get(tokens[i])!.toString();
      }
    }

    while (tokens.indexOf('(') !== -1) {
      const open = tokens.lastIndexOf('(');
      let close = -1;
      for (let i = open + 1; i < tokens.length; i++) {
        if (tokens[i] === ')') {
          close = i;
          break;
        }
      }

      if (close === -1 || open >= close) {
        throw new Error(`No closing bracket/parenthesis. Token: ${open}`);
      }

      const roughExpr = tokens.slice(open + 1, close);
      let tmpResult: number;

      const functionName = open === 0 ? '' : tokens[open - 1];

      if (functionName && this.localFunctions.has(functionName)) {
        if (roughExpr.includes(',')) {
          const args: number[] = [];
          let currentArgTokens: string[] = [];
          for (let i = 0; i < roughExpr.length; i++) {
            if (roughExpr[i] === ',') {
              args.push(currentArgTokens.length === 0 ? 0 : this.basicArithmeticalExpression(currentArgTokens));
              currentArgTokens = [];
            } else {
              currentArgTokens.push(roughExpr[i]);
            }
          }
          if (currentArgTokens.length > 0) {
            args.push(this.basicArithmeticalExpression(currentArgTokens));
          }
          tmpResult = this.localFunctions.get(functionName)!(args);
        } else {
          const singleArg = this.basicArithmeticalExpression(roughExpr);
          tmpResult = this.localFunctions.get(functionName)!([singleArg]);
        }
      } else {
        tmpResult = this.basicArithmeticalExpression(roughExpr);
      }

      tokens[open] = tmpResult.toString();
      tokens.splice(open + 1, close - open);

      if (functionName && this.localFunctions.has(functionName)) {
        tokens.splice(open - 1, 1);
      }
    }

    return this.basicArithmeticalExpression(tokens);
  }

  private basicArithmeticalExpression(tokens: string[]): number {
    if (tokens.length === 0) return 0;
    if (tokens.length === 1) return parseFloat(tokens[0]);
    if (tokens.length === 2) {
      const op = tokens[0];
      if (op === '-' || op === '+') {
        const sign = op === '+' ? '' : '-';
        return parseFloat(sign + tokens[1]);
      }
      return this.operators.get(op) ? this.operators.get(op)!(0, parseFloat(tokens[1])) : 0;
    }

    const precedenceGroups = [
      ['^'],
      ['*', '/', ':', '%'],
      ['+', '-'],
      ['>', '<', '='],
    ];

    for (const group of precedenceGroups) {
      let i = 0;
      while (i < tokens.length) {
        const token = tokens[i];
        if (group.includes(token)) {
          const op = token;
          const opFunc = this.operators.get(op);
          if (!opFunc) {
            i++;
            continue;
          }

          if (op === '-' && i === 0) {
            const rhs = parseFloat(tokens[i + 1]);
            const res = opFunc(0, rhs);
            tokens[0] = res.toString();
            tokens.splice(i + 1, 1);
            continue;
          }

          const lhs = parseFloat(tokens[i - 1]);
          const rhs = parseFloat(tokens[i + 1]);
          const res = opFunc(lhs, rhs);
          tokens[i - 1] = res.toString();
          tokens.splice(i, 2);
          i--;
          continue;
        }
        i++;
      }
    }

    return parseFloat(tokens[0]);
  }
}

/**
 * Main evaluation pipeline adhering to eCalculator.xaml.cs logic
 */
export function evaluateExpression(
  expression: string,
  settings: CalculatorSettings,
  onWarning?: (type: string) => void
): { result: string; isError: boolean; errorMessage?: string } {
  let temp = expression.trim();
  if (!temp) {
    return { result: '', isError: false };
  }

  // 1. Balance parentheses
  let openCount = (temp.match(/\(/g) || []).length;
  let closeCount = (temp.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    temp += ')'.repeat(openCount - closeCount);
  } else if (closeCount > openCount) {
    temp = '('.repeat(closeCount - openCount) + temp;
  }

  // 2. Handle general roots: e.g. "3ª√(8)" -> 2, "3ª√(-8)" -> -2
  const generalRootRegex = /([0-9.]+)\s*ª√\(([^()]+)\)/g;
  temp = temp.replace(generalRootRegex, (_, indexStr, radicandStr) => {
    try {
      const idx = parseFloat(indexStr);
      const radicand = parseFloat(radicandStr);
      if (Math.floor(idx) === idx && idx % 2 !== 0 && radicand < 0) {
        return (-Math.pow(Math.abs(radicand), 1 / idx)).toString();
      }
      return Math.pow(radicand, 1 / idx).toString();
    } catch {
      return `root(${radicandStr},${indexStr})`;
    }
  });

  // 3. Replace variables x, y, z, w with stored values
  if (settings.x) temp = temp.split('x').join(`(${settings.x})`);
  if (settings.y) temp = temp.split('y').join(`(${settings.y})`);
  if (settings.z) temp = temp.split('z').join(`(${settings.z})`);
  if (settings.w) temp = temp.split('w').join(`(${settings.w})`);

  // 4. Mode RAD or DEG substitutions
  if (settings.angleMode === 'DEG') {
    temp = temp
      .replace(/sin/g, 'siɳ')
      .replace(/cos/g, 'ċos')
      .replace(/ctan/g, 'ctaŋ')
      .replace(/tan/g, 'taɳ');
  } else {
    temp = temp
      .replace(/siɳ/g, 'sin')
      .replace(/ċos/g, 'cos')
      .replace(/ctaŋ/g, 'ctan')
      .replace(/taɳ/g, 'tan')
      .replace(/ɳ/g, 'n')
      .replace(/ŋ/g, 'n');
  }

  // 5. Replace special symbols
  temp = temp
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/%/g, '/100')
    .replace(/-sin\(/g, '-1*sin(')
    .replace(/-cos\(/g, '-1*cos(')
    .replace(/-tan\(/g, '-1*tan(')
    .replace(/-siɳ\(/g, '-1*siɳ(')
    .replace(/-ċos\(/g, '-1*ċos(')
    .replace(/-taɳ\(/g, '-1*taɳ(')
    .replace(/,/g, '.')
    .replace(/;/g, ',')
    .replace(/π/g, '(3.14159265358979323846)')
    .replace(/e/g, '(2.718281828459045235360)')
    .replace(/ε/g, '*10^')
    .replace(/EXP/g, '*10^')
    .replace(/½/g, '+0.5')
    .replace(/⅓/g, '+0.33333333')
    .replace(/¼/g, '+0.25')
    .replace(/⅛/g, '+0.125')
    .replace(/⅔/g, '+0.66666667')
    .replace(/⅜/g, '+0.375')
    .replace(/¾/g, '+0.75')
    .replace(/⅝/g, '+0.625')
    .replace(/⅞/g, '+0.875')
    .replace(/¹/g, '^(1)')
    .replace(/²/g, '^(2)')
    .replace(/³/g, '^(3)')
    .replace(/⁴/g, '^(4)')
    .replace(/μ/g, '*10^-6')
    .replace(/√\(/g, 'sqrt(')
    .replace(/√([0-9.]+)/g, 'sqrt($1)');

  // Unary sign fixups
  if (temp.startsWith('(-') && (temp[2] === '-' || (temp[2] === '(' && temp[3] === '-'))) {
    temp = ' ' + temp;
  } else if (temp.startsWith('-(')) {
    temp = '0+' + temp;
  }

  try {
    const parser = new MathParser();
    if (onWarning) {
      parser.onWarning = onWarning;
    }
    let val = parser.parse(temp);

    if (isNaN(val)) {
      return { result: 'NaN', isError: true, errorMessage: 'NaN' };
    }

    if (!isFinite(val)) {
      return { result: val > 0 ? 'Infinity' : '-Infinity', isError: true, errorMessage: 'Infinity' };
    }

    // Format with decimalPlaces
    const factor = Math.pow(10, settings.decimalPlaces);
    val = Math.round(val * factor) / factor;

    // Convert decimal point to Spanish comma as per original eCalculator
    let strVal = val.toString();
    if (strVal.includes('e') || strVal.includes('E')) {
      strVal = strVal.replace(/e\+?/i, 'ε');
    }
    strVal = strVal.replace(/\./g, ',');

    return { result: strVal, isError: false };
  } catch (err: unknown) {
    return { result: 'Math Error', isError: true, errorMessage: err instanceof Error ? err.message : 'Math Error' };
  }
}
