---
name: "Orphan Finder"
description: "Find unresolved include:: / attribute refs + unused; triage HTML"
purpose: "content-hygiene"
layer: "bolt-on"
chassis: "bolt-on"
pipeline: true
asciidoctor: false
lifecycleHooks:
  - sitePublished
processorSubtypes: []
related:
  - https://github.com/antora-supplemental/triage-ux-kit
---

# Overview

CLI + optional Antora extension. Scans AsciiDoc for unresolved `include::` targets and `{attribute}` refs, plus unused attribute definitions and unreferenced partials. Emits JSON + triage HTML via triage-ux-kit.

## Install

```bash
pnpm add -D github:antora-supplemental/orphan-finder#v0.1.0
```

Support: support@devcentr.org
