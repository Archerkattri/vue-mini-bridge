# Security Policy

## Supported Versions

Security fixes land on `master`. There are no maintained release lines;
pin a commit if you need a fixed reference.

## Reporting a Vulnerability

Report privately through GitHub's
[private vulnerability reporting](../../security/advisories/new)
(preferred) or open a public issue for anything already disclosed.
Include the affected package and file, a minimal reproduction, and the
Node.js version. Expect an initial response within a week.

Note: this project ships no runtime dependencies of its own. Its
dependency footprint is dev-only (build and test tooling), and the
known accepted risks are recorded in [MAINTENANCE.md](MAINTENANCE.md).
