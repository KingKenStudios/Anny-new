# ANNY consolidation runbook

The destination repository is initialized. The migration workflow copies both complete source repositories into separate folders without merging their code.

## One-time setup

1. Create a GitHub fine-grained personal access token with **Contents: Read-only** access to both private repositories:
   - `KingKenStudios/primary-anny`
   - `KingKenStudios/reference-anny`
2. In the destination repository, open **Settings → Secrets and variables → Actions → New repository secret**.
3. Name the secret `SOURCE_REPO_TOKEN` and paste the token value.
4. Ensure Actions are enabled for the destination repository.

The workflow uses the destination repository's built-in `GITHUB_TOKEN` to write the result. The source token is used only to read the two source repositories.

## Run the migration

1. Open **Actions → Consolidate ANNY source repositories**.
2. Select **Run workflow**.
3. Enter `CONSOLIDATE` in the confirmation field.
4. Run the workflow and wait for the job to finish.
5. Verify that `primary-anny/` and `reference-anny/` appear at the repository root.

## Safety

- The source repositories are read-only inputs and are not modified.
- Real `.env` files and local environment overrides are excluded.
- Secret-like values in copied `.env.example` files are blanked.
- The workflow preserves binary assets and source files via Git checkout/rsync.
- Neither codebase is automatically merged or declared production-ready.
