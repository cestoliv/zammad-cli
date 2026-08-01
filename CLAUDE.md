# zammad-cli

## Remotes — always push to both

This repo lives on two remotes and both must stay in sync:

- **GitHub** (canonical — PRs, reviews, merges): `https://github.com/cestoliv/zammad-cli.git`
- **GitLab** (self-hosted mirror): `git@git.chevro.fr:cestoliv/zammad-cli.git`

`origin` is configured with one fetch URL (GitHub) and **two push URLs**, so a
single `git push origin <branch>` fans out to both automatically:

```bash
git remote set-url --add --push origin https://github.com/cestoliv/zammad-cli.git
git remote set-url --add --push origin git@git.chevro.fr:cestoliv/zammad-cli.git
```

`git remote -v` therefore shows one `(fetch)` line and two `(push)` lines. That
is intentional — do not "fix" it, and never push to a single remote explicitly.

**After merging a PR**, `main` advances on GitHub only, because the merge happens
there. Sync the mirror before moving on:

```bash
git checkout main && git pull --ff-only && git push origin main
```

Verify all three agree when in doubt:

```bash
git rev-parse main
git ls-remote https://github.com/cestoliv/zammad-cli.git refs/heads/main
git ls-remote git@git.chevro.fr:cestoliv/zammad-cli.git refs/heads/main
```

If GitLab has diverged rather than merely fallen behind, stop and check before
pushing — confirm the mirror's tip is an ancestor first:

```bash
git merge-base --is-ancestor <gitlab-main-sha> main
```

## Testing

`bun test` writes to the credential store for real. A `bunfig.toml` preload
redirects `ZAMMAD_CONFIG_DIR` at a temp directory for the whole run, so tests
cannot destroy the developer's saved Zammad URL and API token. Any new test file
that touches `saveConfig`/`clearConfig` relies on that preload — do not remove it.
