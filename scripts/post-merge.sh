#!/bin/bash
set -euo pipefail

npm ci --no-audit --no-fund
npm run check
