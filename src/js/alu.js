/*
Assigned to: (Member 3 - ALU Core)
Purpose: Handles the raw mathematical operations.
         - Analyzes the exponents of two decoded operands and aligns the smaller one.
         - Performs base-10 subtraction and division on the significands.
         - Generates a structured JSON "Trace Object" that records the initial state, 
           the aligned state, the raw calculation, and the final normalized state to 
           send back to ui.js for rendering.
*/

class TraceBuilder {
    constructor() {
        this.trace = {
            operation: "",
            initialState: {},
            alignedState: {},
            rawCalculation: {},
            finalNormalizedState: {}
        };
    }
    
    setOperation(op) { this.trace.operation = op; }
    setInitial(data) { this.trace.initialState = data; }
    setAligned(data) { this.trace.alignedState = data; }
    setRaw(data) { this.trace.rawCalculation = data; }
    setFinal(data) { this.trace.finalNormalizedState = data; }
    
    getJSON() { return JSON.stringify(this.trace, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value 
    , 2); }
    
    getObject() { return this.trace; }
}

const IEEE754Transcoder = {
    BIAS: 1023n,

    decode(input) {
        const buffer = new ArrayBuffer(8);
        const floatView = new Float64Array(buffer);
        const bigIntView = new BigUint64Array(buffer);

        if (typeof input === 'string' && input.toLowerCase().startsWith('0x')) {
            bigIntView[0] = BigInt(input);
        } else {
            floatView[0] = parseFloat(input);
        }

        const raw = bigIntView[0];
        const sign = (raw >> 63n) & 1n;
        const exponent = (raw >> 52n) & 0x7FFn;
        const fraction = raw & 0xFFFFFFFFFFFFFn;

        const isSubnormal = exponent === 0n;
        const implicitBit = isSubnormal ? 0n : (1n << 52n);
        const mantissa = implicitBit | fraction;

        return { raw, sign, exponent, fraction, mantissa, isSubnormal };
    },

    encode(sign, exponent, fraction) {
        const assembled = (sign << 63n) | (exponent << 52n) | fraction;
        const hex = '0x' + assembled.toString(16).toUpperCase().padStart(16, '0');
        const binStr = assembled.toString(2).padStart(64, '0');
        const formattedBin = `${binStr.slice(0, 1)} ${binStr.slice(1, 12)} ${binStr.slice(12)}`;
        
        return { hex, binary: formattedBin, raw: assembled };
    }
};

class FloatingPointALU {
    
    static executeSubtraction(valA, valB) {
        const trace = new TraceBuilder();
        trace.setOperation(`Subtraction: ${valA} - ${valB}`);
        
        const A = IEEE754Transcoder.decode(valA);
        const B = IEEE754Transcoder.decode(valB);
        const effectiveSignB = B.sign ^ 1n; 
        const isAddition = A.sign === effectiveSignB; 

        trace.setInitial({
            operandA: { sign: A.sign, exponent: A.exponent, significandBase10: A.mantissa.toString(10), significandBase2: A.mantissa.toString(2) },
            operandB: { sign: B.sign, exponent: B.exponent, significandBase10: B.mantissa.toString(10), significandBase2: B.mantissa.toString(2) },
            effectiveOperation: isAddition ? "ADDITION" : "SUBTRACTION"
        });

        let expDiff = A.exponent - B.exponent;
        let larger = A, smaller = B;

        if (expDiff < 0n || (expDiff === 0n && B.mantissa > A.mantissa)) {
            larger = B; 
            smaller = A; 
            expDiff = expDiff < 0n ? -expDiff : expDiff;
        }

        let extLarger = larger.mantissa << 3n;
        let extSmaller = smaller.mantissa << 3n;
        let stickyAccumulator = 0n;

        if (expDiff > 0n) {
            if (expDiff > 56n) {
                stickyAccumulator = extSmaller > 0n ? 1n : 0n;
                extSmaller = 0n;
            } else {
                const mask = (1n << expDiff) - 1n;
                stickyAccumulator = (extSmaller & mask) > 0n ? 1n : 0n;
                extSmaller >>= expDiff;
            }
        }
        extSmaller |= stickyAccumulator; 

        trace.setAligned({
            targetExponent: larger.exponent,
            exponentDifference: expDiff,
            alignedLargerSignificandBase10: extLarger.toString(10),
            alignedSmallerSignificandBase10: extSmaller.toString(10)
        });

        let resMantissaExt = 0n;
        let resSign = larger.sign;

        if (isAddition) {
            resMantissaExt = extLarger + extSmaller;
        } else {
            resMantissaExt = extLarger - extSmaller;
            if (resMantissaExt === 0n) resSign = 0n; 
        }

        trace.setRaw({
            mathEquationBase10: `${extLarger.toString(10)} ${isAddition ? '+' : '-'} ${extSmaller.toString(10)}`,
            rawResultSignificandBase10: resMantissaExt.toString(10),
            rawResultSignificandBase2: resMantissaExt.toString(2)
        });

        let resExp = larger.exponent;

        if (resMantissaExt > 0n) {
            while (resMantissaExt >= (1n << 56n)) {
                stickyAccumulator |= (resMantissaExt & 1n); 
                resMantissaExt >>= 1n;
                resExp += 1n;
            }
            while (resMantissaExt < (1n << 55n) && resExp > 0n) {
                resMantissaExt <<= 1n;
                resExp -= 1n;
            }
            resMantissaExt |= stickyAccumulator; 
        } else {
            resExp = 0n;
        }

        const s = (resMantissaExt & 1n);
        const r = (resMantissaExt >> 1n) & 1n;
        const g = (resMantissaExt >> 2n) & 1n;
        let resMantissa = resMantissaExt >> 3n;

        let roundedUp = false;
        if (g === 1n && (r === 1n || s === 1n || (resMantissa & 1n) === 1n)) {
            resMantissa += 1n;
            roundedUp = true;
            if (resMantissa >= (1n << 53n)) {
                resMantissa >>= 1n;
                resExp += 1n;
            }
        }

        const finalFraction = resMantissa & 0xFFFFFFFFFFFFFn;
        const finalOutput = IEEE754Transcoder.encode(resSign, resExp, finalFraction);

        trace.setFinal({
            extractedGRS: `${g}${r}${s}`,
            wasRoundedUp: roundedUp,
            finalSignificandBase10: resMantissa.toString(10),
            finalExponent: resExp,
            binaryOutput: finalOutput.binary,
            hexOutput: finalOutput.hex
        });

        return trace.getObject(); 
    }

