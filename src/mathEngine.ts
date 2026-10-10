import { CalculatorSettings } from './types';

export function cleanFloat(val: number): number {
  if (Math.abs(val) < 1e-12) return 0;
  if (Math.abs(Math.round(val) - val) < 1e-11) return Math.round(val);
  return val;
}

export class ComplexNumber {
  public re: number;
  public im: number;
  public radicand?: number; // e.g. 2 for √2 i
  public evenRoot?: { index: number; factor: number }; // e.g. { index: 4, factor: 2 } for 2 × ⁴√(-1)
  public complexRoot?: { index: number; radicand: ComplexNumber }; // e.g. { index: 3, radicand: 4i }

  constructor(
    re: number = 0,
    im: number = 0,
    radicand?: number,
    evenRoot?: { index: number; factor: number },
    complexRoot?: { index: number; radicand: ComplexNumber }
  ) {
    this.re = re;
    this.im = im;
    this.radicand = radicand;
    this.evenRoot = evenRoot;
    this.complexRoot = complexRoot;
  }

  static real(r: number): ComplexNumber {
    return new ComplexNumber(r, 0);
  }

  static imag(i: number, radicand?: number): ComplexNumber {
    return new ComplexNumber(0, i, radicand);
  }

  isReal(): boolean {
    return !this.complexRoot && !this.evenRoot && !this.radicand && Math.abs(this.im) < 1e-12;
  }

  isImag(): boolean {
    return (
      !this.complexRoot &&
      !this.evenRoot &&
      Math.abs(this.re) < 1e-12 &&
      (Math.abs(this.im) >= 1e-12 || Boolean(this.radicand))
    );
  }

  isZero(): boolean {
    return (
      !this.complexRoot &&
      !this.evenRoot &&
      !this.radicand &&
      Math.abs(this.re) < 1e-12 &&
      Math.abs(this.im) < 1e-12
    );
  }

  toCartesian(): { re: number; im: number } {
    if (this.evenRoot) {
      const n = this.evenRoot.index;
      const f = this.evenRoot.factor;
      const angle = Math.PI / n;
      const cosVal = Math.abs(Math.cos(angle)) < 1e-12 ? 0 : Math.cos(angle);
      const sinVal = Math.abs(Math.sin(angle)) < 1e-12 ? 0 : Math.sin(angle);
      return {
        re: Math.abs(f * cosVal) < 1e-12 ? 0 : f * cosVal,
        im: Math.abs(f * sinVal) < 1e-12 ? 0 : f * sinVal,
      };
    }
    if (this.complexRoot) {
      const cart = this.complexRoot.radicand.pow(ComplexNumber.real(1 / this.complexRoot.index));
      return { re: cart.re, im: cart.im };
    }
    return { re: this.re, im: this.im };
  }

  add(other: ComplexNumber): ComplexNumber {
    const c1 = this.toCartesian();
    const c2 = other.toCartesian();
    const re = c1.re + c2.re;
    const im = c1.im + c2.im;
    let rad: number | undefined;
    if (Math.abs(im) > 1e-12) {
      if (this.radicand && other.radicand) {
        rad = Math.abs(this.radicand - other.radicand) < 1e-9 ? this.radicand : undefined;
      } else if (this.radicand && Math.abs(c2.im) < 1e-12) {
        rad = this.radicand;
      } else if (other.radicand && Math.abs(c1.im) < 1e-12) {
        rad = other.radicand;
      }
    }
    return new ComplexNumber(re, im, rad);
  }

  sub(other: ComplexNumber): ComplexNumber {
    if (this.isReal() && Math.abs(this.re) < 1e-12 && other.complexRoot) {
      return new ComplexNumber(0, 0, undefined, undefined, {
        index: other.complexRoot.index,
        radicand: other.complexRoot.radicand.mul(ComplexNumber.real(-1)),
      });
    }
    if (this.isReal() && Math.abs(this.re) < 1e-12 && other.evenRoot) {
      return new ComplexNumber(0, 0, undefined, {
        index: other.evenRoot.index,
        factor: -other.evenRoot.factor,
      });
    }
    const c1 = this.toCartesian();
    const c2 = other.toCartesian();
    const re = c1.re - c2.re;
    const im = c1.im - c2.im;
    let rad: number | undefined;
    if (Math.abs(im) > 1e-12) {
      if (this.radicand && other.radicand) {
        rad = Math.abs(this.radicand - other.radicand) < 1e-9 ? this.radicand : undefined;
      } else if (this.radicand && Math.abs(c2.im) < 1e-12) {
        rad = this.radicand;
      } else if (other.radicand && Math.abs(c1.im) < 1e-12) {
        rad = other.radicand;
      }
    }
    return new ComplexNumber(re, im, rad);
  }

  mul(other: ComplexNumber): ComplexNumber {
    if (this.complexRoot && other.isReal()) {
      if (Math.abs(other.re) < 1e-12) return ComplexNumber.real(0);
      const idx = this.complexRoot.index;
      const factor = Math.pow(other.re, idx);
      const cleanFactor = Math.abs(Math.round(factor) - factor) < 1e-9 ? Math.round(factor) : factor;
      const newRad = this.complexRoot.radicand.mul(ComplexNumber.real(cleanFactor));
      return new ComplexNumber(0, 0, undefined, undefined, { index: idx, radicand: newRad });
    }
    if (other.complexRoot && this.isReal()) {
      if (Math.abs(this.re) < 1e-12) return ComplexNumber.real(0);
      const idx = other.complexRoot.index;
      const factor = Math.pow(this.re, idx);
      const cleanFactor = Math.abs(Math.round(factor) - factor) < 1e-9 ? Math.round(factor) : factor;
      const newRad = other.complexRoot.radicand.mul(ComplexNumber.real(cleanFactor));
      return new ComplexNumber(0, 0, undefined, undefined, { index: idx, radicand: newRad });
    }

    if (this.evenRoot && other.evenRoot) {
      const n1 = this.evenRoot.index;
      const n2 = other.evenRoot.index;
      if (n1 === n2) {
        const n = n1;
        const f = this.evenRoot.factor * other.evenRoot.factor;
        const angle = (Math.PI * 2) / n;
        const cosVal = Math.abs(Math.cos(angle)) < 1e-12 ? 0 : Math.cos(angle);
        const sinVal = Math.abs(Math.sin(angle)) < 1e-12 ? 0 : Math.sin(angle);
        const re = Math.abs(f * cosVal) < 1e-12 ? 0 : f * cosVal;
        const im = Math.abs(f * sinVal) < 1e-12 ? 0 : f * sinVal;
        return new ComplexNumber(re, im);
      }
    }

    if (this.complexRoot && other.complexRoot && this.complexRoot.index === other.complexRoot.index) {
      const newRad = this.complexRoot.radicand.mul(other.complexRoot.radicand);
      if (newRad.isReal()) {
        return ComplexNumber.root(newRad, this.complexRoot.index);
      }
      return new ComplexNumber(0, 0, undefined, undefined, { index: this.complexRoot.index, radicand: newRad });
    }

    if (this.evenRoot && other.isReal()) {
      if (Math.abs(other.re) < 1e-12) return ComplexNumber.real(0);
      const idx = this.evenRoot.index;
      const newFactor = this.evenRoot.factor * other.re;
      return new ComplexNumber(0, 0, undefined, { index: idx, factor: newFactor });
    }
    if (other.evenRoot && this.isReal()) {
      if (Math.abs(this.re) < 1e-12) return ComplexNumber.real(0);
      const idx = other.evenRoot.index;
      const newFactor = other.evenRoot.factor * this.re;
      return new ComplexNumber(0, 0, undefined, { index: idx, factor: newFactor });
    }

    const c1 = this.toCartesian();
    const c2 = other.toCartesian();

    // (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
    const ac = c1.re * c2.re;
    const bd = c1.im * c2.im;
    const ad = c1.re * c2.im;
    const bc = c1.im * c2.re;

    const realPart = ac - bd;
    const imagPart = ad + bc;

    const cleanReal = cleanFloat(realPart);
    const cleanImag = cleanFloat(imagPart);
    const rad = cleanImag !== 0 ? (this.radicand || other.radicand) : undefined;

    return new ComplexNumber(cleanReal, cleanImag, rad);
  }

