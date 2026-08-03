/**
 * converter.js
 * Machine 5: Decimal 64-bit Floating-Point Machine
 * IEEE 754 Decimal64 Operations — DPD Encoding
 *
 **/
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
    (p << 9) |
    (q << 8) |
    (r << 7) |
    (s << 6) |
    (t << 5) |
    (u << 4) |
    (v << 3) |
    (w << 2) |
    (x << 1) |
    y
  );
}

function roundSignificantDigits(digits, precision) {
  if (digits.length <= precision) {
    return {
      digits: digits,
      carry: false
    };
  }

  const kept = digits.slice(0, precision);
  const firstDiscarded = Number(digits[precision]);

  let roundUp = false;

  if (firstDiscarded > 5) {
    roundUp = true;

  } else if (firstDiscarded < 5) {
    roundUp = false;

  } else {
    const remaining = digits.slice(precision + 1);

    const hasNonZeroAfter5 = /[1-9]/.test(remaining);

    if (hasNonZeroAfter5) {
      roundUp = true;
    } else {
      const lastKeptDigit = Number(kept[kept.length - 1]);
      roundUp = (lastKeptDigit % 2 === 1);
    }
  }

  if (!roundUp) {
    return {
      digits: kept,
      carry: false
    };
  }
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
  if (carry) {
    return {
      digits: '1' + '0'.repeat(precision - 1),
      carry: true
    };
  }

  return {
    digits: arr.join(''),
    carry: false
  };
}

function parseDecimalString(str) {
  let exponent = 0;

  const eIndex = str.search(/[eE]/);

  if (eIndex !== -1) {
    const exponentPart = str.slice(eIndex + 1);
    str = str.slice(0, eIndex);

    if (!/^[+-]?\d+$/.test(exponentPart)) {
      throw new Error('Invalid exponent.');
    }

    exponent = parseInt(exponentPart, 10);
  }

  let integerPart;
  let fractionalPart;

  if (str.includes('.')) {
    const parts = str.split('.');

    if (parts.length !== 2) {
      throw new Error('Invalid decimal format.');
    }

    integerPart = parts[0];
    fractionalPart = parts[1];

  } else {
    integerPart = str;
    fractionalPart = '';
  }

  if (integerPart === '') {
    integerPart = '0';
  }

  if (fractionalPart === '') {
    fractionalPart = '';
  }

  if (!/^\d+$/.test(integerPart)) {
    throw new Error('Invalid integer portion.');
  }

  if (fractionalPart !== '' && !/^\d+$/.test(fractionalPart)) {
    throw new Error('Invalid fractional portion.');
  }

  const allDigits = integerPart + fractionalPart;

  exponent -= fractionalPart.length;

  return {
    digits: allDigits,
    exponent: exponent
  };
}

function encodeDecimal64(rawInput) {
  let original = String(rawInput).trim();

  if (original === '') {
    throw new Error('Input cannot be empty.');
  }

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
    const binarySpaced =
      `${signBit} 11111 00000000 ` +
      `0000000000 0000000000 0000000000 0000000000 0000000000`;

    return {
      type: 'NaN',
      binary: binarySpaced,
      hex: signBit === '1'
        ? 'FC00000000000000'
        : '7C00000000000000'
    };
  }


  if (upper === 'INF' || upper === 'INFINITY') {
    const binarySpaced =
      `${signBit} 11110 00000000 ` +
      `0000000000 0000000000 0000000000 0000000000 0000000000`;

    return {
      type: 'Infinity',
      binary: binarySpaced,
      hex: signBit === '1'
        ? 'F800000000000000'
        : '7800000000000000'
    };
  }

  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(str)) {
    throw new Error(`Invalid decimal input: ${original}`);
  }

  let parsed = parseDecimalString(str);

  let digits = parsed.digits;
  let exponent = parsed.exponent;

  if (/^0+$/.test(digits)) {
    const binarySpaced =
      `${signBit} 00000 00000000 ` +
      `0000000000 0000000000 0000000000 0000000000 0000000000`;

    return {
      type: signBit === '1' ? '-0' : '+0',
      binary: binarySpaced,
      hex: signBit === '1'
        ? '8000000000000000'
        : '0000000000000000'
    };
  }

  const leadingZeros = digits.match(/^0*/)[0].length;

  if (leadingZeros > 0) {
    digits = digits.slice(leadingZeros);
    exponent -= leadingZeros;
  }

  const rounded = roundSignificantDigits(digits, 16);

  digits = rounded.digits;

  if (rounded.carry) {
    exponent += 1;
  }

  while (digits.length < 16) {
    digits += '0';
    exponent -= 1;
  }

  const biasedExp = exponent + 398;

  if (biasedExp < 0 || biasedExp > 767) {
    throw new RangeError(
      `Exponent out of range for Decimal64: ${exponent}`
    );
  }

  const digitArray = digits.split('').map(Number);

  const d0 = digitArray[0];
  const continuationDigits = digitArray.slice(1);

  const expTop2 = (biasedExp >> 8) & 0x03;
  const expContVal = biasedExp & 0xFF;

  let comboVal = 0;

  if (d0 <= 7) {
    comboVal = (expTop2 << 3) | d0;
  } else {
    comboVal =
      (0b11 << 3) |
      (expTop2 << 1) |
      (d0 & 1);
  }

  const comboBits =
    comboVal.toString(2).padStart(5, '0');

  const expContBits =
    expContVal.toString(2).padStart(8, '0');

  const decletBitsArr = [];

  for (let i = 0; i < 15; i += 3) {
    const declet = bcdToDpd(
      continuationDigits[i],
      continuationDigits[i + 1],
      continuationDigits[i + 2]
    );

    decletBitsArr.push(
      declet.toString(2).padStart(10, '0')
    );
  }
  const binarySpaced =
    `${signBit} ${comboBits} ${expContBits} ` +
    `${decletBitsArr.join(' ')}`;

  const rawBinary = binarySpaced.replace(/\s+/g, '');

  const hex =
    BigInt('0b' + rawBinary)
      .toString(16)
      .toUpperCase()
      .padStart(16, '0');

  return {
    type: 'Finite',
    binary: binarySpaced,
    hex: hex
  };
}

function convertAndPrint(input) {
  try {
    const result = encodeDecimal64(input);

    console.log(`Input: ${input}`);
    console.log(`Binary: ${result.binary}`);
    console.log(`Hex:    ${result.hex}`);

  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}