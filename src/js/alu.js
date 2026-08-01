/*
Assigned to: (Member 3 - ALU Core)
Purpose: Handles the raw mathematical operations.
         - Analyzes the exponents of two decoded operands and aligns the smaller one.
         - Performs base-10 subtraction and division on the significands.
         - Generates a structured JSON "Trace Object" that records the initial state, 
           the aligned state, the raw calculation, and the final normalized state to 
           send back to ui.js for rendering.
*/