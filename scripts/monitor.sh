#!/usr/bin/env bash
# Watch the ÉLANSTUDIO dev server's RAM/CPU usage.
# Run `npm run dev` in one terminal, then `npm run monitor` in another.
# Press Ctrl+C to stop watching (this does NOT stop the dev server).

while true; do
  clear
  echo "=== ÉLANSTUDIO dev server — $(date +%H:%M:%S) ==="
  echo

  rows="$(ps -axo pid,rss,%cpu,command \
    | grep -E 'next-server|next dev|next/dist|turbopack' \
    | grep -v grep)"

  if [ -z "$rows" ]; then
    echo "  (no dev server running — start it with: npm run dev)"
  else
    echo "$rows" | awk '{ printf "  PID %-7s  RSS %6.0f MB  CPU %5s%%\n", $1, $2/1024, $3 }'
    total="$(echo "$rows" | awk '{ s += $2 } END { printf "%.0f", s/1024 }')"
    echo "  ----------------------------------------------"
    echo "  TOTAL RAM: ${total} MB"
  fi

  echo
  echo "  (Ctrl+C to stop watching — dev server keeps running)"
  sleep 2
done
