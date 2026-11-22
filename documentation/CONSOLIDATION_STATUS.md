# ANNY source consolidation

This repository preserves two independent source snapshots:

- `primary-anny/`: selected primary development baseline.
- `reference-anny/`: reference implementation for comparison and selective porting.

The original repositories were not modified by this workflow.

## Security handling

Real `.env` files and local environment overrides are excluded. Values for
secret-like variables in copied `.env.example` templates are blanked.
Review all source code and audit reports before deployment. This transfer
does not certify either application as secure or production-ready.

## Integration policy

Do not merge files blindly. Compare components, retain provenance, run
tests, and independently review security-sensitive changes before porting.
