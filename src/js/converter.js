/*
Assigned to: (Member 2 - DPD Converter)
Purpose: Responsible for all IEEE-754 Decimal64 encoding and decoding.
         - Parses raw base-10 strings and encodes them into Densely Packed Decimal (DPD).
         - Evaluates the 5-bit Combination Field and 10-bit declet conversions.
         - Unpacks 16-character hexadecimal strings into sign, exponent, and significand.
         - Instantly traps and flags special cases: ±Infinity, ±Zero, and NaN.
*/