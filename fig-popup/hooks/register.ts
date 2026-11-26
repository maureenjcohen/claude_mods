import type { EngineInterface, Register } from 'claude-code'

const POPUP = /(^|\s)\/popup\b/i
const SKIP_DIRS = new Set(['node_modules', '__pycache__', 'venv', 'site-packages'])
const MAX_DEPTH = 6

const NOTE =
  'The user asked for a popup of this figure. Write the plotting code as usual and ' +
  'save the figure as a PNG inside the repository, in the location the user names ' +
  'if they name one. A hook opens the newest PNG in the Windows image viewer after ' +
  'the Bash or Write call that creates it, so do not try to open or display it yourself.'

// Set while a turn that asked for a popup runs: PNGs modified after `since` are candidates.
let armed: { since: number } | undefined
let root = '.'

type Png = { path: string; mtimeMs: number }

async function newestPng($: EngineInterface, dir: string, depth: number, since: number): Promise<Png | undefined> {
  const entries = await $.fs.list(dir).catch(() => [])
  let best: Png | undefined
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`
    if (entry.kind === 'file' && /\.png$/i.test(entry.name) && entry.mtimeMs > since) {
      if (best === undefined || entry.mtimeMs > best.mtimeMs) best = { path, mtimeMs: entry.mtimeMs }
    } else if (entry.kind === 'dir' && depth < MAX_DEPTH && !entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) {
      const found = await newestPng($, path, depth + 1, since)
      if (found !== undefined && (best === undefined || found.mtimeMs > best.mtimeMs)) best = found
    }
  }

  return best
}

async function popNewest($: EngineInterface): Promise<void> {
  if (armed === undefined) return
  const png = await newestPng($, root, 0, armed.since)
  if (png === undefined) return
  armed = { since: png.mtimeMs }
  const win = await $.process.run(['wslpath', '-w', png.path])
  if (win.exitCode !== 0) {
    $.ui.toast(`fig-popup: could not convert ${png.path} to a Windows path`)
    return
  }
  // explorer.exe exits non-zero even when it opens the file, so its status is not checked.
  await $.process.run(['explorer.exe', win.stdout.trim()])
  $.ui.toast(`Opened ${png.path.slice(root.length + 1)}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    root = e.cwd
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command !== undefined || e.isMeta || !POPUP.test(e.text)) return next(e)
    armed = { since: await $.clock.now() }
    return next({ ...e, context: [...(e.context ?? []), NOTE] })
  })

  on('tool.call', { tool: ['Bash', 'Write'] }, async ($, e, next) => {
    const ran = await next(e)
    await popNewest($)
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) armed = undefined
    return next(e)
  })
}
