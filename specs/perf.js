// perf.js
import { performance } from 'perf_hooks';
import * as xmlNaming from './../src/index.js';

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

const ITERATIONS = 100_000;               // per measurement
const WARMUP_ITERATIONS = 10_000;         // discard first run to stabilise

// Test cases: label -> input string
const testCases = {
  'ASCII valid short': 'foo123',
  'ASCII invalid (starts with -)': '-bar',
  'Unicode valid short': 'élément',
  'Unicode invalid (combining start)': '\u0300abc',
  'ASCII long (1000 chars)': 'a'.repeat(1000),
  'Unicode long (1000 chars)': 'é'.repeat(1000),
};

// Validator functions to test
const functions = ['name', 'ncName', 'qName', 'nmToken', 'nmTokens'];

// Option combinations
const optionSets = [
  { xmlVersion: '1.0', asciiOnly: false },
  { xmlVersion: '1.1', asciiOnly: false },
  { xmlVersion: '1.0', asciiOnly: true },
];

// ----------------------------------------------------------------------------
// Benchmark helper
// ----------------------------------------------------------------------------

function measure(fn, iterations) {
  // warm‑up
  for (let i = 0; i < WARMUP_ITERATIONS; i++) fn();
  // measurement
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const end = performance.now();
  const elapsedMs = end - start;
  const opsPerSec = (iterations / elapsedMs) * 1000;
  return { opsPerSec, elapsedMs };
}

// ----------------------------------------------------------------------------
// Run benchmarks
// ----------------------------------------------------------------------------

const results = {};

for (const opts of optionSets) {
  const configKey = `xml${opts.xmlVersion}${opts.asciiOnly ? '-asciiOnly' : ''}`;
  results[configKey] = {};

  for (const fnName of functions) {
    results[configKey][fnName] = {};
    const validator = xmlNaming[fnName];

    for (const [label, input] of Object.entries(testCases)) {
      // Closure to avoid re‑binding on each loop
      const fn = () => validator(input, opts);
      const stats = measure(fn, ITERATIONS);
      results[configKey][fnName][label] = stats;
    }
  }
}

// ----------------------------------------------------------------------------
// Print results
// ----------------------------------------------------------------------------

console.log('\n=== xml-naming performance (ops/sec) ===');
console.log(`(iterations per measurement: ${ITERATIONS.toLocaleString()})\n`);

// Build a table with columns: config, function, case, ops/sec
const rows = [];

for (const [configKey, configResults] of Object.entries(results)) {
  for (const [fnName, fnResults] of Object.entries(configResults)) {
    for (const [label, stats] of Object.entries(fnResults)) {
      rows.push({
        config: configKey,
        fn: fnName,
        case: label,
        opsPerSec: stats.opsPerSec,
      });
    }
  }
}

// Sort: config → function → case
rows.sort((a, b) => a.config.localeCompare(b.config) ||
  a.fn.localeCompare(b.fn) ||
  a.case.localeCompare(b.case));

// Print as a table (simple alignment)
const colWidths = {
  config: 20,
  fn: 10,
  case: 25,
  ops: 14,
};

const header = `| ${'Configuration'.padEnd(colWidths.config)} | ${'Function'.padEnd(colWidths.fn)} | ${'Input case'.padEnd(colWidths.case)} | ${'ops/sec'.padEnd(colWidths.ops)} |`;
console.log(header);
console.log('-'.repeat(header.length));

for (const row of rows) {
  const line =
    `| ${row.config.padEnd(colWidths.config)} ` +
    `| ${row.fn.padEnd(colWidths.fn)} ` +
    `| ${row.case.padEnd(colWidths.case)} ` +
    `| ${row.opsPerSec.toFixed(0).padEnd(colWidths.ops)} |`;
  console.log(line);
}

console.log('\n(Note: higher ops/sec is better)');