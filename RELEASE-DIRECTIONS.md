# Release Directions

From release branch, and assuming there have been beta releases, do the following from monorepo root:

```sh
pnpm remove-beta

pnpm current-version

pnpm publish-non-beta

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
