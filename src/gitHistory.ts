import * as path from 'node:path';

export type GitCommit = {
  hash: string;
  shortHash: string;
  subject: string;
  authorName: string;
  authorDate: string;
  body: string;
};

type GitShowUriOptions = {
  emptyWhenMissing?: boolean;
};

const LOG_SEPARATOR = '\u001f';
const RECORD_SEPARATOR = '\u001e';

export function getLogFormat(): string {
  return ['%H', '%h', '%s', '%an', '%aI', '%b'].join(LOG_SEPARATOR) + RECORD_SEPARATOR;
}

export function parseGitLog(output: string): GitCommit[] {
  return output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, shortHash, subject, authorName, authorDate, ...bodyParts] = record.split(LOG_SEPARATOR);
      const body = bodyParts.join(LOG_SEPARATOR).trim();

      if (!hash || !shortHash || !subject || !authorName || !authorDate) {
        return undefined;
      }

      return {
        hash,
        shortHash,
        subject,
        authorName,
        authorDate,
        body,
      } satisfies GitCommit;
    })
    .filter((commit): commit is GitCommit => commit !== undefined);
}

export function getRelativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

export function toGitShowUri(
  repoRoot: string,
  relativePath: string,
  ref: string,
  options: GitShowUriOptions = {},
): string {
  const query = new URLSearchParams({
    repo: repoRoot,
    path: relativePath,
    ref,
  });

  if (options.emptyWhenMissing) {
    query.set('emptyWhenMissing', 'true');
  }

  return `git-file-history:${encodeURI(relativePath)}?${query.toString()}`;
}

export function shouldTreatMissingRevisionAsEmpty(message: string): boolean {
  return (
    message.includes('exists on disk, but not in') ||
    message.includes('invalid object name') ||
    message.includes('unknown revision or path not in the working tree')
  );
}
