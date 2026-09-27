'use strict'

const ospath = require('node:path')
const { scanOrphans } = require('./scan.js')
const { buildReport, writeOutputs } = require('./report.js')
const { createProgress } = require('./progress.js')
const registryMeta = require('./registry-meta.js')
const PKG = '@antora-supplemental/orphan-finder'
const TOOL = 'orphan-finder'

/**
 * Antora extension: scan for unresolved includes/attrs and unused partials.
 * Hooks contentClassified so preface + progress appear during the build
 * (not only after sitePublished). Writes report under the site output dir
 * immediately; Antora may buffer logger lines until the hook returns.
 */
function register ({ config = {} } = {}) {
  const context = this
  if (config.skip) return

  context.on('contentClassified', ({ playbook }) => {
    const logger = typeof context.getLogger === 'function'
      ? context.getLogger(PKG)
      : { info: (...a) => console.log('[' + PKG + ']', ...a) }

    const progress = createProgress({ id: TOOL, logger })
    progress.starting('starting orphan scan')

    const playbookDir = playbook.dir || process.cwd()
    const root = config.root ? ospath.resolve(playbookDir, config.root) : playbookDir

    progress.enumStart('files')
    const scan = scanOrphans(root, {
      ignoreAttrs: config.ignoreAttrs,
      onFile (n) { progress.enumTick(n) },
      onWalkDone (n) { progress.enumDone(n) },
      onScan (i, total) { progress.tick(i, total) },
    })

    const report = buildReport(scan, {
      reportEmail: config.reportEmail || 'support@devcentr.org',
      ciTrigger: config.ciTrigger || null,
    })
    const outDir = ospath.resolve(
      playbookDir,
      playbook.output?.dir || 'build/site',
      config.outDir || 'orphan-finder'
    )
    writeOutputs(report, outDir)
    progress.done(
      scan.filesScanned + ' file(s), ' + report.summary.findings + ' finding(s) → ' + outDir
    )
    if (report.summary.unresolved && config.failOnUnresolved) {
      throw new Error(TOOL + ': ' + report.summary.unresolved + ' unresolved include/attribute ref(s)')
    }
  })
}

module.exports = register
module.exports.registryMeta = registryMeta
