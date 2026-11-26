import { expect, test } from 'claude-code/testing'

const ROOT = '/repo'
const HOME = '/home/u'
const CACHE = `${HOME}/.cache/diagram-pane`

function engine(on: any, ran: string[][], seen: Array<readonly string[] | undefined>, toasts: string[]) {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: unknown, e: any) => { seen.push(e.context); return { text: e.text } })
  on('env.get', (_: unknown, e: any) => {
    const name = e.name ?? e[0]
    return { value: name === 'HOME' ? HOME : name === 'WSL_DISTRO_NAME' ? 'Ubuntu' : undefined }
  })
  on('fs.write', () => ({ value: undefined }))
  on('command.register', () => ({ value: {} }))
  on('process.run', (_: unknown, e: any) => {
    ran.push([...(e.argv ?? e[0])])
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })
  on('ui.toast', (_: unknown, e: any) => { toasts.push(e.text ?? e[0]); return { value: {} } })
  on('tool.call', () => ({ result: {} }))
}

test('a /diagram prompt adds the drawing note', async ($, on) => {
  const ran: string[][] = []
  const seen: Array<readonly string[] | undefined> = []
  engine(on, ran, seen, [])
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'Draw me a /diagram of the Arakawa C grid', wait: false, origin: { kind: 'composer' } })
  expect(seen[0]?.length).toBe(1)
  await $.prompt.submit({ text: 'Explain the Arakawa C grid', wait: false, origin: { kind: 'composer' } })
  expect(seen[1]).toBe(undefined)
})

test('writing an SVG under diagrams/ renders it and opens the pane once', async ($, on) => {
  const ran: string[][] = []
  engine(on, ran, [], [])
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/diagrams/grid.svg`, content: '<svg/>' })
  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/diagrams/grid.svg`, content: '<svg/>' })
  const tools = ran.map(argv => argv[0])
  expect(tools).toEqual(['rsvg-convert', 'mv', 'wt.exe', 'rsvg-convert', 'mv'])
  expect(ran[0]).toEqual(['rsvg-convert', '-w', '1600', '-b', 'white', '-o', `${CACHE}/rendering.png`, `${ROOT}/diagrams/grid.svg`])
  expect(ran[1]).toEqual(['mv', '-f', `${CACHE}/rendering.png`, `${CACHE}/latest.png`])
})

test('a .dot file is laid out with Graphviz', async ($, on) => {
  const ran: string[][] = []
  engine(on, ran, [], [])
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/diagrams/flow.dot`, content: 'digraph {}' })
  expect(ran[0]?.[0]).toBe('dot')
})

test('an SVG outside diagrams/ is left alone', async ($, on) => {
  const ran: string[][] = []
  engine(on, ran, [], [])
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/figs/logo.svg`, content: '<svg/>' })
  expect(ran).toEqual([])
})
