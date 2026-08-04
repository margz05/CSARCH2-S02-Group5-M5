/*
Assigned to: Ramos, Marga - 
Purpose: The bridge between the user interface and the computational logic.
         - Listens for DOM events (button clicks, form submissions).
         - Validates input fields to ensure no illegal characters are sent to the ALU.
         - Imports math functions from converter.js, alu.js, and rounding.js.
         - Executes GSAP animations to dynamically display the step-by-step trace data.
*/

import { encodeDecimal64, decodeDecimal64 } from './converter.js';
import { decimalRounding, binaryRounding } from './rounding.js';
import { FloatingPointALU } from './alu.js';

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // UI HELPER: Input Error Highlighter
    // ==========================================
    const triggerInputError = (inputElement) => {
        inputElement.classList.remove('error-state'); 
        void inputElement.offsetWidth; 
        inputElement.classList.add('error-state');
        
        inputElement.addEventListener('input', () => {
            inputElement.classList.remove('error-state');
        }, { once: true });
    };

    // ==========================================
    // 0. TAB SWITCHING LOGIC
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            panels.forEach(panel => {
                panel.classList.remove('active-panel');
                panel.classList.add('hidden-panel');
            });

            button.classList.add('active');
            const targetID = button.getAttribute('data-target');
            document.getElementById(targetID).classList.remove('hidden-panel');
            document.getElementById(targetID).classList.add('active-panel');
        });
    });

    // ==========================================
    // 1. CONVERTER ENGINE (Encode / Decode)
    // ==========================================
    document.getElementById('convert-btn').addEventListener('click', () => {
        const inputVal = document.getElementById('converter-input').value.trim();
        const outputDiv = document.getElementById('converter-output');
        
        if (!inputVal) {
            triggerInputError(document.getElementById('converter-input'));
            outputDiv.innerHTML = `<div class="text-bold" style="color: var(--accent-magenta);">Error: Please enter a value to convert.</div>`;
            return;
        }

        try {
            const isHex = /^0x[0-9a-fA-F]{16}$/i.test(inputVal) || /^[0-9a-fA-F]{16}$/i.test(inputVal);
            
            if (isHex) {
                const decoded = decodeDecimal64(inputVal);
                
                // Determine true type (handling qNaN vs sNaN based on hex prefix)
                let displayType = decoded.type;
                const upperHex = inputVal.toUpperCase().replace('0X', '');
                if (displayType === 'NaN' || displayType.includes('NaN')) {
                    displayType = upperHex.startsWith('7E') || upperHex.startsWith('FE') ? 'Signaling NaN (sNaN)' : 'Quiet NaN (qNaN)';
                }

                // Format the sign properly
                const signStr = (decoded.sign === 1n || decoded.sign === 1 || decoded.sign === '-') ? '1 (-)' : '0 (+)';
                const isNegative = signStr.includes('-');

                outputDiv.innerHTML = `
                    <h3 class="text-cyan text-upper trace-header">Decoded Result</h3>
                    <div class="text-mono trace-container" style="font-size: 1.2rem; margin-top: 1.5rem;">
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Type:</span> <span class="text-yellow text-bold">${displayType}</span></div>
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Sign Bit:</span> <span>${signStr}</span></div>
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Exponent:</span> <span>${decoded.exponent}</span></div>
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Coefficient:</span> <span class="break-text">${isNegative ? '-' : ''}${decoded.coefficient}</span></div>
                    </div>
                `;
            } else {
                const encoded = encodeDecimal64(inputVal);
                outputDiv.innerHTML = `
                    <h3 class="text-cyan text-upper trace-header">Encoded Result</h3>
                    <div class="text-mono trace-container" style="font-size: 1.2rem; margin-top: 1.5rem;">
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Type:</span> <span class="text-yellow text-bold">${encoded.type}</span></div>
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Hex:</span> <span class="text-yellow text-bold" style="font-size: 1.4rem;">0x${encoded.hex}</span></div>
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Binary:</span><br>
                        <span class="break-text" style="font-size: 1rem; color: var(--text-muted); margin-top: 0.5rem; display: block;">${encoded.binary}</span></div>
                    </div>
                `;
            }
            
            // Add the same smooth fade-in animation used by the ALU
            gsap.from("#converter-output .row", { opacity: 0, x: -20, duration: 0.4, stagger: 0.1, ease: "power2.out" });

        } catch (error) {
            outputDiv.innerHTML = `<div class="text-bold" style="color: var(--accent-magenta);">Error: ${error.message}</div>`;
        }
    });

    // ==========================================
    // 2. ROUNDING ENGINE
    // ==========================================
    document.getElementById('round-btn').addEventListener('click', () => {
        const val = document.getElementById('round-val').value.trim();
        const precisionStr = document.getElementById('round-precision').value;
        const base = document.getElementById('round-base').value;
        const outputDiv = document.getElementById('round-results');

        if (!val || !precisionStr) {
            if (!val) triggerInputError(document.getElementById('round-val'));
            if (!precisionStr) triggerInputError(document.getElementById('round-precision'));
            outputDiv.innerHTML = `<div class="text-bold" style="color: var(--accent-magenta);">Error: Please provide both number and precision.</div>`;
            return;
        }

        const precision = parseInt(precisionStr, 10);
        if (isNaN(precision) || precision <= 0) {
            triggerInputError(document.getElementById('round-precision'));
            outputDiv.innerHTML = `<div class="text-bold" style="color: var(--accent-magenta);">Error: Precision must be a positive integer.</div>`;
            return;
        }

        try {
            let result;
            if (base === "10") {
                result = decimalRounding(val, precision);
            } else {
                result = binaryRounding(val, precision);
            }

            const r = result.results;
            const signPrefix = result.parsed.sign === 1 ? '-' : '';
            
            outputDiv.innerHTML = `
                <h3 class="text-cyan text-upper trace-header">Rounding (Base ${base})</h3>
                <div class="text-mono">
                    <div style="margin-bottom: 1.5rem;">
                        <strong class="text-muted">Parsed Original:</strong> ${result.parsed.original}
                    </div>
                    <hr class="divider">
                    
                    <div class="grid-2-col">
                        <div><strong class="text-cyan">Truncate:</strong><br> ${signPrefix}${r.truncate.roundedDigits} <span class="text-muted" style="font-size: 0.9rem;">(exp ${r.truncate.finalExponent})</span></div>
                        <div><strong class="text-cyan">Round Up:</strong><br> ${signPrefix}${r.roundUp.roundedDigits} <span class="text-muted" style="font-size: 0.9rem;">(exp ${r.roundUp.finalExponent})</span></div>
                        <div><strong class="text-cyan">Round Down:</strong><br> ${signPrefix}${r.roundDown.roundedDigits} <span class="text-muted" style="font-size: 0.9rem;">(exp ${r.roundDown.finalExponent})</span></div>
                        <div><strong class="text-cyan">Round Nearest:</strong><br> ${signPrefix}${r.roundToNearest.roundedDigits} <span class="text-muted" style="font-size: 0.9rem;">(exp ${r.roundToNearest.finalExponent})</span></div>
                    </div>
                    
                    <hr class="divider">
                    <div class="text-yellow text-bold" style="font-size: 1.2rem;">
                        [ GRS Bits: ${r.truncate.Gbit} ${r.truncate.Rbit} ${r.truncate.Sbit} ]
                    </div>
                </div>
            `;
            
            gsap.from(outputDiv, { opacity: 0, y: 10, duration: 0.4 });
            
        } catch (error) {
            outputDiv.innerHTML = `<div class="text-bold" style="color: var(--accent-magenta);">Error: ${error.message}</div>`;
        }
    });

    // ==========================================
    // 3. ALU CALCULATE BUTTON (With Rubric Solution)
    // ==========================================
    document.getElementById('calculate-btn').addEventListener('click', () => {
        const valA = document.getElementById('alu-val-a').value.trim();
        const valB = document.getElementById('alu-val-b').value.trim();
        const operation = document.getElementById('alu-operation').value;
        const traceOutput = document.querySelector('#alu-panel .alu-trace-canvas');

        if (!valA || !valB) {
            if (!valA) triggerInputError(document.getElementById('alu-val-a'));
            if (!valB) triggerInputError(document.getElementById('alu-val-b'));
            traceOutput.innerHTML = `<div class="text-bold" style="color: var(--accent-magenta);">Error: Missing operands.</div>`;
            return;
        }

        try {
            const parseOperand = (val) => {
                val = val.trim();
                const isHex = /^0x[0-9a-fA-F]{16}$/i.test(val) || /^[0-9a-fA-F]{16}$/i.test(val);
                if (isHex) {
                    const cleanHex = val.toLowerCase().replace('0x', '');
                    const decoded = decodeDecimal64(val);
                    let decVal = decoded.type.includes('NaN') ? 'NaN' : 
                                 decoded.type.includes('Infinity') ? (decoded.sign == 1 ? '-Infinity' : 'Infinity') : 
                                 (decoded.sign == 1 ? '-' : '') + decoded.coefficient + 'e' + decoded.exponent;
                    
                    // Force the encoded object to strictly use the user's hex to avoid round-trip math bugs
                    let safeEncoded = encodeDecimal64(decVal);
                    safeEncoded.hex = cleanHex; 
                    return { rawStr: decVal, encoded: safeEncoded };
                }
                return { rawStr: val, encoded: encodeDecimal64(val) };
            };

            const parsedA = parseOperand(valA);
            const parsedB = parseOperand(valB);
            
            const encodedA = parsedA.encoded;
            const encodedB = parsedB.encoded;
            const rawA = parsedA.rawStr;
            const rawB = parsedB.rawStr;

            // SPECIAL CASES HANDLING
            const isSpecialA = encodedA.type === 'NaN' || encodedA.type.includes('Infinity');
            const isSpecialB = encodedB.type === 'NaN' || encodedB.type.includes('Infinity');
            
            if (isSpecialA || isSpecialB || (operation === 'divide' && Number(rawB) === 0)) {
                
                let numA = encodedA.type === 'NaN' ? NaN : (encodedA.type.includes('Infinity') ? (rawA.includes('-') ? -Infinity : Infinity) : Number(rawA));
                let numB = encodedB.type === 'NaN' ? NaN : (encodedB.type.includes('Infinity') ? (rawB.includes('-') ? -Infinity : Infinity) : Number(rawB));
                
                let finalNum;
                if (operation === 'subtract') finalNum = numA - numB;
                else finalNum = numA / numB;

                let finalEnc = encodeDecimal64(finalNum.toString());
                let isNaN = finalEnc.type === 'NaN';
                
                let binParts = finalEnc.binary.split(' ');
                let signBin = binParts[0];
                let comboBin = binParts[1];
                let expContBin = binParts[2];
                let coeffContBin = binParts.slice(3).join(' ');

                traceOutput.innerHTML = `
                    <h3 class="text-yellow text-upper trace-header">Trace: Special Case</h3>
                    <div class="text-mono" style="font-size: 1.2rem;">
                        <p class="text-muted">Arithmetic resulted in a special state: ${finalEnc.type}</p>
                        <hr class="divider">
                        <div class="result-box yellow-variant">
                            <strong class="text-yellow text-upper text-bold">Step-by-Step Solution</strong><br><br>
                            
                            <div style="margin-bottom: 1.2rem;">
                                <span class="text-muted text-bold" style="display: block; margin-bottom: 0.5rem;">i) Decimal Breakdown:</span>
                                <div class="rubric-indent">
                                    <div>Value: <strong>${finalNum}</strong></div>
                                    <div>Normalized? <strong>No (${finalEnc.type})</strong></div>
                                    <div>Combination field: <strong>${isNaN ? '11111 (NaN)' : '11110 (Infinity)'}</strong></div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 1.2rem;">
                                <span class="text-muted text-bold" style="display: block; margin-bottom: 0.5rem;">ii) Binary with proper spacing:</span>
                                <div class="rubric-indent" style="font-size: 0.95rem;">
                                    <div class="rubric-grid-header text-yellow text-upper text-bold">
                                        <span>Sign</span><span>Combination</span><span>Exp Cont.</span><span>Coefficient Cont.</span>
                                    </div>
                                    <div class="rubric-grid-data break-text">
                                        <span>${signBin}</span><span>${comboBin}</span><span>${expContBin}</span><span>${coeffContBin}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <span class="label-fixed text-bold">iii) Hexadecimal:</span> 
                                <span class="text-yellow text-bold" style="font-size: 1.2rem;">0x${finalEnc.hex}</span>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            // NORMAL EXECUTION
            let result;
            if (operation === 'subtract') {
                result = FloatingPointALU.subtract(encodedA.hex, encodedB.hex);
            } else {
                result = FloatingPointALU.divide(encodedA.hex, encodedB.hex);
            }

            if (result.error) throw new Error(result.message);

            const t = result.trace;
            
            const finalDecimalStr = result.finalDecimal; 
            let isNeg = finalDecimalStr.startsWith('-');
            let signBitDisplay = isNeg ? '1 (-)' : '0 (+)';
            let cleanStr = isNeg ? finalDecimalStr.substring(1) : finalDecimalStr;
            let [coeffStr, expStr] = cleanStr.split('e');
            
            let exp = parseInt(expStr, 10);
            let biasedExp = exp + 398;
            let msd = coeffStr[0];
            let msdBin = parseInt(msd, 10).toString(2).padStart(4, '0');
            
            // Calculate Standard Decimal for display (e.g., 13.25)
            let standardDecimal = Number(coeffStr) * Math.pow(10, exp);
            if (isNeg) standardDecimal = -standardDecimal;

            let binParts = result.finalBinary.split(' ');
            let signBin = binParts[0];
            let comboBin = binParts[1];
            let expContBin = binParts[2];
            let coeffContBin = binParts.slice(3).join(' ');

            const finalResultHTML = `
                <hr class="divider">
                <div class="result-box cyan-variant">
                    <strong class="text-cyan text-upper text-bold">Step-by-Step Solution</strong><br><br>
                    
                    <div style="margin-bottom: 1.2rem;">
                        <span class="text-muted text-bold" style="display: block; margin-bottom: 0.5rem;">i) Decimal Breakdown:</span>
                        <div class="rubric-indent">
                            <div style="margin-bottom: 0.2rem; font-size: 1.4rem;">${isNeg ? '-' : ''}${coeffStr} x 10<sup>${exp}</sup></div>
                            <div style="margin-bottom: 0.8rem; color: var(--text-muted);">Standard Value: <strong class="text-cyan">${standardDecimal}</strong></div>
                            
                            <div>Significand in decimal? <strong class="text-cyan">yes</strong></div>
                            <div>Base-10? <strong class="text-cyan">yes</strong></div>
                            <div>Normalized? <strong class="text-cyan">Yes, 16 whole digits</strong></div>
                            <div>MSD = <strong class="text-cyan">${msd} (${msdBin})</strong></div>
                            <div>Sign bit = <strong class="text-cyan">${signBitDisplay}</strong></div>
                            <div>e' = e + 398 &rarr; ${exp} + 398 = <strong class="text-cyan">${biasedExp}</strong></div>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.2rem;">
                        <span class="text-muted text-bold" style="display: block; margin-bottom: 0.5rem;">ii) Binary with proper spacing:</span>
                        <div class="rubric-indent" style="font-size: 0.95rem;">
                            <div class="rubric-grid-header text-cyan text-upper text-bold">
                                <span>Sign</span><span>Combination</span><span>Exp Cont.</span><span>Coefficient Cont.</span>
                            </div>
                            <div class="rubric-grid-data break-text">
                                <span>${signBin}</span><span>${comboBin}</span><span>${expContBin}</span><span>${coeffContBin}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <span class="label-fixed text-bold">iii) Hexadecimal:</span> 
                        <span class="text-yellow text-bold" style="font-size: 1.2rem;">0x${result.finalHex}</span>
                    </div>
                </div>
            `;

            if (operation === 'subtract') {
                traceOutput.innerHTML = `
                    <h3 class="text-cyan text-upper trace-header">Trace: Subtraction</h3>
                    <div class="text-mono trace-container" style="font-size: 1.2rem; margin-top: 1.5rem;">
                        <div class="row operand-a" style="margin-bottom: 0.8rem;">
                            <span class="label-fixed">A (exp ${t.operandA.exp}):</span> 
                            <span class="digits" style="letter-spacing: 2px;">${t.operandA.aligned}</span>
                        </div>
                        <div class="row operand-b" style="margin-bottom: 1.5rem;">
                            <span class="label-fixed">B (exp ${t.operandB.exp}):</span> 
                            <!-- Added display: inline-block below so GSAP can move the spans -->
                            <span class="digits b-digits" style="letter-spacing: 2px; display: inline-block;">${t.operandB.aligned}</span>
                            <span class="grs-bits" style="opacity: 0; margin-left: 15px; font-weight: bold; display: inline-block;">[GRS: ${t.grsBits}]</span>
                        </div>
                        <hr class="divider">
                        <div class="row result-row text-cyan" style="margin-bottom: 0.8rem;">
                            <span class="label-fixed-wide">Result (exp ${t.commonExponent}):</span>
                            <span class="digits" style="letter-spacing: 2px;">${t.rawResult}</span>
                        </div>
                        ${finalResultHTML}
                    </div>
                `;

                // Strictly scoped to #alu-panel to prevent overlapping opacity bugs
                const tl = gsap.timeline();
                tl.from("#alu-panel .row", { opacity: 0, y: 15, duration: 0.4, stagger: 0.1, ease: "power2.out" })
                  .to("#alu-panel .b-digits", { x: 15, duration: 0.8, ease: "power2.out", delay: 0.2 })
                  .to("#alu-panel .grs-bits", { opacity: 1, color: "#ffb703", textShadow: "0px 0px 10px rgba(255, 183, 3, 0.8)", duration: 0.4, x: 15 }, "-=0.5");
                  
            } else {
                traceOutput.innerHTML = `
                    <h3 class="text-cyan text-upper trace-header">Trace: Division</h3>
                    <div class="text-mono trace-container" style="font-size: 1.2rem; margin-top: 1.5rem;">
                        <div class="row" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Op A:</span> <span>${t.operandA.coeff} x 10^${t.operandA.exp}</span></div>
                        <div class="row" style="margin-bottom: 1.5rem;"><span class="label-fixed-wide">Op B:</span> <span>${t.operandB.coeff} x 10^${t.operandB.exp}</span></div>
                        <hr class="divider">
                        <div class="row text-cyan" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Raw Coeff:</span> ${t.rawResult}</div>
                        <div class="row text-cyan" style="margin-bottom: 0.8rem;"><span class="label-fixed-wide">Calculated Exp:</span> ${t.calculatedExponent}</div>
                        ${finalResultHTML}
                    </div>
                `;
                
                // Strictly scoped to #alu-panel
                gsap.from("#alu-panel .row", { opacity: 0, x: -20, duration: 0.4, stagger: 0.1, ease: "power2.out" });
            }

        } catch (error) {
            traceOutput.innerHTML = `<div class="text-bold" style="color: var(--accent-magenta);">Error: ${error.message}</div>`;
        }
    });
});