'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { scanOrphans } = require('../lib/scan.js')
const { buildReport, writeOutputs } = require('../lib/report.js')

describe('orphan-finder scan', () => {
  let tmp
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orphan-finder-'))
    fs.mkdirSync(path.join(tmp, 'partials'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'index.adoc'), `= Doc
:my-attr: hello

include::partials/used.adoc[]

include::partials/missing.adoc[]

Value is {my-attr} and {undefined-attr}.
`)
    fs.writeFileSync(path.join(tmp, 'partials', 'used.adoc'), 'Used partial.\n')
    fs.writeFileSync(path.join(tmp, 'partials', 'unused.adoc'), 'Never included.\n')
    fs.writeFileSync(path.join(tmp, 'attrs.adoc'), `:orphan-only:\n`)
  })
  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('finds unresolved include, unresolved attr, unused attr, unused partial', () => {
    const scan = scanOrphans(tmp)
    const kinds = scan.findings.map((f) => f.kind).sort()
    assert.ok(kinds.includes('unresolved-include'))
    assert.ok(kinds.includes('unresolved-attribute'))
    assert.ok(kinds.includes('unused-attribute'))
    assert.ok(kinds.includes('unused-partial'))
    assert.ok(scan.findings.some((f) => f.target.includes('missing.adoc')))
    assert.ok(scan.findings.some((f) => f.target === '{undefined-attr}'))
  })

  it('builds report + triage outputs', () => {
    const scan = scanOrphans(tmp)
    const report = buildReport(scan)
    assert.equal(report.tool, 'orphan-finder')
    assert.ok(report.groupings)
    assert.ok(report.actions.mailto.startsWith('mailto:'))
    const out = path.join(tmp, 'out')
    writeOutputs(report, out)
    assert.ok(fs.existsSync(path.join(out, 'report.json')))
    assert.ok(fs.existsSync(path.join(out, 'index.html')))
    assert.ok(fs.existsSync(path.join(out, 'triage-ux.css')))
  })
})
