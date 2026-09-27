'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { scanOrphans } = require('../lib/scan.js')
const { createProgress } = require('../lib/progress.js')

describe('orphan-finder progress preface', () => {
  let tmp
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orphan-prog-'))
    fs.writeFileSync(path.join(tmp, 'a.adoc'), '= A\n')
    fs.writeFileSync(path.join(tmp, 'b.adoc'), '= B\n')
  })
  after(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

  it('preface starting + checking N files via onFile', () => {
    const chunks = []
    const stream = { isTTY: false, write (s) { chunks.push(s); return true } }
    const p = createProgress({ id: 'orphan-finder', stream, isTTY: false, every: 1 })
    p.starting('starting orphan scan')
    p.enumStart('files')
    const scan = scanOrphans(tmp, { onFile (n) { p.enumTick(n) } })
    p.enumDone(scan.filesScanned)
    const text = chunks.join('')
    assert.match(text, /orphan-finder: starting orphan scan/)
    assert.match(text, /orphan-finder: checking 0 files…/)
    assert.match(text, /orphan-finder: checking 2 files…/)
    assert.equal(scan.filesScanned, 2)
  })

  it('extension hooks contentClassified', () => {
    const ext = require('../lib/extension.js')
    const handlers = {}
    ext.call({
      on (e, fn) { handlers[e] = fn },
      getLogger () { return { info () {} } },
    }, { config: {} })
    assert.equal(typeof handlers.contentClassified, 'function')
    assert.equal(handlers.sitePublished, undefined)
  })
})
