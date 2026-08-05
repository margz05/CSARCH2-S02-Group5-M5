# **Machine 5: Decimal 64-bit Floating-Point Machine** 

#### **De La Salle University | CSARCH2 - Machine 5** 

## **Project Overview** 

This web application is a visual simulator for IEEE-754 Decimal64 floating-point arithmetic. It provides an interactive, step-by-step trace of how numbers are encoded into densely packed decimal (DPD) format, rounded using standard IEEE rules, and processed through an Arithmetic Logic Unit (ALU) for subtraction and division. 

#### **Developed by Group 5:** 

- Marga Ramos (UI/UX & System Integration) 

- Jamie Iringan (ALU Logic) 

- Justin Doctora (Decimal64 Converter) 

- Kyan Tiongco (Rounding Engine) 

## 🚀 **Live Deployment** 

- **Live Website URL:** <u><mark>https://margz05.github.io/Machine5-Decimal64/</mark></u> 

- **<mark>V</mark> ideo Walkthrough:** <u>https://youtu.be/LgZVHmTaI3g</u> 

## **DOCUMENTATION LOGS** 🛠 

### **UI/UX & System Integration** 

**Date:** August 4, 2026 

**Author:** Ramos, Margaret Patrice M. 

**Module:** Front-End UI, JavaScript Logic Integration, Responsive Design, & Visual Polish 

#### **Status Update:** 

- **Responsive Grid & Layout Refinement:** Overhauled the application's layout using a responsive CSS Grid <mark>(split-layout)</mark> , adjusting column proportions <mark>(1fr 2.5fr)</mark> and expanding gap spacing <mark>(7rem)</mark> to ensure optimal visual breathing room. Enforced strict <mark>box-sizing: border-box</mark> across all form elements to completely eliminate mobile layout bleeding and container overflows. 

- **Cyber/Hardware Dark Mode & Projector Safety:** Implemented a projector-safe theme featuring a slowly panning animated background grid <mark>(panGrid)</mark> , refined <mark>:root</mark> color tokens <mark>(#0f111a</mark> base, <mark>#00b4d8</mark> cyan accents, <mark>#a0aabf</mark> brightened muted text), and 

stripped away heavy text glows <mark>(text-shadow)</mark> to prevent smearing during academic presentations. 

- **Component-Wide Terminal Architecture:** Refactored <mark>ui.js</mark> and <mark>index.html</mark> to unify all three modules (Decoder, Precision Engine, ALU) under a consistent, professional terminal output aesthetic <mark>(.alu-trace-canvas)</mark> , complete with "Waiting for input..." initial states and zero-state placeholder isolation. 

- **Custom Interactive Form Elements:** Upgraded native <mark><select></mark> dropdown menus by stripping default OS styling, injecting a custom centered cyan SVG arrow, adding smooth hover/active lifts <mark>(translateY)</mark> , and overriding default gray list backgrounds with deep theme colors <mark>(--bg-base)</mark> . Scaled down action buttons <mark>(#convert-btn,</mark> etc.) to match input proportions cleanly. 

- **Advanced Error Handling & Hex Parsing:** Engineered robust input validation helpers <mark>(triggerInputError)</mark> and fixed hex operand parsing in the ALU to securely accept valid Decimal64 hex strings without corrupting backend math logic. 

- **Special Case & NaN Differentiation:** Integrated support for identifying distinct NaN states—differentiating between Quiet NaNs (qNaN, <mark>0x7C...)</mark> and Signaling NaNs (sNaN, <mark>0x7E...)</mark> based on user group requirements—alongside proper negative sign visualization in the Decoder. 

- **GSAP Animation Scoping:** Resolved critical DOM targeting bugs by strictly scoping GSAP entrance and stagger timelines to active panels (e.g., <mark>#alu-panel .row)</mark> , ensuring smooth entrance traces without ghost element clipping or hidden text bugs. 

- **Mobile Adaptability:** Added comprehensive CSS media queries <mark>(max-width: 950px</mark> and <mark>650px)</mark> enabling automatic vertical grid stacking, wrapped navbar tabs with row-gap safety, horizontal scrolling <mark>(overflow-x: auto)</mark> for long IEEE-754 binary strings, and an academic project footer detailing DLSU course metadata. 

#### **Known Issues / Roadblocks:** 

- Encountered a GSAP targeting bug where global <mark>.row</mark> query selectors unintentionally hid elements across inactive tabs; resolved by strictly scoping selectors to active panels. 

- Fixed CSS Box-Model padding issues where inputs broke out of containers on mobile by applying <mark>box-sizing: border-box.</mark> 

- Resolved layout overflow issues with long IEEE-754 binary strings by establishing horizontal touch scrolling and minimum widths for rubric data grids. 

### **ALU Logic** 

**Date:** August 4, 2026 

**Author:** Iringan, Jamie 

**Module:** ALU | 64-Bit Floating-Point Subtraction & Division 

#### **Status Update:** 

- Started with the exponent alignment since both operands needed to have the same exponent before subtraction or division. 

- Finished the subtraction and division parts. Also added the Guard, Round, and Sticky (GRS) bit handling so the result rounds properly. 

- Integrated standard decimal value rendering alongside exponent breakdowns in the step-by-step trace output. 

#### **Known Issues / Roadblocks:** 

- The Sticky bit took longer than expected. I kept getting different outputs whenever the exponent gap became too large, so I had to check how the discarded bits were being handled. 

- Division by zero also needed its own condition since it could not go through the same steps as the other operations. 

### **Decimal64 Converter** 

**Date:** August 4, 2026 

**Author:** Doctora, Justin S. 

**Module:** Decimal 64-bit Floating-Point Machine | Convert decimal to decimal-based double-precision 

#### **Status Update:** 

- Started on the program, including most of the special cases (NaN, Infinity, Zeroes). 

- Polished the program, adding and identifying special cases such as positive and negative infinity, sNaN <mark>(0x7E...)</mark> , and qNaN <mark>(0x7C...)</mark> . 

- Validated hexadecimal decoding output to ensure sign bits and coefficients display accurately. 

#### **Known Issues / Roadblocks:** 

- Had a hard time thinking if I should include the different special cases instead of just presenting one, like NaN as qNaN only. 

### **Rounding Engine** 

**Date:** August 4, 2026 

**Author:** Tiongco, Kyan Thomas T. 

**Module:** Rounding Validator 

#### **Status Update:** 

- Completion of taking in decimal and binary input with configurable precision. 

- Implementation of the GRS extracting for the discarded digits/bits. 

- Implementation of the different methods like truncation, rounding up, rounding down, and round to nearest ties to even. 

- Added carry propagation, overflow normalization, and adjustment of exponents. 

- Added error handling and input validation for various decimal & binary values, sign, exponent, precision, and base. 

- Finalized the final functions <mark>decimalRounding()</mark> and <mark>binaryRounding()</mark> that will return the answers using all four methods. 

#### **Known Issues / Roadblocks:** 

- Got stuck with an infinite recursion within <mark>decimalRounding().</mark> 

- Small trial and error in the exponent adjustment as digits were discarded and had to account for both the discarded digits and the overflow. 

- Logic problem between the decimal and binary rounding because of their bases and carry limits are different; fixed it by just counting in both base 10 or base 2. 

