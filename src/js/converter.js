/*
Assigned to: Doctora, Justin - DPD Converter
Purpose: Responsible for all IEEE-754 Decimal64 encoding and decoding.
         - Parses raw base-10 strings and encodes them into Densely Packed Decimal (DPD).
         - Evaluates the 5-bit Combination Field and 10-bit declet conversions.
         - Unpacks 16-character hexadecimal strings into sign, exponent, and significand.
         - Instantly traps and flags special cases: ±Infinity, ±Zero, and NaN.
*/

function bcdToDpd(d1, d2, d3) {
  const a = (d1 >> 3) & 1;
  const b = (d1 >> 2) & 1;
  const c = (d1 >> 1) & 1;
  const d = d1 & 1;

  const e = (d2 >> 3) & 1;
  const f = (d2 >> 2) & 1;
  const g = (d2 >> 1) & 1;
  const h = d2 & 1;

  const i = (d3 >> 3) & 1;
  const j = (d3 >> 2) & 1;
  const k = (d3 >> 1) & 1;
  const m = d3 & 1;

  let p, q, r, s, t, u, v, w, x, y;

  if (a === 0 && e === 0 && i === 0) {
    p = b; q = c; r = d;
    s = f; t = g; u = h;
    v = 0; w = j; x = k; y = m;
  } else if (a === 0 && e === 0 && i === 1) {
    p = b; q = c; r = d;
    s = f; t = g; u = h;
    v = 1; w = 0; x = 0; y = m;
  } else if (a === 0 && e === 1 && i === 0) {
    p = b; q = c; r = d;
    s = j; t = k; u = h;
    v = 1; w = 0; x = 1; y = m;
  } else if (a === 0 && e === 1 && i === 1) {
    p = b; q = c; r = d;
    s = 1; t = 0; u = h;
    v = 1; w = 1; x = 1; y = m;
  } else if (a === 1 && e === 0 && i === 0) {
    p = j; q = k; r = d;
    s = f; t = g; u = h;
    v = 1; w = 1; x = 0; y = m;
  } else if (a === 1 && e === 0 && i === 1) {
    p = j; q = k; r = d;
    s = 1; t = 1; u = h;
    v = 1; w = 1; x = 1; y = m;
  } else if (a === 1 && e === 1 && i === 0) {
    p = f; q = g; r = d;
    s = 0; t = 1; u = h;
    v = 1; w = 1; x = 1; y = m;
  } else {
    p = 0; q = 0; r = d;
    s = 1; t = 1; u = h;
    v = 1; w = 1; x = 1; y = m;
  }

  return (
    (p << 9) | (q << 8) | (r << 7) | (s << 6) | (t << 5) |
    (u << 4) | (v << 3) | (w << 2) | (x << 1) | y
  );
}

function roundSignificantDigits(digits, precision) {
  if (digits.length <= precision) return { digits: digits, carry: false };

  const kept = digits.slice(0, precision);
  const firstDiscarded = Number(digits[precision]);
  let roundUp = false;

  if (firstDiscarded > 5) {
    roundUp = true;
  } else if (firstDiscarded < 5) {
    roundUp = false;
  } else {
    const hasNonZeroAfter5 = /[1-9]/.test(digits.slice(precision + 1));
    if (hasNonZeroAfter5) {
      roundUp = true;
    } else {
      const lastKeptDigit = Number(kept[kept.length - 1]);
      roundUp = (lastKeptDigit % 2 === 1);
    }
  }

  if (!roundUp) return { digits: kept, carry: false };
  
  const arr = kept.split('').map(Number);
  let carry = 1;

  for (let i = arr.length - 1; i >= 0 && carry; i--) {
    arr[i] += carry;
    if (arr[i] === 10) {
      arr[i] = 0;
      carry = 1;
    } else {
      carry = 0;
    }
  }
  
  if (carry) return { digits: '1' + '0'.repeat(precision - 1), carry: true };
  return { digits: arr.join(''), carry: false };
}

