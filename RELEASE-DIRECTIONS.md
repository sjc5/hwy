# Old Release Directions (kept for reference)

From release branch, and assuming there have been pre releases, do the following
from monorepo root:

```sh
pnpm remove-pre

pnpm publish-non-pre

cd docs
pnpm to-latest
cd ..

git add .
git commit -am "vX.X.X"
git tag vX.X.X

git push
git push --tags
```

Then:

1. Make sure the new docs preview deploy is OK.
2. Merge release branch into main.
3. Make sure the new docs production deploy is OK.
4. Create a new release on GitHub, pointing to the tag created above.
5. Delete the release branch.

# New Release Directions

1. Bump npm version -- e.g., `pnpm bump-[pre|patch|minor|major]`
2. Publish to npm -- `pnpm publish=[pre|non-pre]`
3. Copy new version number
4. Push to GitHub with commit message `v[version_number] (and merge into main)
5. Run Go release script from main branch, pasting in new version number
