import * as cp from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { getLogFormat, getRelativePath, parseGitLog, toGitShowUri, type GitCommit } from './gitHistory';

const execFile = promisify(cp.execFile);

type GitShowQuery = {
  repo: string;
  path: string;
  ref: string;
};

class GitFileContentProvider implements vscode.TextDocumentContentProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();

  readonly onDidChange = this.onDidChangeEmitter.event;

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const query = parseGitShowQuery(uri);
    const content = await readFileAtRevision(query.repo, query.path, query.ref);

    return content;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new GitFileContentProvider();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('git-file-history', provider),
    vscode.commands.registerCommand('fileGitHistory.showGitHistory', async (resource?: vscode.Uri) => {
      await showGitHistory(resource);
    }),
  );
}

export function deactivate(): void {}

async function showGitHistory(resource?: vscode.Uri): Promise<void> {
  const fileUri = await resolveTargetFile(resource);
  if (!fileUri) {
    return;
  }

  const repoRoot = await getRepoRoot(fileUri.fsPath);
  if (!repoRoot) {
    void vscode.window.showErrorMessage('No Git repository found for this file.');
    return;
  }

  const relativePath = getRelativePath(repoRoot, fileUri.fsPath);
  const commits = await getFileHistory(repoRoot, relativePath);

  if (commits.length === 0) {
    void vscode.window.showInformationMessage('No git history found for this file.');
    return;
  }

  const picked = await vscode.window.showQuickPick(
    commits.map((commit) => ({
      label: `${commit.shortHash} ${commit.subject}`,
      description: commit.authorDate,
      commit,
    })),
    {
      title: `Git history: ${path.basename(fileUri.fsPath)}`,
      matchOnDescription: true,
      placeHolder: 'Select a commit to open the file diff',
    },
  );

  if (!picked) {
    return;
  }

  await openDiffEditor(repoRoot, relativePath, picked.commit);
}

async function resolveTargetFile(resource?: vscode.Uri): Promise<vscode.Uri | undefined> {
  if (resource?.scheme === 'file') {
    try {
      const stat = await vscode.workspace.fs.stat(resource);
      if (stat.type === vscode.FileType.File) {
        return resource;
      }
    } catch {
      return undefined;
    }
  }

  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri?.scheme === 'file') {
    return activeUri;
  }

  void vscode.window.showWarningMessage('Open a file or use the explorer context menu on a file.');
  return undefined;
}

async function getRepoRoot(filePath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFile('git', ['rev-parse', '--show-toplevel'], {
      cwd: path.dirname(filePath),
    });

    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function getFileHistory(repoRoot: string, relativePath: string): Promise<GitCommit[]> {
  try {
    const { stdout } = await execFile(
      'git',
      ['log', `--format=${getLogFormat()}`, '--date=short', '--', relativePath],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 * 10 },
    );

    return parseGitLog(stdout);
  } catch {
    return [];
  }
}

async function readFileAtRevision(repoRoot: string, relativePath: string, ref: string): Promise<string> {
  try {
    const { stdout } = await execFile('git', ['show', `${ref}:${relativePath}`], {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 10,
      encoding: 'utf8',
    });

    return stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load file content from git.';
    return `Unable to load ${relativePath} at ${ref}.\n\n${message}`;
  }
}

async function openDiffEditor(repoRoot: string, relativePath: string, commit: GitCommit): Promise<void> {
  const previousRef = `${commit.hash}^`;
  const left = vscode.Uri.parse(toGitShowUri(repoRoot, relativePath, previousRef));
  const right = vscode.Uri.parse(toGitShowUri(repoRoot, relativePath, commit.hash));
  const title = `${path.basename(relativePath)} (${commit.shortHash})`;

  await vscode.commands.executeCommand('vscode.diff', left, right, title, {
    preview: true,
  });
}

function parseGitShowQuery(uri: vscode.Uri): GitShowQuery {
  const params = new URLSearchParams(uri.query);
  const repo = params.get('repo');
  const filePath = params.get('path');
  const ref = params.get('ref');

  if (!repo || !filePath || !ref) {
    throw new Error('Invalid git file history URI.');
  }

  return {
    repo,
    path: filePath,
    ref,
  };
}