    static executeDivision(valA, valB) {
        const trace = new TraceBuilder();
        trace.setOperation(`Division: ${valA} / ${valB}`);

        const A = IEEE754Transcoder.decode(valA);
        const B = IEEE754Transcoder.decode(valB);
        const resSign = A.sign ^ B.sign;

        trace.setInitial({
            operandA: { sign: A.sign, exponent: A.exponent, significandBase10: A.mantissa.toString(10) },
            operandB: { sign: B.sign, exponent: B.exponent, significandBase10: B.mantissa.toString(10) },
            resultSign: resSign
        });

        if (B.exponent === 0n && B.fraction === 0n) {
            trace.setFinal({ error: "Division by Zero" });
            return trace.getObject();
        }

        let resExp = A.exponent - B.exponent + IEEE754Transcoder.BIAS;
        trace.setAligned({
            exponentCalculation: `${A.exponent} - ${B.exponent} + ${IEEE754Transcoder.BIAS}`,
            targetExponent: resExp
        });

        const shiftedDividend = A.mantissa << 56n;
        let rawQuotientExt = shiftedDividend / B.mantissa;
        const remainder = shiftedDividend % B.mantissa;
        let sticky = remainder !== 0n ? 1n : 0n;

        trace.setRaw({
            mathEquationBase10: `${shiftedDividend.toString(10)} / ${B.mantissa.toString(10)}`,
            rawQuotientBase10: rawQuotientExt.toString(10),
            remainderBase10: remainder.toString(10)
        });

        if (rawQuotientExt >= (1n << 56n)) {
            sticky |= (rawQuotientExt & 1n);
            rawQuotientExt >>= 1n;
            resExp += 1n;
        } else while (rawQuotientExt < (1n << 55n) && resExp > 0n) {
            rawQuotientExt <<= 1n;
            resExp -= 1n;
        }
        rawQuotientExt |= sticky;

        const s = rawQuotientExt & 1n;
        const r = (rawQuotientExt >> 1n) & 1n;
        const g = (rawQuotientExt >> 2n) & 1n;
        let resMantissa = rawQuotientExt >> 3n;

        let roundedUp = false;
        if (g === 1n && (r === 1n || s === 1n || (resMantissa & 1n) === 1n)) {
            resMantissa += 1n;
            roundedUp = true;
            if (resMantissa >= (1n << 53n)) {
                resMantissa >>= 1n;
                resExp += 1n;
            }
        }

        const finalFraction = resMantissa & 0xFFFFFFFFFFFFFn;
        const finalOutput = IEEE754Transcoder.encode(resSign, resExp, finalFraction);

        trace.setFinal({
            extractedGRS: `${g}${r}${s}`,
            wasRoundedUp: roundedUp,
            finalSignificandBase10: resMantissa.toString(10),
            finalExponent: resExp,
            binaryOutput: finalOutput.binary,
            hexOutput: finalOutput.hex
        });

        return trace.getObject(); 
    }
}
