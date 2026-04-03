import * as cp from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import {
  getLogFormat,
  getRelativePath,
  parseGitLog,
  shouldTreatMissingRevisionAsEmpty,
  toGitShowUri,
  type GitCommit,
} from './gitHistory';
import {
  buildCommitDetailQuickPickItems,
  buildCommitQuickPickItem,
  getHistoryPickerSettings,
  type CommitDetailQuickPickItem,
} from './historyPicker';

const execFile = promisify(cp.execFile);

type GitShowQuery = {
  repo: string;
  path: string;
  ref: string;
  emptyWhenMissing: boolean;
};

class GitFileContentProvider implements vscode.TextDocumentContentProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();

  readonly onDidChange = this.onDidChangeEmitter.event;

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const query = parseGitShowQuery(uri);
    try {
      return await readFileAtRevision(query.repo, query.path, query.ref);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load file content from git.';
      if (query.emptyWhenMissing && shouldTreatMissingRevisionAsEmpty(message)) {
        return '';
      }

      return `Unable to load ${query.path} at ${query.ref}.\n\n${message}`;
    }
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

  const settings = getHistoryPickerSettings(vscode.workspace.getConfiguration('fileGitHistory'));
  await showCommitHistoryQuickPick(path.basename(fileUri.fsPath), commits, settings, async (commit) => {
    await openDiffEditor(repoRoot, relativePath, commit);
  });
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
    throw new Error(message);
  }
}

async function openDiffEditor(repoRoot: string, relativePath: string, commit: GitCommit): Promise<void> {
  const previousRef = `${commit.hash}^`;
  const left = vscode.Uri.parse(toGitShowUri(repoRoot, relativePath, previousRef, { emptyWhenMissing: true }));
  const right = vscode.Uri.parse(toGitShowUri(repoRoot, relativePath, commit.hash));
  const title = `${path.basename(relativePath)} (${commit.shortHash})`;

  await vscode.commands.executeCommand('vscode.diff', left, right, title, {
    preview: false,
  });
}

async function showCommitHistoryQuickPick(
  fileName: string,
  commits: GitCommit[],
  settings: ReturnType<typeof getHistoryPickerSettings>,
  onOpenDiff: (commit: GitCommit) => Promise<void>,
): Promise<void> {
  const quickPick = vscode.window.createQuickPick<
    ReturnType<typeof buildCommitQuickPickItem> | CommitDetailQuickPickItem
  >();
  const detailButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('arrow-right'),
    tooltip: 'Show commit details',
  };
  const commitItems = commits.map((commit) => ({
    ...buildCommitQuickPickItem(commit, settings),
    buttons: [detailButton],
  }));
  const backButton = vscode.QuickInputButtons.Back;
  let currentView: 'history' | 'details' = 'history';
  let selectedCommit: GitCommit | undefined;

  const showHistoryView = () => {
    currentView = 'history';
    quickPick.step = 1;
    quickPick.totalSteps = 2;
    quickPick.buttons = [];
    quickPick.placeholder = 'Select a commit or open commit details';
    quickPick.items = commitItems;
    quickPick.activeItems = selectedCommit
      ? commitItems.filter((item) => item.commit.hash === selectedCommit?.hash)
      : [];
  };

  const showDetailsView = (commit: GitCommit) => {
    currentView = 'details';
    selectedCommit = commit;
    quickPick.step = 2;
    quickPick.totalSteps = 2;
    quickPick.buttons = [backButton];
    quickPick.placeholder = 'Review commit details or open the diff';
    quickPick.items = buildCommitDetailQuickPickItems(commit, settings);
    quickPick.activeItems = [quickPick.items[quickPick.items.length - 1]];
  };

  quickPick.title = `Git history: ${fileName}`;
  quickPick.placeholder = 'Select a commit or open commit details';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;
  showHistoryView();

  await new Promise<void>((resolve) => {
    const disposables: vscode.Disposable[] = [];
    let settled = false;

    const close = () => {
      if (settled) {
        return;
      }

      settled = true;
      for (const disposable of disposables) {
        disposable.dispose();
      }
      quickPick.hide();
      resolve();
    };

    disposables.push(
      quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        if (!selected) {
          return;
        }

        if (currentView === 'history' && 'commit' in selected) {
          selectedCommit = selected.commit;
          await onOpenDiff(selected.commit);
          close();
          return;
        }

        if (currentView === 'details' && 'action' in selected && selected.action === 'openDiff' && selectedCommit) {
          await onOpenDiff(selectedCommit);
          close();
        }
      }),
      quickPick.onDidTriggerItemButton(async ({ item, button }) => {
        if (button !== detailButton || !('commit' in item)) {
          return;
        }

        showDetailsView(item.commit);
      }),
      quickPick.onDidTriggerButton((button) => {
        if (button === backButton) {
          showHistoryView();
        }
      }),
      quickPick.onDidHide(() => {
        close();
      }),
    );

    quickPick.show();
  });
}

function parseGitShowQuery(uri: vscode.Uri): GitShowQuery {
  const params = new URLSearchParams(uri.query);
  const repo = params.get('repo');
  const filePath = params.get('path');
  const ref = params.get('ref');
  const emptyWhenMissing = params.get('emptyWhenMissing') === 'true';

  if (!repo || !filePath || !ref) {
    throw new Error('Invalid git file history URI.');
  }

  return {
    repo,
    path: filePath,
    ref,
    emptyWhenMissing,
  };
}
