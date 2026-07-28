/**
 * Expression evaluator for Google-style calculator.
 * Supports: + − × ÷ % ^ ! √ π e parentheses, sin/cos/tan/asin/acos/atan, ln/log
 */
(function (global) {
  "use strict";

  const OPS = {
    "+": { prec: 1, assoc: "L", fn: (a, b) => a + b },
    "−": { prec: 1, assoc: "L", fn: (a, b) => a - b },
    "-": { prec: 1, assoc: "L", fn: (a, b) => a - b },
    "×": { prec: 2, assoc: "L", fn: (a, b) => a * b },
    "*": { prec: 2, assoc: "L", fn: (a, b) => a * b },
    "÷": { prec: 2, assoc: "L", fn: (a, b) => a / b },
    "/": { prec: 2, assoc: "L", fn: (a, b) => a / b },
    "%": { prec: 2, assoc: "L", fn: (a, b) => a % b },
    "^": { prec: 3, assoc: "R", fn: (a, b) => Math.pow(a, b) },
  };

  const FUNCS = {
    sin: (x, deg) => Math.sin(deg ? (x * Math.PI) / 180 : x),
    cos: (x, deg) => Math.cos(deg ? (x * Math.PI) / 180 : x),
    tan: (x, deg) => Math.tan(deg ? (x * Math.PI) / 180 : x),
    asin: (x, deg) => {
      const v = Math.asin(x);
      return deg ? (v * 180) / Math.PI : v;
    },
    acos: (x, deg) => {
      const v = Math.acos(x);
      return deg ? (v * 180) / Math.PI : v;
    },
    atan: (x, deg) => {
      const v = Math.atan(x);
      return deg ? (v * 180) / Math.PI : v;
    },
    ln: (x) => Math.log(x),
    log: (x) => Math.log10(x),
    sqrt: (x) => Math.sqrt(x),
    abs: (x) => Math.abs(x),
  };

  function factorial(n) {
    if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
      throw new Error("Invalid factorial");
    }
    if (n > 170) throw new Error("Overflow");
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function tokenize(input) {
    const src = String(input)
      .replace(/\s+/g, "")
      .replace(/π/g, "pi")
      .replace(/√/g, "sqrt")
      .replace(/−/g, "-");

    const tokens = [];
    let i = 0;

    while (i < src.length) {
      const ch = src[i];

      if (/[0-9.]/.test(ch)) {
        let num = ch;
        i++;
        while (i < src.length && /[0-9.]/.test(src[i])) {
          num += src[i++];
        }
        if ((num.match(/\./g) || []).length > 1) throw new Error("Bad number");
        tokens.push({ type: "num", value: parseFloat(num) });
        continue;
      }

      if (/[a-z]/i.test(ch)) {
        let name = ch;
        i++;
        while (i < src.length && /[a-z]/i.test(src[i])) {
          name += src[i++];
        }
        name = name.toLowerCase();
        if (name === "pi") {
          tokens.push({ type: "num", value: Math.PI });
        } else if (name === "e") {
          tokens.push({ type: "num", value: Math.E });
        } else if (FUNCS[name]) {
          tokens.push({ type: "func", value: name });
        } else {
          throw new Error("Unknown function");
        }
        continue;
      }

      if (ch === "(" || ch === ")") {
        tokens.push({ type: ch === "(" ? "lparen" : "rparen", value: ch });
        i++;
        continue;
      }

      if (ch === "!") {
        tokens.push({ type: "fact", value: "!" });
        i++;
        continue;
      }

      if ("+-*/^%×÷".includes(ch)) {
        const op = ch === "*" ? "×" : ch === "/" ? "÷" : ch;
        tokens.push({ type: "op", value: op === "-" ? "−" : op });
        i++;
        continue;
      }

      throw new Error("Invalid character");
    }

    return tokens;
  }

  function insertImplicitMultiplication(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      const prev = out[out.length - 1];
      const cur = tokens[i];
      if (
        prev &&
        (prev.type === "num" || prev.type === "rparen" || prev.type === "fact") &&
        (cur.type === "num" || cur.type === "func" || cur.type === "lparen")
      ) {
        out.push({ type: "op", value: "×" });
      }
      out.push(cur);
    }
    return out;
  }

  function handleUnary(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const prev = out[out.length - 1];
      if (
        t.type === "op" &&
        (t.value === "−" || t.value === "+") &&
        (!prev || prev.type === "op" || prev.type === "lparen" || prev.type === "func")
      ) {
        if (t.value === "+") continue;
        out.push({ type: "func", value: "neg" });
        continue;
      }
      out.push(t);
    }
    return out;
  }

  function toRpn(tokens) {
    const output = [];
    const stack = [];

    for (const t of tokens) {
      if (t.type === "num") {
        output.push(t);
      } else if (t.type === "func") {
        stack.push(t);
      } else if (t.type === "op") {
        const o1 = OPS[t.value];
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type !== "op") break;
          const o2 = OPS[top.value];
          if (
            (o1.assoc === "L" && o1.prec <= o2.prec) ||
            (o1.assoc === "R" && o1.prec < o2.prec)
          ) {
            output.push(stack.pop());
          } else break;
        }
        stack.push(t);
      } else if (t.type === "lparen") {
        stack.push(t);
      } else if (t.type === "rparen") {
        while (stack.length && stack[stack.length - 1].type !== "lparen") {
          output.push(stack.pop());
        }
        if (!stack.length) throw new Error("Mismatched parentheses");
        stack.pop();
        if (stack.length && stack[stack.length - 1].type === "func") {
          output.push(stack.pop());
        }
      } else if (t.type === "fact") {
        output.push(t);
      }
    }

    while (stack.length) {
      const t = stack.pop();
      if (t.type === "lparen" || t.type === "rparen") {
        throw new Error("Mismatched parentheses");
      }
      output.push(t);
    }

    return output;
  }

  function evalRpn(rpn, { degrees = true } = {}) {
    const stack = [];

    for (const t of rpn) {
      if (t.type === "num") {
        stack.push(t.value);
      } else if (t.type === "op") {
        if (stack.length < 2) throw new Error("Incomplete expression");
        const b = stack.pop();
        const a = stack.pop();
        const v = OPS[t.value].fn(a, b);
        if (!Number.isFinite(v)) throw new Error("Error");
        stack.push(v);
      } else if (t.type === "func") {
        if (t.value === "neg") {
          if (!stack.length) throw new Error("Incomplete expression");
          stack.push(-stack.pop());
          continue;
        }
        if (!stack.length) throw new Error("Incomplete expression");
        const x = stack.pop();
        const fn = FUNCS[t.value];
        if (!fn) throw new Error("Unknown function");
        const v = fn(x, degrees);
        if (!Number.isFinite(v)) throw new Error("Error");
        stack.push(v);
      } else if (t.type === "fact") {
        if (!stack.length) throw new Error("Incomplete expression");
        stack.push(factorial(stack.pop()));
      }
    }

    if (stack.length !== 1) throw new Error("Incomplete expression");
    return stack[0];
  }

  function evaluate(expr, options = {}) {
    const trimmed = String(expr).trim();
    if (!trimmed || trimmed === "0") return { ok: true, value: 0, incomplete: false };

    try {
      let tokens = tokenize(trimmed);
      tokens = insertImplicitMultiplication(tokens);
      tokens = handleUnary(tokens);
      const rpn = toRpn(tokens);
      const value = evalRpn(rpn, options);
      return { ok: true, value, incomplete: false };
    } catch (err) {
      const msg = err && err.message ? err.message : "Error";
      const incomplete =
        msg === "Incomplete expression" ||
        msg === "Mismatched parentheses";
      return { ok: false, error: msg, incomplete };
    }
  }

  function formatNumber(n, { useGrouping = true, maxFrac = 12 } = {}) {
    if (!Number.isFinite(n)) return "Error";
    if (Object.is(n, -0)) n = 0;

    const abs = Math.abs(n);
    if ((abs !== 0 && abs < 1e-7) || abs >= 1e12) {
      return n.toExponential(6).replace(/\.?0+e/, "e").replace("e+", "e");
    }

    let s = Number(n.toPrecision(12)).toString();
    if (s.includes("e") || s.includes("E")) {
      return s.replace("E", "e").replace("e+", "e");
    }

    if (!useGrouping) return s;

    const neg = s.startsWith("-");
    if (neg) s = s.slice(1);
    const [intPart, frac] = s.split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + grouped + (frac != null ? "." + frac.slice(0, maxFrac) : "");
  }

  global.CalcEngine = { evaluate, formatNumber, FUNCS };
})(typeof window !== "undefined" ? window : globalThis);
