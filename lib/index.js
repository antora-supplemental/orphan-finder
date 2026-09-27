'use strict'
const { scanOrphans } = require('./scan.js')
const { buildReport, writeOutputs } = require('./report.js')
module.exports = { scanOrphans, buildReport, writeOutputs }