  div(other: ComplexNumber, onWarning?: (msg: string) => void): ComplexNumber {
    if (this.evenRoot && other.isReal()) {
      if (Math.abs(other.re) < 1e-15) {
        if (this.isZero()) {
          if (onWarning) onWarning('zero_divided_by_zero');
          return new ComplexNumber(Infinity, 0);
        }
        if (onWarning) onWarning('division_by_zero');
        const numNeg = this.evenRoot.factor < 0;
        const denNeg = Object.is(other.re, -0) || other.re < -1e-12;
        const isNeg = numNeg !== denNeg;
        return new ComplexNumber(isNeg ? -Infinity : Infinity, 0);
      }
      const idx = this.evenRoot.index;
      const newFactor = this.evenRoot.factor / other.re;
      return new ComplexNumber(0, 0, undefined, { index: idx, factor: newFactor });
    }

    const c1 = this.toCartesian();
    const c2 = other.toCartesian();

    const denom = c2.re * c2.re + c2.im * c2.im;
    if (Math.abs(denom) < 1e-15) {
      if (this.isZero()) {
        if (onWarning) onWarning('zero_divided_by_zero');
        return new ComplexNumber(Infinity, 0);
      }
      if (onWarning) onWarning('division_by_zero');
      const numNeg = c1.re < -1e-12 || (Math.abs(c1.re) <= 1e-12 && c1.im < -1e-12);
      const denNeg = Object.is(c2.re, -0) || Object.is(c2.im, -0) || c2.re < -1e-12 || c2.im < -1e-12;
      const isNeg = numNeg !== denNeg;
      return new ComplexNumber(isNeg ? -Infinity : Infinity, 0);
    }
    const realPart = (c1.re * c2.re + c1.im * c2.im) / denom;
    const imagPart = (c1.im * c2.re - c1.re * c2.im) / denom;
    const cleanReal = cleanFloat(realPart);
    const cleanImag = cleanFloat(imagPart);
    const rad = this.radicand && other.isReal() ? this.radicand : undefined;
    return new ComplexNumber(cleanReal, cleanImag, rad);
  }

  pow(exponent: ComplexNumber): ComplexNumber {
    if (this.evenRoot && exponent.isReal()) {
      const p = exponent.re;
      if (Math.abs(p) < 1e-12) return ComplexNumber.real(1);
      if (Math.abs(p - 1) < 1e-12) return this;
      const n = this.evenRoot.index;
      const f = this.evenRoot.factor;
      const fNew = Math.pow(f, p);
      const angle = (Math.PI * p) / n;
      const cosVal = Math.abs(Math.cos(angle)) < 1e-12 ? 0 : Math.cos(angle);
      const sinVal = Math.abs(Math.sin(angle)) < 1e-12 ? 0 : Math.sin(angle);
      const re = Math.abs(fNew * cosVal) < 1e-12 ? 0 : fNew * cosVal;
      const im = Math.abs(fNew * sinVal) < 1e-12 ? 0 : fNew * sinVal;
      return new ComplexNumber(re, im);
    }

    if (this.complexRoot && exponent.isReal()) {
      const p = exponent.re;
      if (Math.abs(p) < 1e-12) return ComplexNumber.real(1);
      if (Math.abs(p - 1) < 1e-12) return this;
      if (Math.abs(p - this.complexRoot.index) < 1e-9) {
        return this.complexRoot.radicand;
      }
      return this.complexRoot.radicand.pow(ComplexNumber.real(p / this.complexRoot.index));
    }
    if (exponent.isReal()) {
      const exp = Math.round(exponent.re);
      if (Math.abs(exponent.re - exp) < 1e-9) {
        if (exp === 0) return ComplexNumber.real(1);
        if (exp > 0) {
          let res = new ComplexNumber(this.re, this.im, this.radicand);
          for (let k = 1; k < exp; k++) {
            res = res.mul(this);
          }
          return res;
        } else {
          const absExp = -exp;
          let res = new ComplexNumber(this.re, this.im, this.radicand);
          for (let k = 1; k < absExp; k++) {
            res = res.mul(this);
          }
          return ComplexNumber.real(1).div(res);
        }
      }
    }

    if (this.isReal() && exponent.isReal()) {
      if (this.re >= 0) {
        return ComplexNumber.real(Math.pow(this.re, exponent.re));
      } else {
        if (Math.abs(exponent.re - 0.5) < 1e-9) {
          return ComplexNumber.sqrt(this.re);
        }
        if (Math.abs(exponent.re - 0.25) < 1e-9) {
          return ComplexNumber.root(this.re, 4);
        }
      }
    }

    const c1 = this.toCartesian();
    const c2 = exponent.toCartesian();
    const r = Math.hypot(c1.re, c1.im);
    if (r < 1e-15) {
      if (c2.re > 0) return ComplexNumber.real(0);
      return new ComplexNumber(Infinity, 0);
    }
    const theta = Math.atan2(c1.im, c1.re);
    const logR = Math.log(r);
    const realExp = c2.re * logR - c2.im * theta;
    const imagExp = c2.im * logR + c2.re * theta;
    const mag = Math.exp(realExp);
    const realPart = mag * Math.cos(imagExp);
    const imagPart = mag * Math.sin(imagExp);
    return new ComplexNumber(cleanFloat(realPart), cleanFloat(imagPart));
  }

  static sqrt(val: number): ComplexNumber {
    if (val >= 0) {
      return ComplexNumber.real(Math.sqrt(val));
    }
    const pos = -val;
    const root = Math.sqrt(pos);
    const isPerfect = Math.abs(Math.round(root) - root) < 1e-9 || Math.abs(Math.round(root * 100) - root * 100) < 1e-9;
    if (isPerfect) {
      return ComplexNumber.imag(root);
    }
    return new ComplexNumber(0, root, pos);
  }

  static root(radicand: ComplexNumber | number, index: ComplexNumber | number): ComplexNumber {
    const rad = typeof radicand === 'number' ? ComplexNumber.real(radicand) : radicand;
    const idx = typeof index === 'number' ? index : index.re;

    // Complex radicands:
    if (!rad.isReal()) {
      if (idx === 2) {
        return rad.pow(ComplexNumber.real(0.5));
      }
      if (idx > 2) {
        return new ComplexNumber(0, 0, undefined, undefined, { index: idx, radicand: rad });
      }
    }

    const radVal = rad.re;
    if (radVal >= 0) {
      return ComplexNumber.real(Math.pow(radVal, 1 / idx));
    }
    if (Math.floor(idx) === idx && idx % 2 !== 0) {
      return ComplexNumber.real(-Math.pow(-radVal, 1 / idx));
    }
    if (idx === 2) {
      return ComplexNumber.sqrt(radVal);
    }
    const pos = -radVal;
    const factor = Math.round(Math.pow(pos, 1 / idx) * 1e9) / 1e9;
    return new ComplexNumber(0, 0, undefined, { index: idx, factor });
  }
}

type ComplexOperatorFn = (a: ComplexNumber, b: ComplexNumber, onWarning?: (msg: string) => void) => ComplexNumber;
type ComplexFunctionFn = (inputs: ComplexNumber[], onWarning?: (msg: string) => void) => ComplexNumber;

function round15(n: number): number {
  if (Math.abs(n) < 1e-15) return 0;
  return parseFloat(n.toPrecision(15));
}

const OPERATORS = new Map<string, ComplexOperatorFn>([
  ['^', (a, b) => a.pow(b)],
  ['%', (a, b) => ComplexNumber.real(a.re % b.re)],
  [
    ':',
    (a, b, onWarning) => a.div(b, onWarning),
  ],
  [
    '/',
    (a, b, onWarning) => a.div(b, onWarning),
  ],
  ['*', (a, b) => a.mul(b)],
  ['-', (a, b) => a.sub(b)],
  ['+', (a, b) => a.add(b)],
  ['>', (a, b) => ComplexNumber.real(a.re > b.re ? 1 : 0)],
  ['<', (a, b) => ComplexNumber.real(a.re < b.re ? 1 : 0)],
  ['=', (a, b) => ComplexNumber.real(Math.abs(a.re - b.re) < 0.00000001 && Math.abs(a.im - b.im) < 0.00000001 ? 1 : 0)],
]);

