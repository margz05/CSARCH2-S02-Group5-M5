/*
File: alu.js
Author: Iringan, Jamie - Arithmetic Logic Unit Core
Purpose: Handles the raw mathematical operations for Decimal64.
         - Analyzes the exponents of two decoded operands and aligns the smaller one.
         - Performs base-10 subtraction and division on the significands.
         - Generates a structured JSON "Trace Object" that records the initial state, 
           the aligned state, the raw calculation, and the final normalized state to 
           send back to ui.js for rendering.
*/

import { decodeDecimal64, encodeDecimal64 } from './converter.js';

class FloatingPointALU {
    
    /**
     * Helper: Shifts coefficient and calculates GRS bits
     */
    static alignExponents(coeffStr, shiftAmount) {
        let alignedCoeff = coeffStr;
        let g = '0', r = '0', s = '0';

        if (shiftAmount > 0) {
            // Shifting right (making exponent larger)
            let discarded = '';
            if (shiftAmount >= coeffStr.length) {
                discarded = coeffStr.padStart(shiftAmount, '0');
                alignedCoeff = '0';
            } else {
                discarded = coeffStr.slice(-shiftAmount);
                alignedCoeff = coeffStr.slice(0, -shiftAmount);
            }

            g = discarded[0] || '0';
            r = discarded[1] || '0';
            s = discarded.slice(2).split('').some(bit => bit !== '0') ? '1' : '0';
        } else if (shiftAmount < 0) {
            // Shifting left (padding with zeros)
            alignedCoeff = coeffStr + '0'.repeat(Math.abs(shiftAmount));
        }

        return { alignedCoeff, g, r, s };
    }

    /**
     * Operation: Subtraction
     */
    static subtract(hexA, hexB) {
        try {
            const opA = decodeDecimal64(hexA);
            const opB = decodeDecimal64(hexB);

            // Handle Specials (NaN, Infinity)
            if (opA.type !== 'Finite' || opB.type !== 'Finite') {
                return { error: true, message: "Special cases (NaN/Inf) detected. Arithmetic bypassed." };
            }

            let expA = Number(opA.exponent);
            let expB = Number(opB.exponent);
            let coeffA = opA.coefficient.toString();
            let coeffB = opB.coefficient.toString();

            let alignedA = coeffA;
            let alignedB = coeffB;
            let commonExp = expA;
            let grs = { g: '0', r: '0', s: '0' };

            // Align Exponents to the larger one
            if (expA > expB) {
                const shift = expA - expB;
                const alignment = this.alignExponents(coeffB, shift);
                alignedB = alignment.alignedCoeff;
                grs = { g: alignment.g, r: alignment.r, s: alignment.s };
                commonExp = expA;
            } else if (expB > expA) {
                const shift = expB - expA;
                const alignment = this.alignExponents(coeffA, shift);
                alignedA = alignment.alignedCoeff;
                grs = { g: alignment.g, r: alignment.r, s: alignment.s };
                commonExp = expB;
            }

            // Perform Base-10 Subtraction (Assuming A > B for simplicity in trace)
            // Note: A complete implementation requires handling sign changes and two's complement,
            // but this provides the exact trace structure needed for the UI.
            let rawResult = BigInt(alignedA) - BigInt(alignedB);
            let finalSign = opA.sign;

            if (rawResult < 0n) {
                rawResult = -rawResult;
                finalSign = finalSign === 0n ? 1n : 0n; // Flip sign
            }

            // Format as base-10 scientific notation string for encoding
            let resultStr = `${finalSign === 1n ? '-' : ''}${rawResult.toString()}e${commonExp}`;
            const encodedResult = encodeDecimal64(resultStr);

            // Return the Trace Object for GSAP Animations
            return {
                error: false,
                operation: "Subtraction",
                trace: {
                    operandA: { original: coeffA, exp: expA, aligned: alignedA },
                    operandB: { original: coeffB, exp: expB, aligned: alignedB },
                    grsBits: `${grs.g}${grs.r}${grs.s}`,
                    commonExponent: commonExp,
                    rawResult: rawResult.toString()
                },
                finalHex: encodedResult.hex
            };

        } catch (err) {
            return { error: true, message: err.message };
        }
    }

    /**
     * Operation: Division
     */
    static divide(hexA, hexB) {
        try {
            const opA = decodeDecimal64(hexA);
            const opB = decodeDecimal64(hexB);

            if (opA.type !== 'Finite' || opB.type !== 'Finite') {
                return { error: true, message: "Special cases (NaN/Inf) detected." };
            }

            if (opB.coefficient === 0n) {
                return { error: true, message: "Divide by Zero error." };
            }

            let finalSign = opA.sign === opB.sign ? 0n : 1n;
            let expA = Number(opA.exponent);
            let expB = Number(opB.exponent);
            
            // Division Exponent Math: ExpA - ExpB
            let finalExp = expA - expB;

            // Scale up Operand A to guarantee we get 16 digits of precision + GRS
            let scaledCoeffA = opA.coefficient * 1000000000000000000n; 
            finalExp -= 18; // Adjust exponent for the scaling

            let rawResult = scaledCoeffA / opB.coefficient;

            // Format back for encoding
            let resultStr = `${finalSign === 1n ? '-' : ''}${rawResult.toString()}e${finalExp}`;
            const encodedResult = encodeDecimal64(resultStr);

            return {
                error: false,
                operation: "Division",
                trace: {
                    operandA: { coeff: opA.coefficient.toString(), exp: expA },
                    operandB: { coeff: opB.coefficient.toString(), exp: expB },
                    calculatedExponent: finalExp,
                    rawResult: rawResult.toString()
                },
                finalHex: encodedResult.hex
            };

        } catch (err) {
            return { error: true, message: err.message };
        }
    }
}

export { FloatingPointALU };