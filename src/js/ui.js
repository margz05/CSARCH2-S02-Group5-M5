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

    // TAB SWITCHING LOGIC
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

    // ALU Calculate Button Listener
    document.getElementById('calculate-btn').addEventListener('click', () => {
        const valA = document.getElementById('alu-val-a').value.trim();
        const valB = document.getElementById('alu-val-b').value.trim();
        const operation = document.getElementById('alu-operation').value;
        const traceOutput = document.querySelector('.alu-trace-canvas');

        // Validation
        if (!valA || !valB) {
            traceOutput.innerHTML = `<div style="color: var(--accent-magenta); font-weight: bold;">Error: Missing operands.</div>`;
            return;
        }

        try {
            // 1. Encode raw decimal inputs to Hex (Because alu.js expects hex strings)
            const encodedA = encodeDecimal64(valA);
            const encodedB = encodeDecimal64(valB);

            // Handle special states before doing math
            if (encodedA.type !== 'Finite' || encodedB.type !== 'Finite') {
                traceOutput.innerHTML = `<div style="color: #ffb703; font-size: 1.5rem; font-weight: 900; text-align: center; margin-top: 2rem;">[ SPECIAL STATE DETECTED ]<br><span style="font-size: 1rem; color: var(--text-muted);">Arithmetic Bypassed.</span></div>`;
                return;
            }

            // 2. Execute ALU Logic
            let result;
            if (operation === 'subtract') {
                result = FloatingPointALU.subtract(encodedA.hex, encodedB.hex);
            } else {
                result = FloatingPointALU.divide(encodedA.hex, encodedB.hex);
            }

            if (result.error) throw new Error(result.message);

            const t = result.trace;
            
            // 3. Render the GSAP-animated Trace Output
            if (operation === 'subtract') {
                traceOutput.innerHTML = `
                    <h3 style="color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; margin-top: 0;">Trace: Subtraction</h3>
                    <div class="trace-container" style="font-size: 1.2rem; margin-top: 1.5rem; font-family: 'Courier New', monospace;">
                        <div class="row operand-a" style="margin-bottom: 0.8rem;">
                            <span class="label" style="color: var(--text-muted); display: inline-block; width: 160px;">A (exp ${t.operandA.exp}):</span> 
                            <span class="digits" style="letter-spacing: 2px;">${t.operandA.aligned}</span>
                        </div>
                        <div class="row operand-b" style="margin-bottom: 1.5rem;">
                            <span class="label" style="color: var(--text-muted); display: inline-block; width: 160px;">B (exp ${t.operandB.exp}):</span> 
                            <span class="digits b-digits" style="letter-spacing: 2px;">${t.operandB.aligned}</span>
                            <span class="grs-bits" style="opacity: 0; margin-left: 15px; font-weight: bold;">[GRS: ${t.grsBits}]</span>
                        </div>
                        <hr style="border-color: rgba(255,255,255,0.1); margin: 1.5rem 0;">
                        <div class="row result-row" style="color: var(--accent-cyan); margin-bottom: 0.8rem;">
                            <span class="label" style="display: inline-block; width: 160px;">Result (exp ${t.commonExponent}):</span>
                            <span class="digits" style="letter-spacing: 2px;">${t.rawResult}</span>
                        </div>
                        <div class="row hex-row" style="margin-top: 2rem; font-size: 1.8rem; font-weight: 900; color: #ffb703; text-shadow: 0 0 15px rgba(255, 183, 3, 0.4);">
                            0x${result.finalHex}
                        </div>
                    </div>
                `;

                // GSAP Animation: Aligns Operand B and reveals GRS bits
                const tl = gsap.timeline();
                tl.from(".row", { opacity: 0, y: 15, duration: 0.4, stagger: 0.1, ease: "power2.out" })
                  .to(".b-digits", { x: 15, duration: 0.8, ease: "power2.out", delay: 0.2 })
                  .to(".grs-bits", { opacity: 1, color: "#ffb703", textShadow: "0px 0px 10px rgba(255, 183, 3, 0.8)", duration: 0.4, x: 15 }, "-=0.5");
                  
            } else {
                // Division Render (Simpler layout since it doesn't align exponents)
                traceOutput.innerHTML = `
                    <h3 style="color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; margin-top: 0;">Trace: Division</h3>
                    <div class="trace-container" style="font-size: 1.2rem; margin-top: 1.5rem; font-family: 'Courier New', monospace;">
                        <div class="row" style="margin-bottom: 0.8rem;"><strong>Op A:</strong> <span style="color: var(--text-muted);">${t.operandA.coeff} x 10^${t.operandA.exp}</span></div>
                        <div class="row" style="margin-bottom: 1.5rem;"><strong>Op B:</strong> <span style="color: var(--text-muted);">${t.operandB.coeff} x 10^${t.operandB.exp}</span></div>
                        <hr style="border-color: rgba(255,255,255,0.1); margin: 1.5rem 0;">
                        <div class="row" style="color: var(--accent-cyan); margin-bottom: 0.8rem;"><strong>Result Coefficient:</strong> ${t.rawResult}</div>
                        <div class="row" style="color: var(--accent-cyan); margin-bottom: 0.8rem;"><strong>Calculated Exponent:</strong> ${t.calculatedExponent}</div>
                        <div class="row hex-row" style="margin-top: 2rem; font-size: 1.8rem; font-weight: 900; color: #ffb703; text-shadow: 0 0 15px rgba(255, 183, 3, 0.4);">
                            0x${result.finalHex}
                        </div>
                    </div>
                `;
                
                // Stagger fade-in for division
                gsap.from(".row", { opacity: 0, x: -20, duration: 0.4, stagger: 0.1, ease: "power2.out" });
            }

        } catch (error) {
            traceOutput.innerHTML = `<div style="color: var(--accent-magenta); font-weight: bold; font-size: 1.2rem;">Error: ${error.message}</div>`;
        }
    });
});