const LOCAL_VARIABLES = new Map<string, number>([
  ['pi', 3.141592653589793],
  ['tao', 6.28318530717959],
  ['e', 2.718281828459045],
  ['phi', 1.61803398874989],
  ['major', 0.61803398874989],
  ['minor', 0.38196601125011],
  ['pitograd', 57.2957795130823],
  ['piofgrad', 0.01745329251994],
]);

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function cleanComplex(c: ComplexNumber): ComplexNumber {
  return new ComplexNumber(cleanFloat(c.re), cleanFloat(c.im), c.radicand, c.evenRoot, c.complexRoot);
}

function complexLn(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  const r = Math.hypot(x, y);
  if (r < 1e-15) {
    return new ComplexNumber(-Infinity, 0);
  }
  const theta = Math.atan2(y, x);
  return cleanComplex(new ComplexNumber(Math.log(r), theta));
}

function complexLog10(z: ComplexNumber): ComplexNumber {
  const lnZ = complexLn(z);
  return cleanComplex(new ComplexNumber(lnZ.re / Math.LN10, lnZ.im / Math.LN10));
}

function complexSqrt(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.sqrt(x);
  }
  const r = Math.hypot(x, y);
  const u = Math.sqrt((r + x) / 2);
  const v = Math.sign(y || 1) * Math.sqrt((r - x) / 2);
  return cleanComplex(new ComplexNumber(u, v));
}

function complexSin(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(round15(Math.sin(x)));
  }
  const re = Math.sin(x) * Math.cosh(y);
  const im = Math.cos(x) * Math.sinh(y);
  return cleanComplex(new ComplexNumber(re, im));
}

function complexCos(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(round15(Math.cos(x)));
  }
  const re = Math.cos(x) * Math.cosh(y);
  const im = -Math.sin(x) * Math.sinh(y);
  return cleanComplex(new ComplexNumber(re, im));
}

function complexTan(z: ComplexNumber, onWarning?: (msg: string) => void): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    const val = Math.abs(x);
    if (Math.abs(val - 1.5707963267949) < 1e-6 || Math.abs(val - 4.71238898038469) < 1e-6) {
      if (onWarning) onWarning('tan_undefined');
      return ComplexNumber.real(2 * Math.pow(10, 308));
    }
    return ComplexNumber.real(round15(Math.tan(x)));
  }
  const sinZ = complexSin(z);
  const cosZ = complexCos(z);
  return sinZ.div(cosZ, onWarning);
}

function complexSinDeg(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  return complexSin(new ComplexNumber(x * DEG_TO_RAD, y * DEG_TO_RAD));
}

function complexCosDeg(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  return complexCos(new ComplexNumber(x * DEG_TO_RAD, y * DEG_TO_RAD));
}

function complexTanDeg(z: ComplexNumber, onWarning?: (msg: string) => void): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    const val = Math.abs(x);
    if (Math.abs(val - 90) < 1e-6 || Math.abs(val - 270) < 1e-6) {
      if (onWarning) onWarning('tan_undefined');
      return ComplexNumber.real(2 * Math.pow(10, 308));
    }
    return ComplexNumber.real(round15(Math.tan(x * DEG_TO_RAD)));
  }
  return complexTan(new ComplexNumber(x * DEG_TO_RAD, y * DEG_TO_RAD), onWarning);
}

function complexSinh(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(Math.sinh(x));
  }
  const re = Math.sinh(x) * Math.cos(y);
  const im = Math.cosh(x) * Math.sin(y);
  return cleanComplex(new ComplexNumber(re, im));
}

function complexCosh(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(Math.cosh(x));
  }
  const re = Math.cosh(x) * Math.cos(y);
  const im = Math.sinh(x) * Math.sin(y);
  return cleanComplex(new ComplexNumber(re, im));
}

function complexTanh(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(Math.tanh(x));
  }
  const sinhZ = complexSinh(z);
  const coshZ = complexCosh(z);
  return sinhZ.div(coshZ);
}

function complexAsin(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12 && Math.abs(x) <= 1) {
    return ComplexNumber.real(Math.asin(x));
  }
  const iz = new ComplexNumber(-y, x);
  const z2 = new ComplexNumber(x * x - y * y, 2 * x * y);
  const oneMinusZ2 = new ComplexNumber(1 - z2.re, -z2.im);
  const sqrtTerm = complexSqrt(oneMinusZ2);
  const sum = iz.add(sqrtTerm);
  const lnTerm = complexLn(sum);
  return cleanComplex(new ComplexNumber(lnTerm.im, -lnTerm.re));
}

function complexAcos(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12 && Math.abs(x) <= 1) {
    return ComplexNumber.real(Math.acos(x));
  }
  const asinZ = complexAsin(z);
  return cleanComplex(new ComplexNumber(Math.PI / 2 - asinZ.re, -asinZ.im));
}

function complexAtan(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(Math.atan(x));
  }
  const iz = new ComplexNumber(-y, x);
  const oneMinusIz = new ComplexNumber(1 - iz.re, -iz.im);
  const onePlusIz = new ComplexNumber(1 + iz.re, iz.im);
  const ratio = oneMinusIz.div(onePlusIz);
  const lnRatio = complexLn(ratio);
  return cleanComplex(new ComplexNumber(-lnRatio.im / 2, lnRatio.re / 2));
}

function complexAsinDeg(z: ComplexNumber): ComplexNumber {
  const rad = complexAsin(z);
  return cleanComplex(new ComplexNumber(rad.re * RAD_TO_DEG, rad.im * RAD_TO_DEG));
}

function complexAcosDeg(z: ComplexNumber): ComplexNumber {
  const rad = complexAcos(z);
  return cleanComplex(new ComplexNumber(rad.re * RAD_TO_DEG, rad.im * RAD_TO_DEG));
}

function complexAtanDeg(z: ComplexNumber): ComplexNumber {
  const rad = complexAtan(z);
  return cleanComplex(new ComplexNumber(rad.re * RAD_TO_DEG, rad.im * RAD_TO_DEG));
}

function complexAsinh(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(Math.log(x + Math.sqrt(x * x + 1)));
  }
  const z2Plus1 = new ComplexNumber(x * x - y * y + 1, 2 * x * y);
  const sqrtTerm = complexSqrt(z2Plus1);
  const sum = z.add(sqrtTerm);
  return complexLn(sum);
}

function complexAcosh(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12 && x >= 1) {
    return ComplexNumber.real(Math.log(x + Math.sqrt(x * x - 1)));
  }
  const zMinus1 = new ComplexNumber(x - 1, y);
  const zPlus1 = new ComplexNumber(x + 1, y);
  const sqrt1 = complexSqrt(zMinus1);
  const sqrt2 = complexSqrt(zPlus1);
  const prod = sqrt1.mul(sqrt2);
  const sum = z.add(prod);
  return complexLn(sum);
}

function complexAtanh(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12 && Math.abs(x) < 1) {
    return ComplexNumber.real(Math.log((1 + x) / (1 - x)) * 0.5);
  }
  const onePlusZ = new ComplexNumber(1 + x, y);
  const oneMinusZ = new ComplexNumber(1 - x, -y);
  const ratio = onePlusZ.div(oneMinusZ);
  const lnRatio = complexLn(ratio);
  return cleanComplex(new ComplexNumber(lnRatio.re * 0.5, lnRatio.im * 0.5));
}

function complexExp(z: ComplexNumber): ComplexNumber {
  const { re: x, im: y } = z.toCartesian();
  if (Math.abs(y) < 1e-12) {
    return ComplexNumber.real(Math.exp(x));
  }
  const expX = Math.exp(x);
  const re = expX * Math.cos(y);
  const im = expX * Math.sin(y);
  return cleanComplex(new ComplexNumber(re, im));
}

