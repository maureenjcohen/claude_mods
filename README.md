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
