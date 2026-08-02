/*
Assigned to: (Tiongco, Kyan - Rounding Validator)
Purpose: Manages precision rules and Guard, Round, and Sticky (GRS) evaluation.
         - Contains a standalone utility for the Rounding Demonstrator feature.
         - Evaluates bits/digits shifted out during ALU exponent alignment to set GRS.
         - Applies the four IEEE-754 rounding rules: Chopping, Round-Up, Round-Down, 
           and Round-to-Nearest Ties-to-Even.
*/


// Usage: call decimalRounding("123.456789", 5) for decimal or binaryRounding("101.1011", 4) for binary.

function extractionGRS(digits, precision = 16)
{
  const retainedDigits = digits.slice(0, precision);
  const discardedDigits = digits.slice(precision);

  const Gbit = discardedDigits.length > 0 ? parseInt(discardedDigits[0]) : 0;
  const Rbit = discardedDigits.length > 1 ? parseInt(discardedDigits[1]) : 0;
  const Sbit = discardedDigits.length > 2 ? [...discardedDigits.slice(2)].some(digit => parseInt(digit) !== 0) ? 1 : 0 : 0;

  return{
    retainedDigits,
    discardedDigits,
    Gbit,
    Rbit,
    Sbit
  };
}


function RoundingRules(sign, rule, Gbit, Rbit, Sbit, retainedDigits, base = 10)
{
  const nonZeroCheck = Gbit != 0 || Rbit != 0 || Sbit != 0;

  const lastRetainedDigit = parseInt(retainedDigits[retainedDigits.length - 1]);

  switch (rule)
  {
    case "truncate":
      return false;

      case "roundUp":
        return sign === 0 && nonZeroCheck;

      case "roundDown":
        return sign === 1 && nonZeroCheck;

        case "roundToNearest":
          {
            
            if (Gbit > base / 2)
          {
            return true;
          }

          if(Gbit < base / 2)
          {
            return false; 
          }

          if (Rbit !== 0 || Sbit !== 0)
          {
            return true;
          }

          return lastRetainedDigit % 2 !== 0;
          }
          default: throw new Error("Invalid Mode Selected (truncate, roundUp, roundDown, roundToNearest)");
  }
}

function AddOne(retainedDigits, base = 10)
{
  const digits = retainedDigits.split("");
  let carry = 1;


  for(let i = digits.length - 1; i >= 0 && carry === 1; i--)
  {
    const addedValue = parseInt(digits[i]) + carry;

    if (addedValue === base)
    {
      digits[i] = '0';
      carry = 1;
    }
    else
    {
      digits[i] = addedValue.toString();
      carry = 0;
    }
  }

  if (carry === 1)
  {
    digits.unshift("1")
  }
  return digits.join("");
}


function specialRounding(roundedDigits, exponent, precision = 16)
{
  if (roundedDigits.length > precision)
  {
    roundedDigits = roundedDigits.slice(0, precision);
    exponent += 1;
  }

  return {
    roundedDigits,
    exponent
  };

}


function parsingDecimal(value)
{
  const input = String(value).trim();

  const valid =   /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input);
  if (!valid)
  {
    throw new Error("Invalid decimal input. Must be a valid decimal number.");
  }

  const sign = input.startsWith("-") ? 1 : 0;
  const unsigned = input.replace(/^[+-]/, "");
  const parting = unsigned.split(".");
  const integerPart = parting[0] || "0";
  const fractionalPart = parting[1] || "";
  let digits = integerPart + fractionalPart;
  let exponent = -fractionalPart.length;
  digits = digits.replace(/^0+(?=\d)/, "");
  if (/^0+$/.test(digits))
  {
    digits = "0";
    exponent = 0;
  }

  return{
    original: input,
    digits,
    exponent,
    sign
  };
}

function parsingBinary(value)
{
  const input = String(value).trim();

  const valid = /^[+-]?(?:[01]+(?:\.[01]*)?|\.[01]+)$/.test(input);
  if (!valid)
  {
    throw new Error("Invalid binary input. Must be a valid binary number.");
  }

  const sign = input.startsWith("-") ? 1 : 0;
  const unsigned = input.replace(/^[+-]/, "");
  const parting = unsigned.split(".");
  const integerPart = parting[0] || "0";
  const fractionalPart = parting[1] || "";
  let digits = integerPart + fractionalPart;
  let exponent = -fractionalPart.length;
  digits = digits.replace(/^0+(?=\d)/, "");
  if (/^0+$/.test(digits))
  {
    digits = "0";
    exponent = 0;
  }

  return{
    original: input,
    digits,
    exponent,
    sign
  };
}

function roundingValidator(digits, exponent, sign, rule, precision = 16, base = 10)
{
  errorHandling(digits, exponent, sign, rule, precision, base);
  const extractionResult = extractionGRS(digits, precision);
  const adjustedExponent = exponent + extractionResult.discardedDigits.length;
  const increment = RoundingRules(sign, rule, extractionResult.Gbit, extractionResult.Rbit, extractionResult.Sbit, extractionResult.retainedDigits, base);
  let newDigits = extractionResult.retainedDigits;

  if (increment)
  {
    newDigits = AddOne(extractionResult.retainedDigits, base);
  }
  const normalizedResult = specialRounding(newDigits, adjustedExponent, precision);

  return {
    original: digits,
    retained: extractionResult.retainedDigits,
    discarded: extractionResult.discardedDigits,
    Gbit: extractionResult.Gbit,
    Rbit: extractionResult.Rbit,
    Sbit: extractionResult.Sbit,
    rule,
    sign,
    increment,
    roundedDigits: normalizedResult.roundedDigits,
    originalExponent: exponent,
    finalExponent: normalizedResult.exponent,
    base
  };
}

function decimalRounding(value, precision = 16)
{
  const parsed = parsingDecimal(value);

  return{
    parsed,
    results: allOutput(parsed.digits, parsed.exponent, parsed.sign, precision, 10)
  }
}

function binaryRounding(value, precision = 16)
{
  const parsed = parsingBinary(value);

  return{
    parsed,
    results: allOutput(parsed.digits, parsed.exponent, parsed.sign, precision, 2)
  }
}

function errorHandling(digits, exponent, sign, rule, precision, base)
{
  if (typeof digits !== "string" || !/^\d+$/.test(digits))
  {
    throw new Error("Invalid digits input. Must be a string of digits.");
  }

  if (typeof exponent !== "number" || !Number.isInteger(exponent))
  {
    throw new Error("Invalid exponent input. Must be an integer.");
  }

  if (typeof sign !== "number" || ![0, 1].includes(sign))
  {
    throw new Error("Invalid sign input. Must be 0 (positive) or 1 (negative).");
  }

  if (!Number.isInteger(precision) || precision <= 0)
  {
    throw new Error("Invalid precision input. Must be a positive integer.");
  }

  if (base === 2 && !/^[01]+$/.test(digits))
  {
    throw new Error("Invalid digits input for binary base. Must be a string of 0s and 1s.");
  }

  if (base !== 2 && base !== 10)
  {
    throw new Error("Invalid base input. Must be either 2 (binary) or 10 (decimal).");
  }
}



function allOutput(digits, exponent, sign, precision = 16, base = 10)
{
  return {
    truncate: roundingValidator(digits, exponent, sign, "truncate", precision, base),
    roundUp: roundingValidator(digits, exponent, sign, "roundUp", precision, base),
    roundDown: roundingValidator(digits, exponent, sign, "roundDown", precision, base),
    roundToNearest: roundingValidator(digits, exponent, sign, "roundToNearest", precision, base)
  };
}