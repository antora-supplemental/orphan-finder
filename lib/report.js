'use strict'

const fs = require('node:fs')
const path = require('node:path')
const {
  buildGroupings,
  buildTriageHtml,
  buildTriageActions,
  assets,
} = require('@antora-supplemental/triage-ux-kit')

function buildReport (scan, { reportEmail = 'support@devcentr.org', ciTrigger = null } = {}) {
  const findings = scan.findings || []
  const groupings = buildGroupings(findings)
  const unresolved = findings.filter((f) => f.classification === 'unresolved').length
  const unused = findings.filter((f) => f.classification === 'unused').length
  const report = {
    version: 1,
    tool: 'orphan-finder',
    generatedAt: new Date().toISOString(),
    summary: {
      filesScanned: scan.filesScanned,
      findings: findings.length,
      unresolved,
      unused,
      groupingDefault: groupings.default,
    },
    findings,
    groupings,
    meta: { reportEmail, ciTrigger },
  }
  report.actions = buildTriageActions(report, { ciTrigger, toolName: 'Orphan Finder' })
  return report
}

function writeOutputs (report, outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true })
  const jsonPath = path.join(outDir, 'report.json')
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n')
  const html = buildTriageHtml({
    title: opts.title || 'Orphan Finder',
    toolName: 'Orphan Finder',
    reportEmail: report.meta?.reportEmail || 'support@devcentr.org',
    ciTrigger: report.meta?.ciTrigger,
    lede: 'Unresolved include:: / attribute refs and unused definitions.',
    cssHref: './triage-ux.css',
    jsHref: './triage-ux.js',
  })
  fs.writeFileSync(path.join(outDir, 'index.html'), html)
  if (fs.existsSync(assets.cssPath)) fs.copyFileSync(assets.cssPath, path.join(outDir, 'triage-ux.css'))
  if (fs.existsSync(assets.jsPath)) fs.copyFileSync(assets.jsPath, path.join(outDir, 'triage-ux.js'))
  return { jsonPath, htmlPath: path.join(outDir, 'index.html') }
}

module.exports = { buildReport, writeOutputs }
