# Pre-release workflow

https://github.com/changesets/changesets/blob/main/docs/prereleases.md

```sh
pnpm changeset pre enter beta
pnpm changeset version
pnpm changeset publish
git push --follow-tags
pnpm changeset pre exit
```