const LOCAL_FUNCTIONS = new Map<string, ComplexFunctionFn>([
  ['abs', (inputs) => ComplexNumber.real(Math.hypot(inputs[0].toCartesian().re, inputs[0].toCartesian().im))],
  ['cos', (inputs) => complexCos(inputs[0])],
  ['cosh', (inputs) => complexCosh(inputs[0])],
  ['acos', (inputs) => complexAcos(inputs[0])],
  ['arccos', (inputs) => complexAcos(inputs[0])],
  ['sin', (inputs) => complexSin(inputs[0])],
  ['sinh', (inputs) => complexSinh(inputs[0])],
  ['asin', (inputs) => complexAsin(inputs[0])],
  ['arcsin', (inputs) => complexAsin(inputs[0])],
  ['tan', (inputs, onWarning) => complexTan(inputs[0], onWarning)],
  ['tanh', (inputs) => complexTanh(inputs[0])],
  ['atan', (inputs) => complexAtan(inputs[0])],
  ['arctan', (inputs) => complexAtan(inputs[0])],
  // DEG functions matching MathParser.cs
  ['ċos', (inputs) => complexCosDeg(inputs[0])],
  ['ċosh', (inputs) => complexCosh(inputs[0])],
  ['arcċos', (inputs) => complexAcosDeg(inputs[0])],
  ['arcċosh', (inputs) => complexAcosh(inputs[0])],
  ['arccosh', (inputs) => complexAcosh(inputs[0])],
  ['siɳ', (inputs) => complexSinDeg(inputs[0])],
  ['siɳh', (inputs) => complexSinh(inputs[0])],
  ['arcsiɳ', (inputs) => complexAsinDeg(inputs[0])],
  ['arcsiɳh', (inputs) => complexAsinh(inputs[0])],
  ['arcsinh', (inputs) => complexAsinh(inputs[0])],
  ['taɳ', (inputs, onWarning) => complexTanDeg(inputs[0], onWarning)],
  ['taɳh', (inputs) => complexTanh(inputs[0])],
  ['arctaŋ', (inputs) => complexAtanDeg(inputs[0])],
  ['arctaŋh', (inputs) => complexAtanh(inputs[0])],
  ['arctanh', (inputs) => complexAtanh(inputs[0])],
  ['sqrt', (inputs) => complexSqrt(inputs[0])],
  ['pow', (inputs) => inputs[0].pow(inputs[1])],
  ['root', (inputs) => ComplexNumber.root(inputs[0], inputs[1])],
  ['exp', (inputs) => complexExp(inputs[0])],
  [
    'log',
    (inputs) => {
      if (inputs.length === 1) return complexLog10(inputs[0]);
      if (inputs.length === 2) {
        const lnArg = complexLn(inputs[0]);
        const lnBase = complexLn(inputs[1]);
        return lnArg.div(lnBase);
      }
      return ComplexNumber.real(0);
    },
  ],
  ['ln', (inputs) => complexLn(inputs[0])],
]);

export class MathParser {
  private operators = OPERATORS;
  private localVariables = LOCAL_VARIABLES;
  private localFunctions = LOCAL_FUNCTIONS;
  public onWarning?: (msg: string) => void;

  constructor() {}

  private lexer(expr: string): string[] {
    let s = expr;
    s = s.replace(/\+-/g, '-');
    s = s.replace(/-\+/g, '-');
    s = s.replace(/--/g, '+');
    s = s.replace(/\+\+/g, '+');
    s = s.replace(/([*\/^:])\s*\+/g, '$1');

    const tokens: string[] = [];
    let token = '';

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];

      if (/\s/.test(ch)) continue;

      // Handle imaginary unit i / 𝐢 / 𝗶 / I
      if (ch === 'i' || ch === 'I' || ch === '\u{1D422}' || ch === '\u{1D5F6}') {
        if (
          i !== 0 &&
          (/\d/.test(s[i - 1]) ||
            s[i - 1] === ')' ||
            s[i - 1] === 'i' ||
            s[i - 1] === 'I' ||
            s[i - 1] === '\u{1D422}' ||
            s[i - 1] === '\u{1D5F6}' ||
            /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(s[i - 1]))
        ) {
          tokens.push('*');
        }
        tokens.push('i');
        continue;
      }

