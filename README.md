# Calculator (eCalculator)

A high-performance, precision scientific and complex number calculator web application built with React, TypeScript, and Tailwind CSS. Originally inspired by advanced scientific desktop calculators and engineered with dedicated support for advanced mathematical operations, storage variables, and robust cross-platform keyboard input handling.

---

## 📚 Table of Contents

- [Introduction](#introduction)
- [✨ Key Features](#-key-features)
  - [🧮 Scientific & Complex Engine](#-scientific--complex-engine)
  - [💾 Storage Variables ($x, y, z, w$) & Memory](#-storage-variables-x-y-z-w--memory)
  - [⌨️ Cross-Platform Triple-Keyboard Architecture](#️-cross-platform-triple-keyboard-architecture)
  - [🛡️ Error Handling & Smart Validations](#️-error-handling--smart-validations)
  - [🎨 User Interface & Accessibility](#-user-interface--accessibility)
- [▶️ How to Run](#️-how-to-run)
- [🛠️ Tech Stack](#️-tech-stack)
- [📜 License](#-license)

---

## Introduction

**eCalculator** delivers a robust computational experience designed for students, engineers, and researchers. It integrates advanced symbolic and numerical algorithms for real and complex numbers, multi-digit superscript exponents, persistent algebraic storage variables, and independent controllers for desktop and mobile keyboards.

---

## ✨ Key Features

### 🧮 Scientific & Complex Engine
- **Complex Numbers**: Full arithmetic with the imaginary unit ($\mathbf{i}$), rectangular representations ($a + bi$), and multi-digit superscript powers (up to 3 digits like $\mathbf{i}^{392}$ and $\mathbf{i}^{999}$).
- **Trigonometric & Hyperbolic Functions**: Standard and inverse trigonometric (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`) and hyperbolic functions (`sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`) with configurable angle modes (`DEG` / `RAD`).
- **Logarithms & Exponentials**: Natural logarithm (`ln`), base-10 logarithm (`log`), Euler's constant ($e$), and Pi ($\pi$).
- **Roots & Factorials**: Square root ($\sqrt{x}$), general root ($^a\sqrt{b}$), and integer factorial ($x!$).
- **Powers & Superscripts**: Support for superscript exponents ($⁰$ through $⁹$) with seamless cycling, replacement with `^`, and maximum limits.

### 💾 Storage Variables ($x, y, z, w$) & Memory
- **Persistent Storage**: Save (`SET`) and recall (`GET`) variables across sessions.
- **Dependency & Cycle Detection**: Evaluates multi-variable expressions while preventing recursive references and circular definitions.
- **Smart Missing-Variable Toasts**: Automatically identifies and lists unassigned variables in their order of appearance if evaluated after the initial session syntax modal.
- **Calculation History (RAM Memory)**: Quick access recall button (`m`) to cycle through the last 20 executed expressions.

### ⌨️ Cross-Platform Triple-Keyboard Architecture
Engineered with strict independence between input controllers to avoid cross-conflicts:
1. **Physical Desktop Keyboard**: Handles native keystrokes, shortcuts, function hotkeys, and cursor-aware superscript expansions.
2. **Mobile OS Virtual Keyboard**: Reactive `textarea` change processor with real-time replication filtering and caret preservation.
3. **App Virtual Keypad**: Touch-optimized on-screen keypad with haptic feedback, operator chaining, and auto-squaring (`χ²`).

### 🛡️ Error Handling & Smart Validations
- **Strict Syntax & Domain Guards**: Clear distinction between mathematical singularities (`Math Error`) and malformed expressions (`Sys Error`).
- **Single Decimal Guard**: Strict rule enforcing at most one decimal point/comma per numerical token.
- **Anti-Replication Controls**: Prevents accidental double operators, repeated commas, or duplicate percentages.
- **Parentheses Balance**: Automatic balancing of missing opening or closing parentheses on execution.

### 🎨 User Interface & Accessibility
- **Responsive Layout**: Designed for seamless scaling across mobile viewports, tablets, and desktop displays.
- **Adaptive Typography**: Dynamic text sizing to display lengthy expressions and multi-digit complex results without truncation or overflow.
- **Bilingual Interface**: Quick toggle between Spanish (Español) and English (Inglés) for all UI labels, modals, and toasts.

---

## ▶️ How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation & Development
1. Clone the repository or navigate to the project directory:
   ```bash
   cd eva-calculator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. Build for production:
   ```bash
   npm run build
   ```

5. Type check and lint:
   ```bash
   npm run lint
   ```

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📜 License

This project is not a free software at this moment. © 2025 Microcore/Eva Corporation. All rights reserved.
