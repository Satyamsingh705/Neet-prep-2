# Comprehensive Guide: Creating JSON Questions

This document explains exactly how to format questions for your platform. It covers everything from standard multiple-choice questions to complex tabular (Match the Following) formats and professional mathematics (Physics/Chemistry).

---

## 1. The Basic Question Structure
Every question in your JSON array must be an object `{ ... }` containing the following core fields:

```json
{
    "type": "TEXT",
    "subject": "PHYSICS", 
    "chapter": "Units and Measurement",
    "prompt": "What is the text of the question?",
    "options": [
        { "key": "A", "text": "Option 1" },
        { "key": "B", "text": "Option 2" },
        { "key": "C", "text": "Option 3" },
        { "key": "D", "text": "Option 4" }
    ],
    "correctAnswers": ["A"]
}
```

---

## 2. Match the Following / Tabular Format (Biology)
For "Match List I with List II" questions, you can include a `"table"` property.

**Rules for Tables:**
* `headers`: An array of text for the top row. Use empty strings `""` if a column shouldn't have a header.
* `rows`: An array of arrays, representing the grid.

**Example (Biology Match):**
```json
{
    "type": "TEXT",
    "subject": "BIOLOGY",
    "chapter": "Cell: The Unit of Life",
    "prompt": "Match List-I with List- II.",
    "table": {
        "headers": ["", "List - I", "", "List - II"],
        "rows": [
            ["A", "Centromere", "I", "Mitochondrion"],
            ["B", "Cilium", "II", "Cell division"],
            ["C", "Cristae", "III", "Cell movement"],
            ["D", "Cell membrane", "IV", "Phospholipid Bilayer"]
        ]
    },
    "options": [
        { "key": "A", "text": "A-IV, B-II, C-III, D-I" },
        { "key": "B", "text": "A-II, B-III, C-I, D-IV" },
        { "key": "C", "text": "A-I, B-II, C-III, D-IV" },
        { "key": "D", "text": "A-II, B-I, C-IV, D-III" }
    ],
    "correctAnswers": ["B"]
}
```

---

## 3. Physics & Math Equations (Fractions, Roots, Integrals)
Your platform uses **KaTeX** to render professional mathematics. 

### Golden Rules for Math in JSON:
1. **The Double Backslash (`\\`)**: In JSON, the `\` symbol is an escape character. To write a LaTeX command like `\frac`, you **MUST** use double backslashes: `"\\frac"`.
2. **Inline Math (`$ ... $`)**: Use single dollar signs to put math inside a normal sentence. Example: `"The velocity is $v$."`
3. **Block Math (`$$ ... $$`)**: Use double dollar signs to make a large, centered equation on its own line.

### Common Math Symbols:
| What you want | LaTeX code | What to type in JSON |
| :--- | :--- | :--- |
| **Fraction** | `\frac{top}{bottom}` | `"\\frac{a}{b}"` |
| **Square Root** | `\sqrt{x}` | `"\\sqrt{a^2 - x^2}"` |
| **Superscript (Power)** | `x^{2}` | `"x^{2}"` |
| **Subscript (Base)** | `x_{1}` | `"x_{1}"` |
| **Integral** | `\int` | `"\\int"` |
| **Infinity** | `\infty` | `"\\infty"` |
| **Greek Letters** | `\alpha, \beta, \pi` | `"\\alpha, \\beta, \\pi"` |

**Example (Physics Equation):**
```json
{
    "type": "TEXT",
    "subject": "PHYSICS",
    "chapter": "Motion in a Straight Line",
    "prompt": "Evaluate the following integral: $$ \\int \\frac{dx}{\\sqrt{a^2-x^2}} $$",
    "options": [
        { "key": "A", "text": "$\\frac{1}{a}\\sin^{-1}\\left(\\frac{x}{a}\\right)$" },
        { "key": "B", "text": "$\\sin^{-1}\\left(\\frac{x}{a}\\right)$" },
        { "key": "C", "text": "$\\frac{1}{a}\\cos^{-1}\\left(\\frac{x}{a}\\right)$" },
        { "key": "D", "text": "$\\tan^{-1}\\left(\\frac{x}{a}\\right)$" }
    ],
    "correctAnswers": ["B"]
}
```
*Note: We use `\\left(` and `\\right)` so that the parentheses dynamically resize to fit the tall fraction inside them!*

---

## 4. Chemistry (Chemical Reactions & Isotopes)

Chemistry heavily relies on subscripts (for molecules like H₂O) and superscripts (for charges like Na⁺ or isotopes like ¹⁴C).

* **Subscripts (Number at the bottom):** Use `_`. For multiple characters, use curly braces: `_{...}`.
* **Superscripts (Number at the top):** Use `^`. For multiple characters, use curly braces: `^{...}`.
* **Right Arrow (Reactions):** Use `\\rightarrow`.

**Example (Chemistry Reaction):**
```json
{
    "type": "TEXT",
    "subject": "CHEMISTRY",
    "chapter": "Thermodynamics",
    "prompt": "What is the standard enthalpy change for the combustion of methane? $$ CH_4(g) + 2O_2(g) \\rightarrow CO_2(g) + 2H_2O(l) $$",
    "options": [
        { "key": "A", "text": "$-890.3 \\text{ kJ/mol}$" },
        { "key": "B", "text": "$+890.3 \\text{ kJ/mol}$" },
        { "key": "C", "text": "$-393.5 \\text{ kJ/mol}$" },
        { "key": "D", "text": "$+285.8 \\text{ kJ/mol}$" }
    ],
    "correctAnswers": ["A"]
}
```
*Note: `\\text{...}` is used inside math blocks when you want to write normal text like units (kJ/mol) so it doesn't get italicized like algebra variables.*

---

## Quick Troubleshooting Checklist
* **Are my fractions showing up as plain text?** Make sure you wrapped them in `$` or `$$`.
* **Did my app crash or fail to load the JSON?** You probably missed escaping a backslash (e.g. you wrote `\frac` instead of `\\frac`) or missed a comma `,` between options.
* **Are my superscripts getting cut off? (e.g., x^10 looks like x¹0)** Ensure you use curly braces for anything longer than one character: `x^{10}` instead of `x^10`.
