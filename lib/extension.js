'use strict'

const ospath = require('node:path')
const { scanOrphans } = require('./scan.js')
const { buildReport, writeOutputs } = require('./report.js')
const registryMeta = require('./registry-meta.js')
const PKG = '@antora-supplemental/orphan-finder'

function register ({ config = {} } = {}) {
  const context = this
  if (config.skip) return
  context.on('sitePublished', ({ playbook }) => {
    const logger = typeof context.getLogger === 'function'
      ? context.getLogger(PKG)
      : { info: (...a) => console.log(`[${PKG}]`, ...a) }
    const playbookDir = playbook.dir || process.cwd()
    const root = config.root ? ospath.resolve(playbookDir, config.root) : playbookDir
    const scan = scanOrphans(root, { ignoreAttrs: config.ignoreAttrs })
    const report = buildReport(scan, {
      reportEmail: config.reportEmail || 'support@devcentr.org',
      ciTrigger: config.ciTrigger || null,
    })
    const outDir = ospath.resolve(playbookDir, playbook.output?.dir || 'build/site', config.outDir || 'orphan-finder')
    writeOutputs(report, outDir)
    logger.info(`orphan-finder: ${report.summary.findings} finding(s) → ${outDir}`)
    if (report.summary.unresolved && config.failOnUnresolved) {
      throw new Error(`orphan-finder: ${report.summary.unresolved} unresolved include/attribute ref(s)`)
    }
  })
}

module.exports = register
module.exports.registryMeta = registryMeta
