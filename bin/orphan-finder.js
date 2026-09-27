#!/usr/bin/env node
'use strict'

const path = require('node:path')
const { scanOrphans, buildReport, writeOutputs } = require('../lib/index.js')

function parseArgs (argv) {
  const opts = { root: '.', out: 'orphan-finder-report', reportEmail: 'support@devcentr.org', fail: false, jsonStdout: false }
  const args = argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--root') opts.root = args[++i]
    else if (a === '--out') opts.out = args[++i]
    else if (a === '--report-email') opts.reportEmail = args[++i]
    else if (a === '--fail') opts.fail = true
    else if (a === '--json') opts.jsonStdout = true
    else if (a === '--help' || a === '-h') opts.help = true
    else if (!a.startsWith('-') && opts.root === '.') opts.root = a
  }
  return opts
}

function main () {
  const opts = parseArgs(process.argv)
  if (opts.help) {
    console.log('Usage: orphan-finder [--root DIR] [--out DIR] [--report-email ADDR] [--fail] [--json]\nSupport: support@devcentr.org')
    process.exit(0)
  }
  const scan = scanOrphans(path.resolve(opts.root))
  const report = buildReport(scan, { reportEmail: opts.reportEmail })
  const outDir = path.resolve(opts.out)
  writeOutputs(report, outDir)
  if (opts.jsonStdout) console.log(JSON.stringify(report, null, 2))
  else {
    console.log(`orphan-finder: scanned ${report.summary.filesScanned} file(s)`)
    console.log(`  findings: ${report.summary.findings} (unresolved=${report.summary.unresolved}, unused=${report.summary.unused})`)
    console.log(`  wrote ${outDir}`)
  }
  if (opts.fail && report.summary.unresolved > 0) process.exit(1)
}

main()
