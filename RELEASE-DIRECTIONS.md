# Release Directions

1. Run:

```sh
pnpm bump-patch
```

OR

```sh
pnpm bump-minor
```

OR

```sh
pnpm bump-major
```

2. Run:

```sh
pnpm publish-non-beta
```

3. Run:

```sh
pnpm current-version
```

4. Copy the current version

5. Run:

```sh
git tag v<version>
```

6. Run:

```sh
git push --tags
```
