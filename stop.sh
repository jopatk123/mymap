#!/bin/bash
#
# Panorama Map Project Stop Script
#
# This script is a convenience wrapper for the main management script.
# It executes './start.sh stop' to ensure consistent behavior.
#

# Get the directory where the script is located to ensure it can find start.sh
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Execute the main script's stop command
"$SCRIPT_DIR/start.sh" stop
