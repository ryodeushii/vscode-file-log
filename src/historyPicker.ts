import type * as vscode from 'vscode';
import type { GitCommit } from './gitHistory';

export type HistoryPickerSettings = {
  showDate: boolean;
  showTime: boolean;
  showDetailsInPicker: boolean;
};

type CommitQuickPickItem = vscode.QuickPickItem & {
  commit: GitCommit;
};

export type CommitDetailQuickPickItem = vscode.QuickPickItem & {
  action?: 'openDiff';
};

export function buildCommitQuickPickItem(
  commit: GitCommit,
  settings: HistoryPickerSettings,
): CommitQuickPickItem {
  const formattedDate = formatCommitDate(commit.authorDate, settings);
  const summary = firstNonEmptyLine(commit.body);

  return {
    label: `${commit.shortHash} ${commit.subject}`,
    description: formattedDate || undefined,
    detail: settings.showDetailsInPicker
      ? [commit.authorName, commit.hash, summary].filter(Boolean).join(' | ')
      : undefined,
    commit,
  };
}

export function getHistoryPickerSettings(configuration: vscode.WorkspaceConfiguration): HistoryPickerSettings {
  return {
    showDate: configuration.get<boolean>('showDate', true),
    showTime: configuration.get<boolean>('showTime', false),
    showDetailsInPicker: configuration.get<boolean>('showDetailsInPicker', false),
  };
}

export function buildCommitDetailQuickPickItems(
  commit: GitCommit,
  settings: HistoryPickerSettings,
): CommitDetailQuickPickItem[] {
  const formattedDate = formatCommitDate(commit.authorDate, settings);

  return [
    {
      label: '$(git-commit) Commit',
      description: commit.shortHash,
      detail: commit.hash,
    },
    {
      label: '$(person) Author',
      detail: commit.authorName,
    },
    {
      label: '$(history) Date',
      detail: formattedDate || commit.authorDate,
    },
    {
      label: '$(note) Message',
      detail: commit.body.trim() || commit.subject,
    },
    {
      label: '$(diff) Open Diff',
      detail: 'Compare this commit against its parent for the selected file.',
      action: 'openDiff',
    },
  ];
}

function formatCommitDate(value: string, settings: HistoryPickerSettings): string {
  if (!settings.showDate && !settings.showTime) {
    return '';
  }

  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
  if (isoMatch) {
    const [, datePart, timePart] = isoMatch;

    if (settings.showDate && settings.showTime) {
      return `${datePart} ${timePart}`;
    }

    if (settings.showDate) {
      return datePart;
    }

    return timePart;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return settings.showDate ? value : '';
  }

  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toISOString().slice(11, 19);

  if (settings.showDate && settings.showTime) {
    return `${datePart} ${timePart}`;
  }

  if (settings.showDate) {
    return datePart;
  }

  return timePart;
}
function firstNonEmptyLine(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) ?? '';
}
