import type { EngineInterface, Register } from 'claude-code'

const DIAGRAM = /(^|\s)\/diagram\b/i
// Only files under a folder named `diagrams` are rendered, so other SVGs Claude writes are left alone.
const SOURCE = /\/diagrams\/[^/]+\.(svg|dot)$/i
const RENDER_WIDTH = '1600'

const NOTE =
  'The user asked for a diagram, shown as an image in a terminal pane beside the chat. ' +
  'Write it with the Write tool as one self-contained SVG file at diagrams/<short-name>.svg ' +
  'in the working directory (or a .dot Graphviz file there when automatic graph layout suits ' +
  'it better). A hook renders it with librsvg and shows it; do not open or convert it yourself. ' +
  'The pane is a narrow half-width terminal split and the image is scaled down to fit it, so ' +
  'small text becomes unreadable: use a portrait viewBox about 800 wide and 1000 to 1200 tall, ' +
  'a sans-serif font at 28px or more (title 36px or more), and no more than about 8 boxes with ' +
  'short labels. If the subject needs more than that, draw an overview and offer separate ' +
  'detail diagrams instead of cramming it into one. ' +
  'Draw it with the care of an artifact diagram: a solid background rect (#fafafa unless the ' +
  'user asks otherwise), a short title, ' +
  'soft fills with darker strokes of the same hue, colour used to group related parts, ' +
  'arrowheads from a <marker> in <defs>, and a label on every arrow. Use plain SVG only: no ' +
  'scripts, foreignObject, CSS variables or web fonts. Then explain the diagram briefly in the ' +
  'chat. To revise it, overwrite the same file.'

let root = '.'
let cache = ''
let paneOpened = false

async function openPane($: EngineInterface): Promise<string | undefined> {
  const distro = await $.env.get('WSL_DISTRO_NAME')
  if (distro === undefined) return 'diagram-pane: not running under WSL, so no Windows Terminal pane can be opened'
  const ran = await $.process
    .run([
      'wt.exe', '-w', '0', 'split-pane', '-V', '--size', '0.5',
      'wsl.exe', '-d', distro, '--', 'bash', `${$.plugin.root}/bin/diagram-viewer.sh`, cache,
    ])
    .catch(() => undefined)
  if (ran === undefined || ran.exitCode !== 0) {
    return `diagram-pane: could not open a pane; run bash ${$.plugin.root}/bin/diagram-viewer.sh ${cache} in one yourself`
  }
  paneOpened = true
  return undefined
}

async function render($: EngineInterface, source: string): Promise<string | undefined> {
  const tmp = `${cache}/rendering.png`
  const argv = /\.dot$/i.test(source)
    ? ['dot', '-Tpng', '-Gdpi=150', '-o', tmp, source]
    : ['rsvg-convert', '-w', RENDER_WIDTH, '-b', 'white', '-o', tmp, source]
  const ran = await $.process.run(argv).catch(() => undefined)
  if (ran === undefined) return `diagram-pane: ${argv[0]} is not installed`
  if (ran.exitCode !== 0) return `diagram-pane: ${argv[0]} failed: ${ran.stderr.trim().split('\n')[0] ?? ''}`
  const name = source.startsWith(`${root}/`) ? source.slice(root.length + 1) : source
  await $.fs.write(`${cache}/latest.name`, `${name}\n`)
  // A rename is atomic, so the viewer never reads a half-written PNG.
  await $.process.run(['mv', '-f', tmp, `${cache}/latest.png`])
  return undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    root = e.cwd
    cache = `${(await $.env.get('HOME')) ?? '/tmp'}/.cache/diagram-pane`
    // rsvg-convert and dot do not create the folder they write into.
    await $.fs.write(`${cache}/.keep`, '')
    await $.command.register({
      name: 'diagram-pane',
      description: 'Open the Windows Terminal pane that shows diagrams',
    })
    return next(e)
  })

  on('command.run', { command: 'diagram-pane' }, async $ => {
    const problem = await openPane($)
    return { text: problem ?? 'Diagram pane opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command !== undefined || e.isMeta || !DIAGRAM.test(e.text)) return next(e)
    return next({ ...e, context: [...(e.context ?? []), NOTE] })
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (!SOURCE.test(e.file_path)) return ran
    const problem = await render($, e.file_path)
    if (problem !== undefined) {
      $.ui.toast(problem)
      return ran
    }
    if (!paneOpened) {
      const opening = await openPane($)
      if (opening !== undefined) $.ui.toast(opening)
    }
    return ran
  })
}
