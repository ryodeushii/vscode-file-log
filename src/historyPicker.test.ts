import { describe, expect, it } from 'vitest';
import {
  buildCommitQuickPickItem,
  buildCommitDetailQuickPickItems,
  type HistoryPickerSettings,
} from './historyPicker';
import type { GitCommit } from './gitHistory';

const commit: GitCommit = {
  hash: '1234567890abcdef',
  shortHash: '1234567',
  subject: 'Add file history picker settings',
  authorName: 'Jane Doe',
  authorDate: '2026-04-03T10:11:12+00:00',
  body: 'Adds detail rows and hover metadata.\nSecond line.',
};

describe('buildCommitQuickPickItem', () => {
  it('renders a compact item when optional metadata is disabled', () => {
    const settings: HistoryPickerSettings = {
      showDate: false,
      showTime: false,
      showDetailsInPicker: false,
    };

    expect(buildCommitQuickPickItem(commit, settings)).toMatchObject({
      label: '1234567 Add file history picker settings',
      description: undefined,
      detail: undefined,
    });
  });

  it('renders date, time, and detail metadata when enabled', () => {
    const settings: HistoryPickerSettings = {
      showDate: true,
      showTime: true,
      showDetailsInPicker: true,
    };

    expect(buildCommitQuickPickItem(commit, settings)).toMatchObject({
      label: '1234567 Add file history picker settings',
      description: '2026-04-03 10:11:12',
      detail: 'Jane Doe | 1234567890abcdef | Adds detail rows and hover metadata.',
    });
  });

  it('builds a second-step details picker with open diff action', () => {
    const settings: HistoryPickerSettings = {
      showDate: true,
      showTime: true,
      showDetailsInPicker: false,
    };

    expect(buildCommitDetailQuickPickItems(commit, settings)).toEqual([
      {
        label: '$(git-commit) Commit',
        description: '1234567',
        detail: '1234567890abcdef',
      },
      {
        label: '$(person) Author',
        detail: 'Jane Doe',
      },
      {
        label: '$(history) Date',
        detail: '2026-04-03 10:11:12',
      },
      {
        label: '$(note) Message',
        detail: 'Adds detail rows and hover metadata.\nSecond line.',
      },
      {
        label: '$(diff) Open Diff',
        detail: 'Compare this commit against its parent for the selected file.',
        action: 'openDiff',
      },
    ]);
  });
});
