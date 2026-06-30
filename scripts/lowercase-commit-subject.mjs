import fs from "fs";

// Get the commit message file path from command line argument
const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
  console.warning(
    "No commit message provided, skipping lowercase conversion and returning to commitlint"
  );
  process.exit(0);
}

let commitMsg = fs.readFileSync(commitMsgFile, "utf8");
const conventionalCommitRegex = /^(\w+)(\([^)]+\))?(!?):\s*(.+)$/m;

const match = commitMsg.match(conventionalCommitRegex);

if (match) {
  const [_, type, scope = "", bang = "", subject] = match;
  const lowercaseSubject = subject.toLowerCase();
  const newFirstLine = `${type}${scope}${bang}: ${lowercaseSubject}`;

  const lines = commitMsg.split("\n");
  lines[0] = newFirstLine;
  const newCommitMsg = lines.join("\n");

  fs.writeFileSync(commitMsgFile, newCommitMsg, "utf8");
}

process.exit(0);
