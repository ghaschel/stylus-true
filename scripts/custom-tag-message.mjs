import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { remark } from "remark";
import remarkParse from "remark-parse";

// Get the current version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve("package.json"), "utf8")
);
const version = packageJson.version;

// Read the changelog for this version
const changelogFile = path.resolve(`changelogs/${version}.md`);

if (!fs.existsSync(changelogFile)) {
  console.warn(`⚠️  Changelog file not found: ${changelogFile}`);
  process.exit(0);
}

const changelogContent = fs.readFileSync(changelogFile, "utf8");

// Extract plain text from markdown AST
const extractText = (node) => {
  if (node.type === "text") {
    return node.value;
  }

  if (node.children) {
    return node.children.map(extractText).join("");
  }

  return "";
};

const extractChangelogContent = (markdown) => {
  const tree = remark().use(remarkParse).parse(markdown);

  let date = "";
  const contentLines = [];
  let skipNextHeading = false;

  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 1) {
      // Skip the main "Changelog" heading
      skipNextHeading = true;
      continue;
    }

    if (node.type === "heading" && node.depth === 2) {
      // Extract date from version heading like "2.11.0 (2025-11-04)"
      const text = extractText(node);
      const dateMatch = text.match(/\((\d{4}-\d{2}-\d{2})\)/);
      if (dateMatch) {
        date = dateMatch[1];
      }
      // Skip the version heading itself
      continue;
    }

    if (node.type === "heading" && node.depth === 3) {
      // Section headings like "Features", "Bug Fixes"
      const text = extractText(node);
      contentLines.push("\n" + text);
    } else if (node.type === "list") {
      for (const item of node.children) {
        const text = extractText(item);
        contentLines.push("- " + text.trim());
      }
    } else if (node.type === "paragraph") {
      const text = extractText(node);
      if (text.trim()) {
        contentLines.push(text);
      }
    }
  }

  return { date, content: contentLines.join("\n").trim() };
};

const { date, content } = extractChangelogContent(changelogContent);

// Build the tag message
const tagMessage = `chore(release): v${version}

${date}

${content}\n\t\u00A0`;

// Delete the existing tag and recreate it with the custom message
const tagName = `v${version}`;

try {
  // Write message to temp file to handle multiline properly
  const tempFile = path.resolve(".git", "TAG_MESSAGE");
  fs.writeFileSync(tempFile, tagMessage, "utf8");

  // Delete the tag locally
  execSync(`git tag -d ${tagName}`, { stdio: "ignore" });

  // Create a new annotated tag with the custom message from file
  execSync(`git tag -a ${tagName} -F "${tempFile}" HEAD`, {
    stdio: "inherit",
  });

  // Clean up temp file
  fs.unlinkSync(tempFile);

  console.log(`\n✅ Updated tag ${tagName} with custom changelog message`);
} catch (err) {
  console.error("⚠️  Failed to update tag:", err.message);
  process.exit(1);
}
