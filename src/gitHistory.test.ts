import { describe, expect, it } from 'vitest';
import {
  getLogFormat,
  getRelativePath,
  parseGitLog,
  shouldTreatMissingRevisionAsEmpty,
  toGitShowUri,
} from './gitHistory';

describe('parseGitLog', () => {
  it('parses git log rows into commits', () => {
    const field = '\u001f';
    const record = '\u001e';
    const output = [
      ['abc123', 'abc123', 'Initial commit', 'Jane Doe', '2026-04-03T10:11:12+00:00', ''].join(field),
      ['def456', 'def456', 'Update feature', 'John Doe', '2026-04-04T12:13:14+00:00', ''].join(field),
    ].join(record);

    expect(parseGitLog(output)).toEqual([
      {
        hash: 'abc123',
        shortHash: 'abc123',
        subject: 'Initial commit',
        authorName: 'Jane Doe',
        authorDate: '2026-04-03T10:11:12+00:00',
        body: '',
      },
      {
        hash: 'def456',
        shortHash: 'def456',
        subject: 'Update feature',
        authorName: 'John Doe',
        authorDate: '2026-04-04T12:13:14+00:00',
        body: '',
      },
    ]);
  });

  it('skips malformed rows', () => {
    const field = '\u001f';
    const record = '\u001e';
    const output = [
      ['abc123', 'abc123', 'Initial commit', 'Jane Doe', '2026-04-03T10:11:12+00:00', ''].join(field),
      'broken-line',
    ].join(record);

    expect(parseGitLog(output)).toEqual([
      {
        hash: 'abc123',
        shortHash: 'abc123',
        subject: 'Initial commit',
        authorName: 'Jane Doe',
        authorDate: '2026-04-03T10:11:12+00:00',
        body: '',
      },
    ]);
  });

  it('parses author and body from record-separated git log output', () => {
    const field = '\u001f';
    const record = '\u001e';
    const output = [
      ['abc123', 'abc123', 'Initial commit', 'Jane Doe', '2026-04-03T10:11:12+00:00', 'Added the initial implementation.'].join(field),
      ['def456', 'def456', 'Update feature', 'John Doe', '2026-04-04T12:13:14+00:00', 'Improved details.\nAdded tests.'].join(field),
    ].join(record);

    expect(parseGitLog(output)).toEqual([
      {
        hash: 'abc123',
        shortHash: 'abc123',
        subject: 'Initial commit',
        authorName: 'Jane Doe',
        authorDate: '2026-04-03T10:11:12+00:00',
        body: 'Added the initial implementation.',
      },
      {
        hash: 'def456',
        shortHash: 'def456',
        subject: 'Update feature',
        authorName: 'John Doe',
        authorDate: '2026-04-04T12:13:14+00:00',
        body: 'Improved details.\nAdded tests.',
      },
    ]);
  });
});

describe('git history helpers', () => {
  it('uses the expected git log format', () => {
    expect(getLogFormat()).toBe('%H\u001f%h\u001f%s\u001f%an\u001f%aI\u001f%b\u001e');
  });

  it('normalizes paths for git commands', () => {
    expect(getRelativePath('/repo', '/repo/src/file.ts')).toBe('src/file.ts');
  });

  it('creates git content URIs', () => {
    expect(toGitShowUri('/repo', 'src/file.ts', 'abc123')).toBe(
      'git-file-history:src/file.ts?repo=%2Frepo&path=src%2Ffile.ts&ref=abc123',
    );
  });

  it('encodes spaces in virtual document paths', () => {
    expect(toGitShowUri('/repo', 'src/file name.ts', 'abc123')).toBe(
      'git-file-history:src/file%20name.ts?repo=%2Frepo&path=src%2Ffile+name.ts&ref=abc123',
    );
  });

  it('marks parent-side documents to render empty when the file was missing', () => {
    expect(toGitShowUri('/repo', 'src/file.ts', 'abc123^', { emptyWhenMissing: true })).toBe(
      'git-file-history:src/file.ts?repo=%2Frepo&path=src%2Ffile.ts&ref=abc123%5E&emptyWhenMissing=true',
    );
  });

  it('treats missing parent content errors as empty diff sources', () => {
    expect(shouldTreatMissingRevisionAsEmpty("fatal: path 'src/file.ts' exists on disk, but not in 'abc123^'"))
      .toBe(true);
    expect(shouldTreatMissingRevisionAsEmpty("fatal: invalid object name 'abc123^'.")).toBe(true);
    expect(
      shouldTreatMissingRevisionAsEmpty(
        "fatal: ambiguous argument 'abc123^:src/file.ts': unknown revision or path not in the working tree.",
      ),
    ).toBe(true);
    expect(shouldTreatMissingRevisionAsEmpty('fatal: not a git repository')).toBe(false);
  });
});
