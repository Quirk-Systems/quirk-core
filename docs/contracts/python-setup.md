# Frozen-contract Python setup

This setup changes dependency resolution, not contract semantics. Python stays on
3.12, the input requirement stays `jsonschema>=4.23,<5`, and the existing checker,
schemas, tranche metadata, frozen digest, and fixture expectations stay unchanged.

## Run from a clean environment

From this repository's root with an available Python 3.12 interpreter:

```sh
python3.12 -m venv .venv-contracts
.venv-contracts/bin/python -m pip install --only-binary=:all: --require-hashes -r requirements-contracts.txt
.venv-contracts/bin/python -m pip check
.venv-contracts/bin/python -m unittest discover -s tests -p 'test_*.py' -v
.venv-contracts/bin/python contracts/v0.2/check-contract-tranche.py
```

The install command accesses the package index. It requires wheels rather than
building source distributions. On Windows, use the environment's
`Scripts/python.exe` instead of `bin/python`. Do not commit virtual environments.

Expected checker result: 36 fixture cases, zero mismatches, and
`PASS frozen-contracts-v0.2`. Negative and adversarial fixture outcomes should
remain FAIL where declared; they are not failing test infrastructure.

## What the files mean

`requirements-contracts.in` retains the existing permitted direct dependency
range. `requirements-contracts.txt` records an exact transitive resolution with
SHA-256 artifact hashes. The lock is committed; normal verification consumes it
without resolving new versions or rewriting it. `--require-hashes` does not
establish that a dependency is safe; it checks that allowed artifact bytes match.

The initial resolution used uv 0.10.0 and CPython 3.12.14 on Linux x86-64. The
lock includes hashes for multiple upstream artifacts, but that does not prove
all platforms or Python versions were tested. CI retains the 3.12 series and
records the actual patch and pip versions on each run.

## Deliberately update the lock

With an explicitly selected uv 0.10.0 available, run from the repository root:

```sh
uv pip compile requirements-contracts.in --python-version 3.12 --generate-hashes --no-header --output-file requirements-contracts.txt
```

This command accesses the package index and changes the lock when necessary.
It normally retains existing pins; use `--upgrade` only for a deliberate upgrade.
Review the versions and hashes, run the setup tests and unchanged checker in
clean environments, and request review of the resulting commit. A requirements
lock is not a lock of the operating system, interpreter binary, or pip itself.

## CI proof and its limits

The existing `frozen-contracts-v0.2` job still runs on every pull request and on
pushes to main. Its normal checkout preserves GitHub's PR merge-context test.
It records source and tool identities, installs the hash lock, runs setup
regressions, and runs the original checker command.

A second phase archives the exact PR head (or push commit) into a temporary
source directory. It installs the committed lock into two newly created venvs
from the same hash-verified wheel cache, runs the checker and setup tests in
both, and requires identical checker output and installed package lists. The
logs identify that exact head separately from the normal merge checkout.

Two negative controls must fail for the intended reasons: altered artifact
hashes and an omitted transitive dependency. These controls use temporary lock
copies and an offline wheel cache; they never change the committed lock or
frozen contract files. Temporary proof environments are removed when the step
ends. Wheel acquisition is not two independent upstream downloads.

The proof covers the declared fixture corpus on the recorded environment. It
does not establish real-world evaluator correctness, cross-platform parity,
required-check enforcement, human approval, or permission to merge.

## Companion boundary

Code Ontology Companion was used as a separate static inspection tool. It is
not a new runtime dependency or an automatically activated service. Its
Python source relationships do not validate YAML trigger behavior, schema
meaning, artifact hashes, or runtime dispatch. Keep its workspace outside the
source checkout. Human preferences and authority remain outside the map.
