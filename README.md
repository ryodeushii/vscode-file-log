# Git File History Viewer

[![Release VSIX](https://github.com/ryodeushii/vscode-file-log/actions/workflows/release.yml/badge.svg)](https://github.com/ryodeushii/vscode-file-log/actions/workflows/release.yml)
[![Latest Release](https://img.shields.io/github/v/release/ryodeushii/vscode-file-log)](https://github.com/ryodeushii/vscode-file-log/releases)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ryodeushii.vscode-file-log?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=ryodeushii.vscode-file-log)
[![License](https://img.shields.io/github/license/ryodeushii/vscode-file-log)](./LICENSE)

`Git File History Viewer` is a VS Code extension for inspecting the history of a single file without leaving the editor.

It adds a `Show Git History` action to file context menus, reads that file's commit history with `git log`, and opens a diff for the selected commit against its parent.

## Why This Exists

VS Code already has solid Git support, but checking the history of one specific file often takes more steps than it should.

This extension is built for the simple workflow:

1. right-click a file
2. open its commit history
3. inspect commit details
4. open the file diff for the chosen revision

The goal is to make file-level Git history feel immediate, focused, and lightweight.

## Features

- adds `Show Git History` to Explorer file context menus
- adds `Show Git History` to editor context menus
- adds `Show Git History` to editor tab/title context menus
- loads commit history for the selected file with Git
- shows commits in a searchable picker
- supports a two-step picker flow with a commit list and a commit details view
- opens diffs in a pinned tab instead of replacing the current preview tab
- includes picker display settings for date, time, and extra details

## How It Works

When you run `Show Git History`, the extension:

1. resolves the selected file
2. finds the repository root with `git rev-parse --show-toplevel`
3. loads commit history for that file with `git log -- <file>`
4. lets you inspect commits in a Quick Pick
5. opens a diff between `commit^` and `commit`

That means the diff shows exactly what changed in that file in the selected commit.

## Usage

1. Open a Git repository in VS Code.
2. Right-click a tracked file in the Explorer, editor, or tab.
3. Select `Show Git History`.
4. In the first picker, press `Enter` on a commit to open the diff immediately.
5. In the first picker, click the arrow button to inspect commit details first.
6. In the details view, review author, date, hash, and message.
7. Choose `Open Diff` to open the file diff for that commit.
8. Use Back to return to the commit list.

## Settings

This extension contributes the following settings:

- `fileGitHistory.showDate`
  - show the commit date in the history picker
- `fileGitHistory.showTime`
  - show the commit time in the history picker
- `fileGitHistory.showDetailsInPicker`
  - show author, full hash, and a short summary in the commit list

## Local Development

### Run In Extension Host

1. Install dependencies:

```bash
npm install
```

2. Build the extension:

```bash
npm run build
```

3. Press `F5` in VS Code.
4. In the Extension Development Host window, open any Git repository and test the command on a tracked file.

### Watch Mode

```bash
npm run watch
```

Then reload the Extension Development Host window after changes.

## Testing

Run unit tests:

```bash
npm test
```

Build the extension:

```bash
npm run build
```

## Packaging

Build a local VSIX:

```bash
npm run package:vsix
```

This produces a versioned file like:

```text
vscode-file-log-0.0.1.vsix
```

You can install it in VS Code with `Extensions: Install from VSIX...`.

## Screenshots

### Open From The Explorer

![Context menu on file tree](./media/context%20menu%20on%20file%20tree.png)

### Open From The Editor

![Context menu on file content](./media/context%20menu%20on%20file%20content.png)

### Command Entry

![Show git history command](./media/show%20git%20history%20command.png)

### Commit List

![Commits list](./media/commits%20list.png)

### Commit Details

![Commit details](./media/commit%20details.png)

### File Diff In Selected Commit

![File diff in selected commit](./media/file%20diff%20in%20selected%20commit.png)

## Releases

Releases are created manually from the GitHub Actions UI.

The workflow:

1. lets you choose the version bump type: `patch`, `minor`, or `major`
2. bumps the version in `package.json` and `package-lock.json`
3. commits the version bump back to the branch
4. creates a git tag like `v0.1.0`
5. runs tests and build
6. packages `vscode-file-log-0.1.0.vsix`
7. publishes to the VS Code Marketplace if `VSCE_PAT` is configured
8. creates a GitHub Release and uploads the VSIX asset

To run it:

1. open the repository on GitHub
2. go to `Actions`
3. select the `Release VSIX` workflow
4. click `Run workflow`
5. choose `patch`, `minor`, or `major`
6. start the run on your default branch

The result is a versioned release artifact that is ready to install or share.

## Tech Stack

- TypeScript
- VS Code Extension API
- Vitest
- `@vscode/vsce`

## Limitations

- this extension depends on Git being available in the environment
- diffs are file-focused and compare the selected commit to its parent
- first-commit and complex rename history cases are intentionally kept simple for now

## License

MIT
