#!/usr/bin/env bash
# Compiles the Android-independent core (app/src/main/java/.../core) and its
# unit tests with kotlinc, then runs them on the JVM.
#
# This verifies the judgement engine without the Android SDK. The same core
# sources are compiled into the app by Gradle (assembleDebug / test).
#
# Requirements: a JDK and kotlinc on PATH (or set KOTLINC=/path/to/kotlinc).
set -euo pipefail
cd "$(dirname "$0")"

KOTLINC="${KOTLINC:-kotlinc}"
OUT="${TMPDIR:-/tmp}/ring-spamblocker-core-tests.jar"

CORE_SOURCES=$(find app/src/main/java/app/ring/spamblocker/core -name '*.kt')
TEST_SOURCES=$(find app/src/test -name '*.kt')

# shellcheck disable=SC2086
"$KOTLINC" $CORE_SOURCES $TEST_SOURCES -include-runtime -d "$OUT"
java -jar "$OUT"