      if (/[a-zA-Z\u0080-\uFFFF]/.test(ch) && ch !== '.') {
        if (
          i !== 0 &&
          (/\d/.test(s[i - 1]) ||
            s[i - 1] === ')' ||
            s[i - 1] === 'i' ||
            s[i - 1] === 'I' ||
            s[i - 1] === '\u{1D422}' ||
            s[i - 1] === '\u{1D5F6}')
        ) {
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
        if (
          i !== 0 &&
          (s[i - 1] === ')' ||
            s[i - 1] === 'i' ||
            s[i - 1] === 'I' ||
            s[i - 1] === '\u{1D422}' ||
            s[i - 1] === '\u{1D5F6}' ||
            /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(s[i - 1]))
        ) {
          tokens.push('*');
        }
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
        if (
          i !== 0 &&
          (/\d/.test(s[i - 1]) ||
            s[i - 1] === ')' ||
            s[i - 1] === 'i' ||
            s[i - 1] === 'I' ||
            s[i - 1] === '\u{1D422}' ||
            s[i - 1] === '\u{1D5F6}')
        ) {
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

  public parse(mathExpression: string): ComplexNumber {
    const tokens = this.lexer(mathExpression);
    return this.mathParserLogic(tokens);
  }

  private mathParserLogic(initialTokens: string[]): ComplexNumber {
    const tokens: (string | ComplexNumber)[] = [...initialTokens];

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (typeof tok === 'string') {
        if (this.localVariables.has(tok)) {
          tokens[i] = ComplexNumber.real(this.localVariables.get(tok)!);
        } else if (tok === 'i' || tok === '\u{1D422}' || tok === '\u{1D5F6}') {
          tokens[i] = ComplexNumber.imag(1);
        }
      }
    }

    let loopGuard = 0;
    while (tokens.indexOf('(') !== -1) {
      loopGuard++;
      if (loopGuard > 5000) {
        throw new Error('Syntax Error');
      }
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
      let tmpResult: ComplexNumber;

      const functionName = open === 0 ? '' : typeof tokens[open - 1] === 'string' ? (tokens[open - 1] as string) : '';

      if (functionName && this.localFunctions.has(functionName)) {
        if (roughExpr.includes(',')) {
          const args: ComplexNumber[] = [];
          let currentArgTokens: (string | ComplexNumber)[] = [];
          for (let i = 0; i < roughExpr.length; i++) {
            if (roughExpr[i] === ',') {
              args.push(
                currentArgTokens.length === 0
                  ? ComplexNumber.real(0)
                  : this.basicArithmeticalExpression(currentArgTokens)
              );
              currentArgTokens = [];
            } else {
              currentArgTokens.push(roughExpr[i]);
            }
          }
          if (currentArgTokens.length > 0) {
            args.push(this.basicArithmeticalExpression(currentArgTokens));
          }
          tmpResult = this.localFunctions.get(functionName)!(args, this.onWarning);
        } else {
          const singleArg = this.basicArithmeticalExpression(roughExpr);
          tmpResult = this.localFunctions.get(functionName)!([singleArg], this.onWarning);
        }
      } else {
        tmpResult = this.basicArithmeticalExpression(roughExpr);
      }

      tokens[open] = tmpResult;
      tokens.splice(open + 1, close - open);

      if (functionName && this.localFunctions.has(functionName)) {
        tokens.splice(open - 1, 1);
      }
    }

    return this.basicArithmeticalExpression(tokens);
  }

  private basicArithmeticalExpression(tokens: (string | ComplexNumber)[]): ComplexNumber {
    if (tokens.length === 0) return ComplexNumber.real(0);

    const resolved: (string | ComplexNumber)[] = [];
    for (let k = 0; k < tokens.length; k++) {
      const tok = tokens[k];
      if (typeof tok !== 'string') {
        resolved.push(tok);
      } else if (tok === 'i' || tok === '\u{1D422}' || tok === '\u{1D5F6}') {
        resolved.push(ComplexNumber.imag(1));
      } else if (this.localVariables.has(tok)) {
        resolved.push(ComplexNumber.real(this.localVariables.get(tok)!));
      } else if (this.operators.has(tok)) {
        resolved.push(tok);
      } else if (tok === 'NaN') {
        resolved.push(new ComplexNumber(NaN, NaN));
      } else {
        const val = parseFloat(tok);
        if (isNaN(val)) throw new Error('Math Error');
        resolved.push(ComplexNumber.real(val));
      }
    }

    if (resolved.length === 1) {
      if (typeof resolved[0] !== 'string') return resolved[0];
      throw new Error('Syntax Error');
    }

    if (resolved.length === 2) {
      const op = resolved[0];
      if (op === '-' || op === '+') {
        const sign = op === '+' ? 1 : -1;
        const operand = resolved[1];
        if (typeof operand !== 'string') {
          return operand.mul(ComplexNumber.real(sign));
        }
      }
      throw new Error('Syntax Error');
    }

    const precedenceGroups = [
      ['^'],
      ['*', '/', ':', '%'],
      ['+', '-'],
      ['>', '<', '='],
    ];

    for (const group of precedenceGroups) {
      let i = 0;
      let opGuard = 0;
      while (i < resolved.length) {
        opGuard++;
        if (opGuard > 10000) {
          throw new Error('Syntax Error');
        }
        const token = resolved[i];
        if (typeof token === 'string' && group.includes(token)) {
          const op = token;
          const opFunc = this.operators.get(op);
          if (!opFunc) {
            i++;
            continue;
          }

          if (op === '-' && i === 0) {
            const rhs = resolved[i + 1];
            if (typeof rhs === 'string') throw new Error('Syntax Error');
            const res = opFunc(ComplexNumber.real(0), rhs, this.onWarning);
            resolved[0] = res;
            resolved.splice(i + 1, 1);
            continue;
          }

          if (i === 0 || i === resolved.length - 1) {
            throw new Error('Syntax Error');
          }

          const lhs = resolved[i - 1];
          const rhs = resolved[i + 1];

          if (typeof lhs === 'string' || typeof rhs === 'string') {
            throw new Error('Syntax Error');
          }

          const res = opFunc(lhs, rhs, this.onWarning);
          resolved[i - 1] = res;
          resolved.splice(i, 2);
          i--;
          continue;
        }
        i++;
      }
    }

    const finalVal = resolved[0];
    if (typeof finalVal !== 'string') return finalVal;
    throw new Error('Syntax Error');
  }
}

/**
 * Checks if an expression is mathematically incomplete
 * (e.g. ends in comma/point "1,", "4.", trailing operators "7,8+", "7,8/-", "78,5-",
 * dangling open parenthesis "log(", "tan(4)+arcotan(", empty parentheses "()",
 * or operator before closing parenthesis "(5+)").
 */
export function isIncompleteExpression(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return true;

  // Ends with comma or decimal point (e.g. "1,", "4.")
  if (/[,.]$/.test(trimmed)) return true;

  // Ends with math operator (e.g. "7,8+", "7,8/-", "78,5-", "4*", "2^", "45÷", "3:")
  if (/[+\-×*\/÷:^;]$/.test(trimmed)) return true;

  // Ends with open parenthesis (e.g. "log(", "tan(4)+arcotan(", "sin(")
  if (/\($/.test(trimmed)) return true;

  // Ends with root or exponent symbols needing operands (e.g. "√", "ª√", "EXP", "ε")
  if (trimmed.endsWith('ª√') || trimmed.endsWith('√') || trimmed.endsWith('EXP') || trimmed.endsWith('ε')) {
    return true;
  }

  // General root without prefix index
  if (/(^|[^0-9xyzw\)\%πe¹²³⁴⁰⁵⁶⁷⁸⁹.,])\s*ª√/.test(trimmed)) {
    return true;
  }

  // Empty parentheses (e.g. "()", "sin()", "log()")
  if (/\(\s*\)/.test(trimmed)) return true;

  // Operator immediately followed by closing parenthesis (e.g. "(7,8+)", "(2/)")
  if (/[+\-×*\/÷:^,.;]\s*\)/.test(trimmed)) return true;

  return false;
}

export const KNOWN_MATH_FUNCTIONS = new Set([
  // Arc hyperbolic
  'arcsinh', 'arccosh', 'arctanh', 'asinh', 'acosh', 'atanh',
  'arcsh', 'arcch', 'arcth', 'ash', 'ach', 'ath',
  // Arc trig
  'arcsin', 'arccos', 'arctan', 'arcsen', 'arcotan',
  'arcco', 'arcsn', 'arctn', 'arcc', 'arcs', 'arct',
  'asin', 'asen', 'acos', 'atan', 'aco', 'asn', 'atn',
  'ac', 'as', 'at',
  // Hyperbolic
  'sinh', 'cosh', 'tanh', 'sh', 'ch', 'th',
  // Direct trig
  'sin', 'sen', 'cos', 'tan', 'sn', 'co', 'tn', 's', 'c', 't',
  // Log
  'log', 'ln', 'l',
  // Sqrt, root & exp
  'sqrt', 'root', 'exp',
  // DEG mode substitutions
  'siɳ', 'ċos', 'taɳ', 'ctaŋ', 'siɳh', 'ċosh', 'taɳh',
  'arcsiɳ', 'arcċos', 'arctaŋ', 'arcsiɳh', 'arcċosh', 'arctaŋh'
]);

export const KNOWN_VARIABLES_AND_CONSTANTS = new Set([
  'x', 'y', 'z', 'w', 'e', 'i', 'I', 'pi', 'EXP'
]);

const FOREIGN_CHARS_REGEX = /[¿?¡!@#$&_~"'{}[\]\\|áéíóúñÁÉÍÓÚÑ]/;

/**
 * Checks if an expression has NO real mathematical content or contains invalid words/non-math text
 * (e.g. "hola, ¿cómo estás?", "6tan(6sjdlsjdlsjdlsatan(6))", "hello world", "test").
 */
export function isMathErrorExpression(expr: string, _settings?: CalculatorSettings): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;

  // 1. Foreign characters check (e.g. ¿, ?, ¡, !, accents like ó, á, punctuation like #, $, etc.)
  if (FOREIGN_CHARS_REGEX.test(trimmed)) {
    return true;
  }

  // 2. Extract strictly alphabetic words
  const words = trimmed.match(/[a-zA-Z]+/g) || [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (KNOWN_MATH_FUNCTIONS.has(lower) || KNOWN_MATH_FUNCTIONS.has(w)) continue;
    if (KNOWN_VARIABLES_AND_CONSTANTS.has(w) || KNOWN_VARIABLES_AND_CONSTANTS.has(lower)) continue;

    // Sequence of variables / constants e.g. 'xy', 'xi', 'zw'
    if (/^[xyzw e i I]+$/i.test(w)) continue;

    // Unrecognized word / identifier that is not a valid mathematical function or variable
    return true;
  }

  return false;
}

/**
 * Checks if a mathematical expression contains syntax errors (missing operands, invalid operators, etc.)
 */
export function isSyntaxError(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;

  // 1. Incomplete ending: ends with operator or unclosed symbol
  if (/[+\-×÷*/^:ε,.;]$/.test(trimmed) || trimmed.endsWith('EXP') || trimmed.endsWith('ª√') || trimmed.endsWith('√')) {
    return true;
  }

  // 2. Incomplete general root index or prefix:
  if (/(^|[^0-9xyzw\)\%πe¹²³⁴⁰⁵⁶⁷⁸⁹])\s*ª√/.test(trimmed)) {
    return true;
  }

  // 3. Empty parentheses or empty function call:
  if (/\(\s*\)/.test(trimmed)) {
    return true;
  }

