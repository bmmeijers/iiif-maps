#!/bin/bash

# Check arguments
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <file_to_watch> <command_to_run>"
    exit 1
fi

FILE_TO_WATCH="$1"
shift
COMMAND_TO_RUN="$@"

# Store PID of the running command
CMD_PID=""

restart_command() {
    if [ -n "$CMD_PID" ] && kill -0 "$CMD_PID" 2>/dev/null; then
        echo "Stopping previous command (PID $CMD_PID)..."
        kill "$CMD_PID"
        wait "$CMD_PID" 2>/dev/null
    fi

    echo "Starting command: $COMMAND_TO_RUN"
    nohup $COMMAND_TO_RUN &>/dev/null &
    CMD_PID=$!
    echo "Command started with PID $CMD_PID"
}

# Start the command initially
restart_command

# Monitor the file
inotifywait -m -e modify "$FILE_TO_WATCH" | while read path action file; do
    echo "Detected $action on $file"
    restart_command
done
