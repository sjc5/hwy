# Release Directions

1. Run:

```sh
pnpm remove-beta
```

2. Run:

```sh
pnpm current-version
```

3. Make sure it's the right version now.

4. Run:

```sh
pnpm publish-non-beta
```

5. Run:

```sh
git add .
git commit -am "vX.X.X"
git tag vX.X.X
```

6. Run:

```sh
git push origin --tags
```
