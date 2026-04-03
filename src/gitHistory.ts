import * as path from 'node:path';

export type GitCommit = {
  hash: string;
  shortHash: string;
  subject: string;
  authorDate: string;
};

const LOG_SEPARATOR = '\u001f';

export function getLogFormat(): string {
  return ['%H', '%h', '%s', '%ad'].join(LOG_SEPARATOR);
}

export function parseGitLog(output: string): GitCommit[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, subject, authorDate] = line.split(LOG_SEPARATOR);

      if (!hash || !shortHash || !subject || !authorDate) {
        return undefined;
      }

      return {
        hash,
        shortHash,
        subject,
        authorDate,
      } satisfies GitCommit;
    })
    .filter((commit): commit is GitCommit => commit !== undefined);
}

export function getRelativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

export function toGitShowUri(repoRoot: string, relativePath: string, ref: string): string {
  const query = new URLSearchParams({
    repo: repoRoot,
    path: relativePath,
    ref,
  });

  return `git-file-history:${encodeURI(relativePath)}?${query.toString()}`;
}
