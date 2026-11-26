import { expect, test } from 'claude-code/testing'

const ROOT = '/repo'

function engine(on: any, opened: string[][], seen: Array<readonly string[] | undefined>) {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: unknown, e: any) => { seen.push(e.context); return { text: e.text } })
  on('clock.now', () => ({ value: 1000 }))
  on('fs.list', (_: unknown, e: any) => {
    const path = e.path ?? e[0]
    const tree: Record<string, unknown[]> = {
      [ROOT]: [
        { name: 'old.png', kind: 'file', size: 1, mtimeMs: 500, isLink: false },
        { name: 'figs', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
        { name: '.git', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      ],
      [`${ROOT}/figs`]: [
        { name: 'a.png', kind: 'file', size: 1, mtimeMs: 2000, isLink: false },
        { name: 'u.png', kind: 'file', size: 1, mtimeMs: 3000, isLink: false },
      ],
    }
    return { value: tree[path] ?? [] }
  })
  on('process.run', (_: unknown, e: any) => {
    const argv = e.argv ?? e[0]
    opened.push([...argv])
    return { value: { exitCode: 0, stdout: argv[0] === 'wslpath' ? `W:${argv[2]}\n` : '', stderr: '' } }
  })
  on('ui.toast', () => ({ value: {} }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({}))
}

test('a /popup prompt opens the newest PNG after a Bash call', async ($, on) => {
  const opened: string[][] = []
  const seen: Array<readonly string[] | undefined> = []
  engine(on, opened, seen)
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'Make a /popup of the zonal mean zonal wind', wait: false, origin: { kind: 'composer' } })
  expect(seen[0]?.length).toBe(1)
  await $.tool.call({ tool: 'Bash', command: 'python plot.py' })
  expect(opened).toEqual([['wslpath', '-w', `${ROOT}/figs/u.png`], ['explorer.exe', `W:${ROOT}/figs/u.png`]])
})

test('a plain figure prompt opens nothing', async ($, on) => {
  const opened: string[][] = []
  const seen: Array<readonly string[] | undefined> = []
  engine(on, opened, seen)
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'Make a figure of the zonal mean zonal wind', wait: false, origin: { kind: 'composer' } })
  expect(seen[0]).toBe(undefined)
  await $.tool.call({ tool: 'Bash', command: 'python plot.py' })
  expect(opened).toEqual([])
})
