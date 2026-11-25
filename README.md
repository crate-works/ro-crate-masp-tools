# RO-Crate MASP tools

Command-line tools for working with [RO-Crate MASP](https://github.com/Language-Research-Technology/ro-crate-masp) (Machine Actionable Schemas and Profiles) profile and schema crates.

Validation is not here: use [`@crate-works/ro-crate-masp-validator`](https://github.com/crate-works/ro-crate-masp-validator), which these tools depend on.

These tools came from the [ro-crate-masp](https://github.com/Language-Research-Technology/ro-crate-masp) repository, where their earlier git history remains.

## Install

```bash
npm install --save-dev github:crate-works/ro-crate-masp-tools
```

This puts the commands below on the path for `npm exec` and npm scripts.

## Tools

| Command | What it does |
| --- | --- |
| `generate-masp-docs` | Profile/schema crate + `*-text.md` template → markdown and HTML documentation. `-x` syncs `ro-crate-metadata.json` ↔ `ro-crate-metadata.xlsx` first (the newer file wins). `--multi-page` for large schemas such as schema.org. |
| `generate-mode-file` | Writes a minimal [Crate-O](https://github.com/crate-works/crate-o) mode file (metadata, groups, lookups, enabled classes; no `classes`) and links it from the profile crate. |
| `mode-to-masp` | Converts a full Crate-O mode file into a MASP profile crate. |
| `generate-schema-org-crate` | Fetches the schema.org JSON-LD dump and converts it into a MASP schema crate. Writes `schemas/schema-org/schema-crate/ro-crate-metadata.json` under the current directory unless given `--output`. |
| `scripts/owl-to-masp.py` | OWL/RDFS ontology → MASP schema crate: namespace filter, merging several inputs, instances → ItemLists, provenance. Run with `uv run`. See [scripts/owl-to-masp.spec.md](scripts/owl-to-masp.spec.md). |

### generate-masp-docs

```bash
npx generate-masp-docs [-x] [--multi-page] <profile-crate/ro-crate-metadata.json> <profile-text.md> [output.md]
```

The output defaults to `profile-documentation.md` next to the crate. The template uses placeholders such as `${rules.all}` and `${rules.allItemLists}` for the generated rule summaries. Links in the generated provenance note point into the git repository that holds the profile.

### generate-mode-file

```bash
npx generate-mode-file \
  --output profiles/ldac/profile-crate/crate-o-mode.json \
  --update-profile profiles/ldac/profile-crate/ro-crate-metadata.json
```

Add `--input <mode.json>` to start from an existing full mode file (its `classes` section is dropped).

### mode-to-masp

```bash
npx mode-to-masp --mode-file crate-o-mode.json --profile-crate profiles/my-profile/profile-crate
```

### owl-to-masp

```bash
uv run scripts/owl-to-masp.py -i ontology.ttl -o schemas/my-schema -n https://example.org/ns#
```

`-i` can be repeated to merge ontologies. See `--help` for the other options.

## Development

```bash
npm install
npm test                    # Mocha tests
npm run test:owl-to-masp    # pytest tests for owl-to-masp.py (needs uv)
```

Test fixtures live in `test_data/`; they are copies, so the tests do not depend on any profile or example repository.

## Publishing

Publishing to npm is done by `.github/workflows/publish.yml` when a GitHub release is published:

1. Bump `version` in `package.json` (e.g. `npm version patch`) and push the commit and tag.
2. Create a GitHub release from the tag. The workflow runs the tests and publishes to npm with provenance.

The workflow uses npm trusted publishing, so no token is stored in GitHub. It has to be set up once, after the package exists on npm: `npm trust github @crate-works/ro-crate-masp-tools --file publish.yml --repo crate-works/ro-crate-masp-tools` (or on npmjs.com: package Settings → Trusted Publisher → GitHub Actions). The very first version therefore has to be published by hand by a member of the npm org (`npm publish`).

## Licence

Apache-2.0
