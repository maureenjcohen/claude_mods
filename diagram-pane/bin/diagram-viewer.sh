#!/usr/bin/env bash
# Draws the newest diagram in this pane with Sixel, redrawing when a new one
# arrives or the pane is resized. Usage: diagram-viewer.sh <cache dir>
dir=${1:-$HOME/.cache/diagram-pane}
img="$dir/latest.png"
mkdir -p "$dir"

draw() {
  clear
  if [[ -f $img ]]; then
    [[ -f $dir/latest.name ]] && printf '%s   (q closes)\n' "$(<"$dir/latest.name")"
    # Two rows are kept for the caption and the cursor line.
    local cols rows
    cols=$(tput cols) rows=$(( $(tput lines) - 2 ))
    chafa -f sixel --font-ratio 1 --size "$(( cols * 10 / 8))x$(( rows * 20 / 8 ))" "$img" </dev/null | cat
  else
    echo "Waiting for a diagram... (q closes)"
  fi
}

trap 'resized=1' WINCH
# Pressing q in this pane quits the viewer; exiting with status 0 lets
# Windows Terminal close the pane.
trap 'kill "$watcher" "$keys" 2>/dev/null; exit 0' USR1
# Job control is off in a script, so a background job reads the terminal
# only when told to explicitly.
while read -rsn1 key </dev/tty; do
  [[ $key == [qQ] ]] && kill -USR1 $$
done &
keys=$!
draw
while :; do
  resized=0
  # Run in the background so a resize interrupts `wait` instead of waiting
  # for the next file event.
  inotifywait -qq -e moved_to --include 'latest\.png$' "$dir" &
  watcher=$!
  wait "$watcher"
  kill "$watcher" 2>/dev/null
  draw
done