  // 4. Operator immediately before closing parenthesis:
  if (/[+\-×÷*/^:ε,.;]\s*\)/.test(trimmed)) {
    return true;
  }

  // 5. Invalid operator immediately after open parenthesis:
  if (/\(\s*[*×/÷^:;]/.test(trimmed)) {
    return true;
  }

  // 6. Two consecutive binary operators that are not allowed:
  if (/[*×/÷^:]\s*[*×/÷^:]/.test(trimmed)) {
    return true;
  }
  if (/[+\-]\s*[*×/÷^:]/.test(trimmed)) {
    return true;
  }
  if (/[*×/÷^:]\s*[+\-]{2,}/.test(trimmed)) {
    return true;
  }
  if (/[+\-]{3,}/.test(trimmed)) {
    return true;
  }

  // 7. EXP / ε followed by invalid tokens:
  if (/(ε|EXP)\s*[^0-9+\-]/.test(trimmed)) {
    return true;
  }
  if (/(ε|EXP)\s*[+\-]\s*[^0-9]/.test(trimmed)) {
    return true;
  }

  // 8. Multiple commas/decimals in a single number:
  const tokens = trimmed.split(/[\(\)\+\-\*\/×÷\^:;%]/);
  for (const tok of tokens) {
    const cleanTok = tok.trim();
    if (!cleanTok) continue;
    const commas = (cleanTok.match(/[,.]/g) || []).length;
    if (commas > 1) {
      return true;
    }
    if (cleanTok === ',' || cleanTok === '.') {
      return true;
    }
  }

  return false;
}

export interface EvaluationResult {
  result: string;
  isError: boolean;
  isSyntaxError?: boolean;
  isMathError?: boolean;
  errorMessage?: string;
  rawComplex?: ComplexNumber;
  unassignedVars?: ('x' | 'y' | 'z' | 'w')[];
}

/**
 * Main evaluation pipeline adhering to eCalculator.xaml.cs logic
 */
/**
 * Automatically balances missing initial or final parentheses in a mathematical expression.
 */
export function balanceParentheses(expr: string): string {
  let missingOpen = 0;
  let depth = 0;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      if (depth > 0) {
        depth--;
      } else {
        missingOpen++;
      }
    }
  }

  const missingClose = depth;
  return '('.repeat(missingOpen) + expr + ')'.repeat(missingClose);
}

const SUPERSCRIPT_ROOT_DIGITS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
};

function extractIndexBefore(text: string, pos: number): { indexExpr: string; startIndex: number } | null {
  let end = pos - 1;
  while (end >= 0 && /\s/.test(text[end])) {
    end--;
  }
  if (end < 0) return null;

  // Si termina con ')', buscar su '(' correspondiente hacia atrás
  if (text[end] === ')') {
    let depth = 1;
    let start = end - 1;
    while (start >= 0) {
      if (text[start] === ')') depth++;
      else if (text[start] === '(') {
        depth--;
        if (depth === 0) break;
      }
      start--;
    }
    if (depth === 0) {
      return {
        indexExpr: text.slice(start, end + 1),
        startIndex: start,
      };
    }
  }

  // Si es un número (dígitos, punto o coma decimal): ej. "4", "2.5", "2,5"
  if (/[\d.,]/.test(text[end])) {
    let start = end;
    while (start >= 0 && /[\d.,]/.test(text[start])) {
      start--;
    }
    return {
      indexExpr: text.slice(start + 1, end + 1),
      startIndex: start + 1,
    };
  }

  // Si es una variable o símbolo: ej. 'x', 'y', 'z', 'w', 'π', 'e' o superíndice
  if (/[a-zA-Z\u0080-\uFFFF]/.test(text[end])) {
    let start = end;
    while (start >= 0 && /[a-zA-Z0-9\u0080-\uFFFF]/.test(text[start])) {
      start--;
    }
    let rawIdx = text.slice(start + 1, end + 1);
    rawIdx = rawIdx.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_ROOT_DIGITS[ch] || ch);
    return {
      indexExpr: rawIdx,
      startIndex: start + 1,
    };
  }

  return null;
}

function extractRadicandAfter(text: string, openParenPos: number): { radicandExpr: string; endIndex: number } | null {
  let depth = 1;
  let i = openParenPos + 1;
  while (i < text.length) {
    if (text[i] === '(') {
      depth++;
    } else if (text[i] === ')') {
      depth--;
      if (depth === 0) {
        return {
          radicandExpr: text.slice(openParenPos + 1, i),
          endIndex: i, // índice del ')' de cierre
        };
      }
    }
    i++;
  }
  return null;
}

export function convertGeneralRoots(expr: string): string {
  let s = expr;
  let loopGuard = 0;
  while (s.includes('ª√(') && loopGuard < 100) {
    loopGuard++;
    const pos = s.lastIndexOf('ª√(');
    if (pos === -1) break;

    const before = extractIndexBefore(s, pos);
    const after = extractRadicandAfter(s, pos + 2); // pos + 2 es '('

    if (!before || !after) {
      break;
    }

    const replacement = `root(${after.radicandExpr};${before.indexExpr})`;
    s = s.slice(0, before.startIndex) + replacement + s.slice(after.endIndex + 1);
  }

  // Support roots formatted as 4√(-16) or 3√(-8) when preceded directly by index >= 3
  loopGuard = 0;
  while (s.includes('√(') && loopGuard < 100) {
    loopGuard++;
    const match = /(^|[^0-9xyzw\)\%πe¹²³⁴⁰⁵⁶⁷⁸⁹.,])([0-9⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*√\(/.exec(s);
    if (!match) break;
    const prefix = match[1];
    const rawDigits = match[2];
    const indexDigits = rawDigits.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_ROOT_DIGITS[ch] || ch);
    const idxVal = parseInt(indexDigits, 10);
    if (idxVal < 3) {
      break;
    }
    const matchStart = match.index + prefix.length;
    const pos = s.indexOf('√(', matchStart);
    if (pos === -1) break;
    const after = extractRadicandAfter(s, pos + 1);
    if (!after) break;

    const replacement = `root(${after.radicandExpr};${indexDigits})`;
    s = s.slice(0, matchStart) + replacement + s.slice(after.endIndex + 1);
  }

  return s;
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
};

export function toSuperscriptStr(num: number): string {
  return num.toString().split('').map((d) => SUPERSCRIPT_MAP[d] || d).join('');
}

function formatReal(val: number, settings: CalculatorSettings, decimalPlacesOverride?: number): string {
  if (Math.abs(val) < 1e-12) return '0';
  const decimals = decimalPlacesOverride !== undefined ? decimalPlacesOverride : settings.decimalPlaces;
  let s = '';
  if (val.toString().includes('e') || val.toString().includes('E')) {
    if (decimalPlacesOverride !== undefined) {
      s = val.toExponential(decimals);
    } else {
      s = val.toString();
    }
    s = s.replace(/e\+?/i, 'ε');
  } else {
    const factor = Math.pow(10, decimals);
    let rounded = Math.round(val * factor) / factor;
    s = rounded.toString();
  }
  s = s.replace(/\./g, ',');
  return s;
}

export function formatComplexResult(
  c: ComplexNumber,
  settings: CalculatorSettings,
  decimalPlacesOverride?: number
): string {
  const boldI = '\u{1D422}';

  // Roots > 2 of complex numbers: e.g. 3ª√(4i) -> ³√(4) × ³√(i)
  if (c.complexRoot) {
    const idx = c.complexRoot.index;
    const sup = toSuperscriptStr(idx);
    const rad = c.complexRoot.radicand;

    // Pure imaginary radicand: b*i
    if (rad.isImag() || (Math.abs(rad.im) >= 1e-12 && Math.abs(rad.re) < 1e-12)) {
      const b = rad.im;
      const absB = Math.abs(b);
      const iUnit = b < 0 ? `-${boldI}` : boldI;
      if (Math.abs(absB - 1) < 1e-12) {
        return `${sup}√(${iUnit})`;
      }
      const bStr = formatReal(absB, settings, decimalPlacesOverride);
      return `${sup}√(${bStr}) × ${sup}√(${iUnit})`;
    }

    // General complex radicand: a + bi
    const innerStr = formatComplexResult(rad, settings, decimalPlacesOverride);
    return `${sup}√(${innerStr})`;
  }

  // Even root of negative number: factor × ⁿ√(-1)
  if (c.evenRoot) {
    const f = c.evenRoot.factor;
    const sup = toSuperscriptStr(c.evenRoot.index);
    if (Math.abs(f - 1) < 1e-9) {
      return `${sup}√(-1)`;
    }
    return `${formatReal(f, settings, decimalPlacesOverride)} × ${sup}√(-1)`;
  }

  const isZeroRe = Math.abs(c.re) < 1e-12;
  const isZeroIm = Math.abs(c.im) < 1e-12 && !c.radicand;

  if (isZeroIm) {
    return formatReal(c.re, settings, decimalPlacesOverride);
  }

  if (isZeroRe) {
    if (c.radicand) {
      const sign = c.im < 0 ? '-' : '';
      const rawFactor = Math.abs(c.im) / Math.sqrt(c.radicand);
      if (Math.abs(rawFactor - 1) < 1e-9) {
        return `${sign}√${c.radicand}${boldI}`;
      }
      return `${sign}${formatReal(rawFactor, settings, decimalPlacesOverride)} × √${c.radicand}${boldI}`;
    }
    if (Math.abs(c.im - 1) < 1e-12) {
      return boldI;
    }
    if (Math.abs(c.im - (-1)) < 1e-12) {
      return `-${boldI}`;
    }
    return `${formatReal(c.im, settings, decimalPlacesOverride)}${boldI}`;
  }

  // Both real and imaginary parts present: R + bi or R - bi
  const reStr = formatReal(c.re, settings, decimalPlacesOverride);
  if (c.radicand) {
    const rawFactor = Math.abs(c.im) / Math.sqrt(c.radicand);
    const factorStr = Math.abs(rawFactor - 1) < 1e-9 ? '' : `${formatReal(rawFactor, settings, decimalPlacesOverride)} × `;
    if (c.im >= 0) {
      return `${reStr} + ${factorStr}√${c.radicand}${boldI}`;
    } else {
      return `${reStr} - ${factorStr}√${c.radicand}${boldI}`;
    }
  }

  if (Math.abs(c.im - 1) < 1e-12) {
    return `${reStr} + ${boldI}`;
  }
  if (Math.abs(c.im - (-1)) < 1e-12) {
    return `${reStr} - ${boldI}`;
  }
  if (c.im > 0) {
    return `${reStr} + ${formatReal(c.im, settings, decimalPlacesOverride)}${boldI}`;
  } else {
    return `${reStr} - ${formatReal(Math.abs(c.im), settings, decimalPlacesOverride)}${boldI}`;
  }
}

function findTopLevelDivisionByZero(expr: string): { numeratorExpr: string; denominatorExpr: string } | null {
  let depth = 0;
  let lastSlashIdx = -1;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && (ch === '/' || ch === '÷' || ch === ':')) {
      lastSlashIdx = i;
    }
  }
  if (lastSlashIdx === -1) return null;

  const numPart = expr.slice(0, lastSlashIdx).trim();
  const denPart = expr.slice(lastSlashIdx + 1).trim();
  if (!numPart || !denPart) return null;

  return { numeratorExpr: numPart, denominatorExpr: denPart };
}