function parseDecimalString(str) {
  let exponent = 0;
  const eIndex = str.search(/[eE]/);

  if (eIndex !== -1) {
    const exponentPart = str.slice(eIndex + 1);
    str = str.slice(0, eIndex);
    if (!/^[+-]?\d+$/.test(exponentPart)) throw new Error('Invalid exponent.');
    exponent = parseInt(exponentPart, 10);
  }

  let integerPart, fractionalPart;
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length !== 2) throw new Error('Invalid decimal format.');
    integerPart = parts[0];
    fractionalPart = parts[1];
  } else {
    integerPart = str;
    fractionalPart = '';
  }

  if (integerPart === '') integerPart = '0';
  if (!/^\d+$/.test(integerPart)) throw new Error('Invalid integer portion.');
  if (fractionalPart !== '' && !/^\d+$/.test(fractionalPart)) throw new Error('Invalid fractional portion.');

  const allDigits = integerPart + fractionalPart;
  exponent -= fractionalPart.length;

  return { digits: allDigits, exponent: exponent };
}

function encodeDecimal64(rawInput) {
  let original = String(rawInput).trim();
  if (original === '') throw new Error('Input cannot be empty.');

  let signBit = '0';
  let str = original;

  if (str.startsWith('-')) {
    signBit = '1';
    str = str.slice(1);
  } else if (str.startsWith('+')) {
    str = str.slice(1);
  }

  const upper = str.toUpperCase();
  if (upper === 'NAN') {
    const binarySpaced = `${signBit} 11111 00000000 0000000000 0000000000 0000000000 0000000000 0000000000`;
    return { type: 'NaN', binary: binarySpaced, hex: signBit === '1' ? 'FC00000000000000' : '7C00000000000000' };
  }

  if (upper === 'INF' || upper === 'INFINITY') {
    const binarySpaced = `${signBit} 11110 00000000 0000000000 0000000000 0000000000 0000000000 0000000000`;
    return { type: 'Infinity', binary: binarySpaced, hex: signBit === '1' ? 'F800000000000000' : '7800000000000000' };
  }

  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(str)) throw new Error(`Invalid decimal input: ${original}`);

  let parsed = parseDecimalString(str);
  let digits = parsed.digits;
  let exponent = parsed.exponent;

  if (/^0+$/.test(digits)) {
    const binarySpaced = `${signBit} 00000 00000000 0000000000 0000000000 0000000000 0000000000 0000000000`;
    return { type: signBit === '1' ? '-0' : '+0', binary: binarySpaced, hex: signBit === '1' ? '8000000000000000' : '0000000000000000' };
  }

  const leadingZeros = digits.match(/^0*/)[0].length;
  if (leadingZeros > 0) {
    digits = digits.slice(leadingZeros);
    exponent -= leadingZeros;
  }

  const rounded = roundSignificantDigits(digits, 16);
  digits = rounded.digits;
  if (rounded.carry) exponent += 1;

  while (digits.length < 16) {
    digits += '0';
    exponent -= 1;
  }

  const biasedExp = exponent + 398;
  if (biasedExp < 0 || biasedExp > 767) throw new RangeError(`Exponent out of range for Decimal64: ${exponent}`);

  const digitArray = digits.split('').map(Number);
  const d0 = digitArray[0];
  const continuationDigits = digitArray.slice(1);

  const expTop2 = (biasedExp >> 8) & 0x03;
  const expContVal = biasedExp & 0xFF;

  let comboVal = 0;
  if (d0 <= 7) {
    comboVal = (expTop2 << 3) | d0;
  } else {
    comboVal = (0b11 << 3) | (expTop2 << 1) | (d0 & 1);
  }

  const comboBits = comboVal.toString(2).padStart(5, '0');
  const expContBits = expContVal.toString(2).padStart(8, '0');
  const decletBitsArr = [];

  for (let i = 0; i < 15; i += 3) {
    const declet = bcdToDpd(continuationDigits[i], continuationDigits[i + 1], continuationDigits[i + 2]);
    decletBitsArr.push(declet.toString(2).padStart(10, '0'));
  }

  const binarySpaced = `${signBit} ${comboBits} ${expContBits} ${decletBitsArr.join(' ')}`;
  const rawBinary = binarySpaced.replace(/\s+/g, '');
  const hex = BigInt('0b' + rawBinary).toString(16).toUpperCase().padStart(16, '0');

  return { type: 'Finite', binary: binarySpaced, hex: hex };
}

