# claude_mods

Personal Claude Code mods, one per folder. The repository is a plugin
marketplace, so each mod installs on its own.

## fig-popup

Shows a figure in the Windows image viewer when a prompt asks for it.

- Put `/popup` anywhere in a prompt except at the very start, for example
  "Make a /popup of the zonal mean zonal wind". After each Bash or Write call
  in that turn, the newest PNG saved since the prompt, anywhere up to six
  folders deep in the working directory, opens in the default Windows viewer.
- Without `/popup`, nothing opens: the figure is written and saved as usual.
- Hidden folders, `node_modules`, `__pycache__`, `venv` and `site-packages`
  are not searched.
- Works under WSL only: it opens files with `wslpath -w` and `explorer.exe`.

### Install

At the prompt of a Claude Code terminal session:

```
/plugin install fig-popup --marketplace maureenjcohen/claude_mods
```

From a shell:

```
claude plugin install fig-popup --marketplace maureenjcohen/claude_mods
```

Answer `y` to add the marketplace, then choose a scope. A private repository
installs only on machines that already have a git credential for github.com
(an SSH key, or `gh auth login` followed by `gh auth setup-git`).

To run it from a local copy without installing:

```
claude --plugin-dir /path/to/claude_mods/fig-popup
```

## diagram-pane

Shows colour diagrams in a Windows Terminal split pane beside the chat,
drawn as real images with Sixel.

- Put `/diagram` anywhere in a prompt except at the very start, for example
  "Draw a /diagram of the Arakawa C grid". Claude writes the diagram as an SVG
  (or a Graphviz `.dot` file) under `diagrams/` in the working directory.
- Every SVG or `.dot` file written under a `diagrams/` folder is rendered to
  PNG and shown in the pane, with or without `/diagram`. Overwriting the file
  redraws it.
- The first diagram of a session opens the pane on the right. `/diagram-pane`
  opens it again after it has been closed.
- Press `q` in the pane to close it. A `q` typed in the chat pane by mistake
  is only text, so it cannot close the chat.
- The pane redraws when it is resized. The latest render is kept in
  `~/.cache/diagram-pane/latest.png`.

Needs WSL, a Windows Terminal that draws Sixel (1.22 or newer), and:

```
sudo apt install chafa librsvg2-bin inotify-tools graphviz
```

`graphviz` is needed only for `.dot` diagrams.

### Install

```
/plugin install diagram-pane --marketplace maureenjcohen/claude_mods
```

To run it from a local copy without installing:

```
claude --plugin-dir /path/to/claude_mods/diagram-pane
```