const REGEX_ADJACENT_VARS = /([xyzw])\s*(?=[xyzw])/gi;
const REGEX_NUM_BEFORE_VAR = /([0-9])\s*(?=[xyzw])/gi;
const REGEX_VAR_BEFORE_NUM = /([xyzw])\s*(?=[0-9])/gi;
const REGEX_VAR_BEFORE_OPEN_PAREN = /([xyzw])\s*(?=\()/gi;
const REGEX_CLOSE_PAREN_BEFORE_VAR = /\)\s*(?=[xyzw])/gi;

export function expandVariableImplicitProducts(expr: string): string {
  return expr
    .replace(REGEX_ADJACENT_VARS, '$1*')
    .replace(REGEX_NUM_BEFORE_VAR, '$1*')
    .replace(REGEX_VAR_BEFORE_NUM, '$1*')
    .replace(REGEX_VAR_BEFORE_OPEN_PAREN, '$1*')
    .replace(REGEX_CLOSE_PAREN_BEFORE_VAR, ')*');
}

export function getVariablesInExpr(expr: string): Set<'x' | 'y' | 'z' | 'w'> {
  const vars = new Set<'x' | 'y' | 'z' | 'w'>();
  const inOrder = getVariablesInOrder(expr);
  for (const v of inOrder) {
    vars.add(v);
  }
  return vars;
}

const KNOWN_FUNCS_FOR_ORDER: string[] = [
  'arcsinh', 'arccosh', 'arctanh', 'asinh', 'acosh', 'atanh',
  'arcsh', 'arcch', 'arcth', 'ash', 'ach', 'ath',
  'arcsin', 'arccos', 'arctan', 'arcsen', 'arcotan',
  'arcco', 'arcsn', 'arctn', 'arcc', 'arcs', 'arct',
  'asin', 'asen', 'acos', 'atan', 'aco', 'asn', 'atn',
  'ac', 'as', 'at',
  'sinh', 'cosh', 'tanh', 'sh', 'ch', 'th',
  'sin', 'sen', 'cos', 'tan', 'sn', 'co', 'tn',
  'log', 'ln',
  'sqrt', 'root', 'exp'
].sort((a, b) => b.length - a.length);

const REGEX_KNOWN_FUNCS_FOR_ORDER = new RegExp(KNOWN_FUNCS_FOR_ORDER.join('|'), 'gi');

export function getVariablesInOrder(expr: string): ('x' | 'y' | 'z' | 'w')[] {
  let s = expandVariableImplicitProducts(expr || '');
  s = s.replace(REGEX_KNOWN_FUNCS_FOR_ORDER, (match) => ' '.repeat(match.length));

  const result: ('x' | 'y' | 'z' | 'w')[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < s.length; i++) {
    const ch = s[i].toLowerCase();
    if (ch === 'x' || ch === 'y' || ch === 'z' || ch === 'w') {
      const prev = i > 0 ? s[i - 1] : '';
      const next = i + 1 < s.length ? s[i + 1] : '';
      if (!/[a-zA-Z]/.test(prev) && !/[a-zA-Z]/.test(next)) {
        if (!seen.has(ch)) {
          seen.add(ch);
          result.push(ch as ('x' | 'y' | 'z' | 'w'));
        }
      }
    }
  }

  return result;
}

export function hasCycleOrSelfReference(
  targetVar: 'x' | 'y' | 'z' | 'w',
  exprToSave: string,
  settings: CalculatorSettings
): boolean {
  const directVars = getVariablesInExpr(exprToSave);
  if (directVars.has(targetVar)) {
    return true;
  }

  const hypothetical: Record<'x' | 'y' | 'z' | 'w', string> = {
    x: targetVar === 'x' ? exprToSave : settings.x || '',
    y: targetVar === 'y' ? exprToSave : settings.y || '',
    z: targetVar === 'z' ? exprToSave : settings.z || '',
    w: targetVar === 'w' ? exprToSave : settings.w || '',
  };

  const visited = new Set<'x' | 'y' | 'z' | 'w'>();
  const queue: ('x' | 'y' | 'z' | 'w')[] = Array.from(directVars);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetVar) {
      return true;
    }
    if (!visited.has(current)) {
      visited.add(current);
      const expr = hypothetical[current];
      if (expr) {
        const nextVars = getVariablesInExpr(expr);
        for (const nv of nextVars) {
          if (nv === targetVar) {
            return true;
          }
          if (!visited.has(nv)) {
            queue.push(nv);
          }
        }
      }
    }
  }

  return false;
}