/**
 * DECODER PATCH
 * Extracts Sign, Exponent, and Base-10 Coefficient for the ALU.
 **/

function dpdToBcd(declet) {
  const p = (declet >> 9) & 1; const q = (declet >> 8) & 1; const r = (declet >> 7) & 1;
  const s = (declet >> 6) & 1; const t = (declet >> 5) & 1; const u = (declet >> 4) & 1;
  const v = (declet >> 3) & 1; const w = (declet >> 2) & 1; const x = (declet >> 1) & 1; const y = declet & 1;

  let a, b, c, d = r, e, f, g, h = u, i, j, k, m = y;

  if (v === 0) {
      a = 0; b = p; c = q; e = 0; f = s; g = t; i = 0; j = w; k = x;
  } else if (v === 1 && w === 0 && x === 0) {
      a = 0; b = p; c = q; e = 0; f = s; g = t; i = 1; j = 0; k = 0;
  } else if (v === 1 && w === 0 && x === 1) {
      a = 0; b = p; c = q; e = 1; f = 0; g = 0; i = 0; j = s; k = t;
  } else if (v === 1 && w === 1 && x === 0) {
      a = 1; b = 0; c = 0; e = 0; f = s; g = t; i = 0; j = p; k = q;
  } else if (v === 1 && w === 1 && x === 1) {
      if (s === 0 && t === 0) { a = 0; b = p; c = q; e = 1; f = 0; g = 0; i = 1; j = 0; k = 0; }
      else if (s === 0 && t === 1) { a = 1; b = 0; c = 0; e = 1; f = 0; g = 0; i = 0; j = p; k = q; }
      else if (s === 1 && t === 0) { a = 1; b = 0; c = 0; e = 0; f = p; g = q; i = 1; j = 0; k = 0; }
      else if (s === 1 && t === 1) { a = 1; b = 0; c = 0; e = 1; f = 0; g = 0; i = 1; j = 0; k = 0; }
  }
  
  return [(a << 3) | (b << 2) | (c << 1) | d, (e << 3) | (f << 2) | (g << 1) | h, (i << 3) | (j << 2) | (k << 1) | m];
}

function decodeDecimal64(hexString) {
  hexString = hexString.replace(/^0x/i, '');
  if (hexString.length !== 16) throw new Error('Invalid hexadecimal length. Must be exactly 16 characters.');

  let binStr = BigInt('0x' + hexString).toString(2).padStart(64, '0');
  
  const sign = BigInt(binStr[0]);
  const comboBits = binStr.slice(1, 6);
  const expContBits = binStr.slice(6, 14);
  const decletBits = binStr.slice(14);
  
  if (comboBits === '11111') return { type: 'NaN', sign, isNaN: true };
  if (comboBits === '11110') return { type: 'Infinity', sign, isInfinity: true };
  
  let expTop2, d0;
  
  if (comboBits.startsWith('00') || comboBits.startsWith('01') || comboBits.startsWith('10')) {
      expTop2 = parseInt(comboBits.slice(0, 2), 2);
      d0 = parseInt(comboBits.slice(2, 5), 2);
  } else {
      expTop2 = parseInt(comboBits.slice(2, 4), 2);
      d0 = 8 + parseInt(comboBits[4], 2);
  }
  
  const biasedExp = (expTop2 << 8) | parseInt(expContBits, 2);
  const exponent = BigInt(biasedExp - 398);
  
  let coefficientStr = d0.toString();
  for (let i = 0; i < 50; i += 10) {
      const declet = parseInt(decletBits.slice(i, i + 10), 2);
      const bcd = dpdToBcd(declet);
      coefficientStr += bcd[0].toString() + bcd[1].toString() + bcd[2].toString();
  }
  
  return {
      type: 'Finite',
      sign: sign,
      exponent: exponent,
      coefficient: BigInt(coefficientStr)
  };
}

export { encodeDecimal64, decodeDecimal64 };