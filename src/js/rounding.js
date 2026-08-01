/*
Assigned to: (Member 4 - Rounding Validator)
Purpose: Manages precision rules and Guard, Round, and Sticky (GRS) evaluation.
         - Contains a standalone utility for the Rounding Demonstrator feature.
         - Evaluates bits/digits shifted out during ALU exponent alignment to set GRS.
         - Applies the four IEEE-754 rounding rules: Chopping, Round-Up, Round-Down, 
           and Round-to-Nearest Ties-to-Even.
*/