export function resolveVariablesRecursively(
  expr: string,
  settings: CalculatorSettings,
  maxDepth = 25
): {
  resolved: string;
  hasCycle?: boolean;
  hasUnassigned?: boolean;
  missingVar?: string;
  unassignedVars?: ('x' | 'y' | 'z' | 'w')[];
} {
  let current = expandVariableImplicitProducts(expr);
  let depth = 0;

  const unassignedList: ('x' | 'y' | 'z' | 'w')[] = [];
  const unassignedSet = new Set<'x' | 'y' | 'z' | 'w'>();

  // Check all unassigned variables directly present in the initial expression in order
  const initialVars = getVariablesInOrder(expr);
  for (const v of initialVars) {
    const val = settings[v];
    if (!val || !val.trim()) {
      if (!unassignedSet.has(v)) {
        unassignedSet.add(v);
        unassignedList.push(v);
      }
    }
  }

  if (unassignedList.length > 0) {
    return {
      resolved: current,
      hasUnassigned: true,
      missingVar: unassignedList[0],
      unassignedVars: unassignedList,
    };
  }

  while (depth < maxDepth) {
    current = expandVariableImplicitProducts(current);
    const foundVars = getVariablesInOrder(current);
    if (foundVars.length === 0) {
      return { resolved: current };
    }

    let replacedAny = false;
    for (const v of foundVars) {
      const val = settings[v];
      if (!val || !val.trim()) {
        if (!unassignedSet.has(v)) {
          unassignedSet.add(v);
          unassignedList.push(v);
        }
      } else {
        const regex = new RegExp(`(?<![a-zA-Z])${v}(?![a-zA-Z])`, 'gi');
        current = current.replace(regex, `(${val})`);
        replacedAny = true;
      }
    }

    if (unassignedList.length > 0) {
      return {
        resolved: current,
        hasUnassigned: true,
        missingVar: unassignedList[0],
        unassignedVars: unassignedList,
      };
    }

    if (!replacedAny) {
      break;
    }
    depth++;
  }

  return { resolved: current, hasCycle: true };
}

export function evaluateExpression(
  expression: string,
  settings: CalculatorSettings,
  onWarning?: (type: string) => void,
  isSubEval = false
): EvaluationResult {
  let temp = expression.trim();
  if (!temp) {
    return { result: '', isError: false };
  }

  // 1. Balance parentheses (missing initial or final)
  temp = balanceParentheses(temp);

  // 1b. Handle implicit multiplication for variables (xy -> x*y, 2x -> 2*x, etc.)
  temp = expandVariableImplicitProducts(temp);

  // 1c. Handle implicit multiplication after closing parenthesis
  temp = temp
    .replace(/\)\s*(sin|cos|tan|log|ln|sinh|cosh|tanh|asin|acos|atan|sqrt|√|ª√|π|e|i|\u{1D422}|\u{1D5F6}|[0-9xyzw])/gu, (_, p1) => ')*' + p1);

  // 1c. Check if expression has NO real mathematical content or invalid non-math words (Math Error)
  if (isMathErrorExpression(expression, settings)) {
    return {
      result: 'Math Error',
      isError: true,
      isSyntaxError: false,
      isMathError: true,
      errorMessage: 'Math Error',
    };
  }

  // Detect syntax errors (e.g. "9-", "e^", "2ε", "sin()")
  if (isSyntaxError(temp)) {
    return {
      result: 'Sys Error',
      isError: true,
      isSyntaxError: true,
      errorMessage: 'La expresión es incorrecta.',
    };
  }

  // 2. Recursively resolve variables x, y, z, w with stored values and cycle detection
  const varResolution = resolveVariablesRecursively(temp, settings);
  if (varResolution.hasCycle || varResolution.hasUnassigned) {
    return {
      result: 'Sys Error',
      isError: true,
      isSyntaxError: true,
      errorMessage: 'La expresión es incorrecta.',
      unassignedVars: varResolution.unassignedVars,
    };
  }
  temp = varResolution.resolved;

  // 3. Handle general roots: e.g. "4ª√(15+1)" -> 2, "3ª√(8)" -> 2, "3ª√(-8)" -> -2, "4√(-16)" -> root(-16;4)
  temp = convertGeneralRoots(temp);

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
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (match) => {
      const numStr = match.split('').map((ch) => SUPERSCRIPT_ROOT_DIGITS[ch] || ch).join('');
      return '^(' + numStr + ')';
    })
    .replace(/μ/g, '*10^-6')
    .replace(/√\(/g, 'sqrt(')
    .replace(/√([0-9.]+)/g, 'sqrt($1)');

  // Normalize imaginary unit characters
  temp = temp
    .replace(/\u{1D422}|\u{1D5F6}/gu, 'i')
    .replace(/I/g, 'i');

  // Handle unary minus on imaginary terms preceded by operators, parenthesis, comma, or start of expression:
  // e.g. "4i/-2i" -> "4i/(-2*i)", "4i/-i" -> "4i/(-1*i)", "-.4i" -> "(-.4*i)"
  temp = temp.replace(
    /(^|[*\/^:(,])\s*-\s*((?:[0-9]*\.[0-9]+|[0-9]+))\s*i((?:\^(?:\([0-9.]+\)|[0-9]+))?)/g,
    '$1(-$2*i$3)'
  );
  temp = temp.replace(
    /(^|[*\/^:(,])\s*-\s*i((?:\^(?:\([0-9.]+\)|[0-9]+))?)/g,
    '$1(-1*i$2)'
  );

  // Group implicit coefficients with imaginary unit i into parenthesized sub-expressions:
  // e.g. "22i" -> "(22*i)", ".4i" -> "(.4*i)", "2i^(2)" -> "(2*i^(2))", "4i/2i" -> "(4*i)/(2*i)"
  temp = temp.replace(
    /((?:[0-9]*\.[0-9]+|[0-9]+))\s*i((?:\^(?:\([0-9.]+\)|[0-9]+))?)/g,
    '($1*i$2)'
  );

  temp = temp
    .replace(/\)\s*i/g, ')*i')
    .replace(/i\s*\(/g, 'i*(')
    .replace(/i\s*([0-9])/g, 'i*$1');

  // Unary sign fixups
  temp = temp.replace(/([*\/^:])\s*\+/g, '$1');
  temp = temp.replace(/\(\s*\+/g, '(');
  temp = temp.replace(/^\s*\+/, '');
  temp = temp.replace(/\+\+/g, '+');

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
    const val = parser.parse(temp);

    if (isNaN(val.re) || isNaN(val.im)) {
      return { result: 'NaN', isError: true, isSyntaxError: false, errorMessage: 'NaN' };
    }

    if (!isFinite(val.re) || !isFinite(val.im)) {
      let isNeg = val.re < 0 || (val.re <= 0 && val.im < 0);

      if (!isSubEval) {
        const topDiv = findTopLevelDivisionByZero(expression);
        if (topDiv) {
          const denRes = evaluateExpression(topDiv.denominatorExpr, settings, undefined, true);
          const isDenZero = denRes.result === '0' || (denRes.rawComplex && denRes.rawComplex.isZero());
          if (isDenZero) {
            const numRes = evaluateExpression(topDiv.numeratorExpr, settings, undefined, true);
            const isNumZero = numRes.result === '0' || (numRes.rawComplex && numRes.rawComplex.isZero());
            if (isNumZero) {
              isNeg = false;
            } else if (numRes.rawComplex) {
              const raw = numRes.rawComplex;
              isNeg = raw.re < -1e-12 || (Math.abs(raw.re) <= 1e-12 && raw.im < -1e-12);
            }
          }
        }
      }

      return {
        result: isNeg ? '-Infinito' : 'Infinito',
        isError: true,
        errorMessage: isNeg ? '-Infinito' : 'Infinito',
        rawComplex: new ComplexNumber(isNeg ? -Infinity : Infinity, 0),
      };
    }

    const strVal = formatComplexResult(val, settings);
    return { result: strVal, isError: false, rawComplex: val };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const isSyntax = msg.includes('Syntax Error') || isSyntaxError(temp) || isSyntaxError(expression);
    if (isSyntax) {
      return {
        result: 'Sys Error',
        isError: true,
        isSyntaxError: true,
        errorMessage: 'La expresión es incorrecta.',
      };
    }
    if (msg.includes('Math Error') || isMathErrorExpression(expression, settings)) {
      return {
        result: 'Math Error',
        isError: true,
        isSyntaxError: false,
        isMathError: true,
        errorMessage: 'Math Error',
      };
    }
    return {
      result: 'Sys Error',
      isError: true,
      isSyntaxError: true,
      errorMessage: 'La expresión es incorrecta.',
    };
  }
}
