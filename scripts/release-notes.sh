#!/bin/bash
# Generate release notes from CHANGELOG.md

set -e

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release-notes.sh <version>"
  echo "Example: ./scripts/release-notes.sh 0.3.0"
  exit 1
fi

# Extract release notes from CHANGELOG
RELEASE_NOTES=$(sed -n "/^## \[$VERSION\]/,/^## \[/p" CHANGELOG.md | head -n -1)

if [ -z "$RELEASE_NOTES" ]; then
  echo "Error: Version $VERSION not found in CHANGELOG.md"
  exit 1
fi

echo "Release Notes for v$VERSION:"
echo "=============================="
echo ""
echo "$RELEASE_NOTES"
echo ""

# Generate statistics
echo ""
echo "Generation Info:"
echo "================"
echo "Generated: $(date)"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
