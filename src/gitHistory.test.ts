import { describe, expect, it } from 'vitest';
import { getLogFormat, getRelativePath, parseGitLog, toGitShowUri } from './gitHistory';

describe('parseGitLog', () => {
  it('parses git log rows into commits', () => {
    const separator = '\u001f';
    const output = [
      ['abc123', 'abc123', 'Initial commit', '2026-04-03'].join(separator),
      ['def456', 'def456', 'Update feature', '2026-04-04'].join(separator),
    ].join('\n');

    expect(parseGitLog(output)).toEqual([
      {
        hash: 'abc123',
        shortHash: 'abc123',
        subject: 'Initial commit',
        authorDate: '2026-04-03',
      },
      {
        hash: 'def456',
        shortHash: 'def456',
        subject: 'Update feature',
        authorDate: '2026-04-04',
      },
    ]);
  });

  it('skips malformed rows', () => {
    const separator = '\u001f';
    const output = [
      ['abc123', 'abc123', 'Initial commit', '2026-04-03'].join(separator),
      'broken-line',
    ].join('\n');

    expect(parseGitLog(output)).toEqual([
      {
        hash: 'abc123',
        shortHash: 'abc123',
        subject: 'Initial commit',
        authorDate: '2026-04-03',
      },
    ]);
  });
});

describe('git history helpers', () => {
  it('uses the expected git log format', () => {
    expect(getLogFormat()).toBe('%H\u001f%h\u001f%s\u001f%ad');
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
});
