'use strict'
module.exports = {
  name: 'Orphan Finder',
  packageName: '@antora-supplemental/orphan-finder',
  purpose: 'content-hygiene',
  layer: 'bolt-on',
  chassis: 'bolt-on',
  pipeline: true,
  asciidoctor: false,
  lifecycleHooks: ['sitePublished'],
  processorSubtypes: [],
  description: 'Find unresolved include:: / attribute refs + unused; triage HTML',
  homepage: 'https://github.com/antora-supplemental/orphan-finder',
}
