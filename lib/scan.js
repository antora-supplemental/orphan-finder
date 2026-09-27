'use strict'

const fs = require('node:fs')
const path = require('node:path')

const INCLUDE_RE = /include::([^\[]+)\[/g
const ATTR_DEF_RE = /^:([A-Za-z0-9_-]+):\s*(.*)$/gm
const ATTR_REF_RE = /\{([A-Za-z0-9_-]+)\}/g
const BUILTIN_ATTRS = new Set([
  'doctitle', 'docname', 'docfile', 'docdir', 'docfilesuffix',
  'imagesdir', 'iconsdir', 'stylesdir', 'scriptsdir',
  'page-component-name', 'page-component-version', 'page-module',
  'page-relative-src-path', 'page-version', 'page-component-display-version',
  'page-component-title', 'page-origin-url', 'page-edit-url',
  'asciidoctor-version', 'backend', 'basebackend', 'doctype', 'filetype',
  'localdate', 'localtime', 'localdatetime', 'user-home',
])

function walkAdoc (root, files = [], onFile) {
  if (!fs.existsSync(root)) return files
  const st = fs.statSync(root)
  if (st.isFile()) {
    if (root.endsWith('.adoc')) {
      files.push(root)
      if (typeof onFile === 'function') onFile(files.length, root)
    }
    return files
  }
  for (const name of fs.readdirSync(root)) {
    if (name === 'node_modules' || name === '.git' || name === 'build' || name === 'public') continue
    walkAdoc(path.join(root, name), files, onFile)
  }
  return files
}

function rel (root, file) {
  return path.relative(root, file).split(path.sep).join('/')
}

function resolveInclude (fromFile, target, root) {
  let cleaned = target.trim().replace(/\{[^}]+\}/g, '')
  if (cleaned.includes(':') && !/^[A-Za-z]:/.test(cleaned)) {
    const parts = cleaned.split(':')
    cleaned = parts[parts.length - 1]
  }
  const candidates = [
    path.resolve(path.dirname(fromFile), cleaned),
    path.resolve(root, cleaned),
    path.resolve(root, 'modules', cleaned),
    path.resolve(path.dirname(fromFile), cleaned + '.adoc'),
    path.resolve(root, cleaned + '.adoc'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}

function scanOrphans (root, opts = {}) {
  const abs = path.resolve(root)
  const onFile = opts.onFile
  const files = walkAdoc(abs, [], onFile)
  if (typeof opts.onWalkDone === 'function') opts.onWalkDone(files.length)
  const ignoreAttrs = new Set([...(opts.ignoreAttrs || []), ...BUILTIN_ATTRS])
  const definedAttrs = new Map()
  const referencedAttrs = new Map()
  const includes = []
  const includedFiles = new Set()
  const onScan = opts.onScan

  let i = 0
  for (const file of files) {
    i += 1
    if (typeof onScan === 'function') onScan(i, files.length, file)
    const text = fs.readFileSync(file, 'utf8')
    const source = rel(abs, file)
    let m
    const defRe = new RegExp(ATTR_DEF_RE.source, 'gm')
    while ((m = defRe.exec(text))) {
      const name = m[1]
      if (!definedAttrs.has(name)) definedAttrs.set(name, [])
      definedAttrs.get(name).push(source)
    }
    const refRe = new RegExp(ATTR_REF_RE.source, 'g')
    while ((m = refRe.exec(text))) {
      const name = m[1]
      if (ignoreAttrs.has(name)) continue
      if (!referencedAttrs.has(name)) referencedAttrs.set(name, [])
      referencedAttrs.get(name).push({ file: source, raw: m[0] })
    }
    const incRe = new RegExp(INCLUDE_RE.source, 'g')
    while ((m = incRe.exec(text))) {
      const target = m[1].trim()
      const resolved = resolveInclude(file, target, abs)
      if (resolved) includedFiles.add(path.resolve(resolved))
      includes.push({ source, target, resolved: resolved ? rel(abs, resolved) : null })
    }
  }

  const findings = []
  for (const inc of includes) {
    if (!inc.resolved) {
      findings.push({
        target: inc.target,
        classification: 'unresolved',
        kind: 'unresolved-include',
        sources: [inc.source],
      })
    }
  }
  for (const [name, refs] of referencedAttrs) {
    if (!definedAttrs.has(name) && !ignoreAttrs.has(name)) {
      for (const r of refs) {
        findings.push({
          target: '{' + name + '}',
          classification: 'unresolved',
          kind: 'unresolved-attribute',
          sources: [r.file],
        })
      }
    }
  }
  for (const [name, defs] of definedAttrs) {
    if (ignoreAttrs.has(name)) continue
    if (!referencedAttrs.has(name)) {
      findings.push({
        target: ':' + name + ':',
        classification: 'unused',
        kind: 'unused-attribute',
        sources: defs,
      })
    }
  }
  for (const file of files) {
    const norm = file.split(path.sep).join('/')
    if (!/\/partials\//.test(norm)) continue
    if (!includedFiles.has(path.resolve(file))) {
      findings.push({
        target: rel(abs, file),
        classification: 'unused',
        kind: 'unused-partial',
        sources: [rel(abs, file)],
      })
    }
  }

  const seen = new Set()
  const deduped = []
  for (const f of findings) {
    const key = f.kind + '|' + f.target + '|' + (f.sources || []).join(',')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(f)
  }

  return {
    root: abs,
    filesScanned: files.length,
    findings: deduped,
    includes,
    definedAttrs: [...definedAttrs.keys()],
    referencedAttrs: [...referencedAttrs.keys()],
  }
}

module.exports = { scanOrphans, walkAdoc, resolveInclude, BUILTIN_ATTRS }
