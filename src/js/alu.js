/*
Assigned to: (Member 3 - ALU Core)
Purpose: Handles the raw mathematical operations.
         - Analyzes the exponents of two decoded operands and aligns the smaller one.
         - Performs base-10 subtraction and division on the significands.
         - Generates a structured JSON "Trace Object" that records the initial state, 
           the aligned state, the raw calculation, and the final normalized state to 
           send back to ui.js for rendering.
*/

class ExecutionJournal {
    constructor(operationName) {
        this.title = operationName;
        this.phases = [];
        this.currentPhase = null;
    }

    startPhase(phaseName) {
        this.currentPhase = { name: phaseName, logs: [] };
        this.phases.push(this.currentPhase);
    }

    record(message) {
        if (this.currentPhase) {
            this.currentPhase.logs.push(message);
        }
    }

    display() {
        console.log(`\n=================================================`);
        console.log(`  OPERATION: ${this.title.toUpperCase()}`);
        console.log(`=================================================`);
        this.phases.forEach((phase, index) => {
            console.log(`\n|> STEP ${index + 1}: ${phase.name.toUpperCase()}`);
            console.log(`-------------------------------------------------`);
            phase.logs.forEach(log => console.log(`   * ${log}`));
        });
        console.log(`=================================================\n`);
    }
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
    },

    formatBin: (val, bits) => val.toString(2).padStart(bits, '0')
};

class FloatingPointALU {
    
    static executeSubtraction(valA, valB) {
        const journal = new ExecutionJournal(`Subtraction (${valA} - ${valB})`);
        
        journal.startPhase("Decode & Sign Resolution");
        const A = IEEE754Transcoder.decode(valA);
        const B = IEEE754Transcoder.decode(valB);
        
        const effectiveSignB = B.sign ^ 1n; 
        const isAddition = A.sign === effectiveSignB; 

        journal.record(`A Sign: ${A.sign}, B Effective Sign: ${effectiveSignB}`);
        journal.record(`Operation resolves to: ${isAddition ? 'ADDITION' : 'MAGNITUDE SUBTRACTION'}`);

        journal.startPhase("Alignment via Extended Register (Mantissa + 3 GRS bits)");
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

        journal.record(`Aligned Extended Larger:  ${extLarger.toString(2)}`);
        journal.record(`Aligned Extended Smaller: ${extSmaller.toString(2)}`);

        journal.startPhase("Arithmetic & Normalization");
        let resMantissaExt = 0n;
        let resSign = larger.sign;

        if (isAddition) {
            resMantissaExt = extLarger + extSmaller;
        } else {
            resMantissaExt = extLarger - extSmaller;
            if (resMantissaExt === 0n) resSign = 0n; 
        }

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

        journal.startPhase("GRS Extraction & Rounding");
        const s = (resMantissaExt & 1n);
        const r = (resMantissaExt >> 1n) & 1n;
        const g = (resMantissaExt >> 2n) & 1n;
        
        let resMantissa = resMantissaExt >> 3n;
        journal.record(`Extracted GRS -> Guard: ${g}, Round: ${r}, Sticky: ${s}`);

        if (g === 1n && (r === 1n || s === 1n || (resMantissa & 1n) === 1n)) {
            resMantissa += 1n;
            journal.record(`Rounded Up (+1 to mantissa).`);
            
            if (resMantissa >= (1n << 53n)) {
                resMantissa >>= 1n;
                resExp += 1n;
            }
        }

        const finalFraction = resMantissa & 0xFFFFFFFFFFFFFn;
        const finalOutput = IEEE754Transcoder.encode(resSign, resExp, finalFraction);

        journal.record(`FINAL BINARY: ${finalOutput.binary}`);
        journal.record(`FINAL HEX:    ${finalOutput.hex}`);

        return { journal, result: finalOutput };
    }

    static executeDivision(valA, valB) {
        const journal = new ExecutionJournal(`Division (${valA} / ${valB})`);

        journal.startPhase("Decode & Sign Resolution");
        const A = IEEE754Transcoder.decode(valA);
        const B = IEEE754Transcoder.decode(valB);
        
        const resSign = A.sign ^ B.sign;

        if (B.exponent === 0n && B.fraction === 0n) {
            journal.record(`Exception: Division by Zero.`);
            return { journal, result: IEEE754Transcoder.encode(resSign, 0x7FFn, 0n) };
        }

        journal.startPhase("Exponent Calculation");
        let resExp = A.exponent - B.exponent + IEEE754Transcoder.BIAS;

        journal.startPhase("Mantissa Division (Extended Precision)");
        const shiftedDividend = A.mantissa << 56n;
        let rawQuotientExt = shiftedDividend / B.mantissa;
        const remainder = shiftedDividend % B.mantissa;
        
        let sticky = remainder !== 0n ? 1n : 0n;

        journal.startPhase("Normalization");
        if (rawQuotientExt >= (1n << 56n)) {
            sticky |= (rawQuotientExt & 1n);
            rawQuotientExt >>= 1n;
            resExp += 1n;
        } else while (rawQuotientExt < (1n << 55n) && resExp > 0n) {
            rawQuotientExt <<= 1n;
            resExp -= 1n;
        }
        
        rawQuotientExt |= sticky;

        journal.startPhase("GRS Extraction & Rounding");
        const s = rawQuotientExt & 1n;
        const r = (rawQuotientExt >> 1n) & 1n;
        const g = (rawQuotientExt >> 2n) & 1n;
        
        let resMantissa = rawQuotientExt >> 3n;

        journal.record(`Extracted GRS -> Guard: ${g}, Round: ${r}, Sticky: ${s}`);

        if (g === 1n && (r === 1n || s === 1n || (resMantissa & 1n) === 1n)) {
            resMantissa += 1n;
            journal.record(`Rounded Up (+1 to mantissa).`);
            
            if (resMantissa >= (1n << 53n)) {
                resMantissa >>= 1n;
                resExp += 1n;
            }
        }

        const finalFraction = resMantissa & 0xFFFFFFFFFFFFFn;
        const finalOutput = IEEE754Transcoder.encode(resSign, resExp, finalFraction);

        journal.record(`FINAL BINARY: ${finalOutput.binary}`);
        journal.record(`FINAL HEX:    ${finalOutput.hex}`);

        return { journal, result: finalOutput };
    }
}
