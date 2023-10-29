# Release Directions

From feature branch, and assuming there have been beta releases,
do the following from the Hwy monorepo root:

1. Remove the beta tag from the package.json files:

```sh
pnpm remove-beta
```

2. Check the new version:

```sh
pnpm current-version
```

3. Make sure it's the right version now.

4. Publish:

```sh
pnpm publish-non-beta
```

5. Update the docs to latest:

```sh
cd docs
pnpm to-latest
cd ..
```

6. Commit and tag:

```sh
git add .
git commit -am "vX.X.X"
git tag vX.X.X
```

6. Push:

```sh
git push --tags
git push
```

7. Make sure the new docs preview deploy is OK.

8. Merge release branch into main.

9. Make sure the new docs production deploy is OK.

10. Create a new release on GitHub, pointing to the tag created above.
