# File Git History

VS Code extension that adds a `Show Git History` context menu entry for files and opens a diff for the selected commit.

## Local Development

1. Run `npm install`
2. Run `npm run build`
3. Press `F5` in VS Code
4. In the Extension Development Host window, open a Git repository and right-click a file

## Packaging

Run `npm run package:vsix` to build a local `.vsix` file.

## Automated Releases

Pushes to `main` or `master` trigger a GitHub Actions workflow that:

1. bumps the patch version in `package.json` and `package-lock.json`
2. commits the version bump back to the branch
3. creates a matching git tag like `v0.0.2`
4. builds `vscode-file-log-0.0.2.vsix`
5. creates a GitHub Release and uploads the VSIX asset
