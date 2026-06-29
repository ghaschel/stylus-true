import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import versionrc from "../.versionrc.js";

const { infile, header } = versionrc;

const changelogPath = path.resolve(infile);

const changelogsDir = path.resolve("changelogs");

if (!fs.existsSync(changelogsDir)) fs.mkdirSync(changelogsDir);

// Get existing version files
const existingVersions = new Set();
if (fs.existsSync(changelogsDir)) {
  const files = fs.readdirSync(changelogsDir);
  files.forEach((file) => {
    if (file.endsWith(".md")) {
      const version = file.replace(".md", "");
      existingVersions.add(version);
    }
  });
}

const content = fs.existsSync(changelogPath)
  ? fs.readFileSync(changelogPath, "utf8")
  : "";

if (!content.trim()) {
  console.warn(`⚠️  ${infile} is empty or missing.`);
  process.exit(0);
}

// --- Parse Markdown ---
const tree = remark().use(remarkParse).parse(content);

// --- Collect version sections ---
const sections = [];
let current = null;
let mainHeader = null;

for (const node of tree.children) {
  if (node.type === "heading" && node.depth === 1 && !mainHeader) {
    mainHeader = node;
    continue;
  }

  // Stop processing if we hit another depth-1 heading (like "Changelog Index")
  // This prevents old index content from being included in version files
  if (node.type === "heading" && node.depth === 1 && mainHeader) {
    // We've hit another h1 heading - stop collecting version sections
    break;
  }

  // Check if this is a version heading (depth 2 with link containing version)
  if (node.type === "heading" && node.depth === 2) {
    const firstChild = node.children[0];
    // Check if it's a link with a version number pattern

    if (firstChild) {
      const regexVersion = new RegExp(/\d+\.\d+\.\d+/);

      if (
        firstChild.type === "link" &&
        firstChild.children &&
        firstChild.children[0] &&
        firstChild.children[0].type === "text"
      ) {
        const linkText = firstChild.children[0].value;
        const [matched] = linkText.match(regexVersion) ?? [];

        if (matched) {
          if (current) sections.push(current);
          current = { heading: node, nodes: [], version: matched };

          continue;
        }
      } else if (firstChild.type === "text") {
        const text = firstChild.value;
        const [matched] = text.match(regexVersion) ?? [];

        if (matched) {
          if (current) sections.push(current);
          current = { heading: node, nodes: [], version: matched };

          continue;
        }
      }
    }
  }

  // Add nodes to current section (skip if no section started yet)
  if (current) {
    current.nodes.push(node);
  }
}

// Push the last version
if (current) sections.push(current);

if (!sections.length) {
  console.warn("⚠️  No version sections found in changelog.");
  process.exit(0);
}

// --- Write per-version files (only new ones) ---
const newVersions = [];

for (const section of sections) {
  const version = section.version;

  // Only write if this version doesn't already exist
  if (!existingVersions.has(version)) {
    let sectionTree = {
      type: "root",
      children: [section.heading, ...section.nodes],
    };

    const md = remark().use(remarkStringify).stringify(sectionTree);
    const sectionContent = `${header}${md}`.trim() + "\n";

    const versionFile = path.join(changelogsDir, `${version}.md`);
    fs.writeFileSync(versionFile, sectionContent, "utf8");
    newVersions.push(version);
    console.log(`  ✅ Created changelogs/${version}.md`);
  }
}

// --- Collect all versions (existing + new) ---
const allVersions = new Set([
  ...existingVersions,
  ...sections.map((s) => s.version),
]);
const files = Array.from(allVersions).map((version) => ({
  version,
  file: path.join(changelogsDir, `${version}.md`),
}));

// --- Build Changelog Index ---
files.sort((a, b) =>
  b.version.localeCompare(a.version, undefined, { numeric: true })
);

// Build the index tree with main header
const indexTree = {
  type: "root",
  children: [
    {
      type: "heading",
      depth: 1,
      children: [{ type: "text", value: "Changelog Index" }],
    },
    {
      type: "list",
      ordered: false,
      spread: false,
      children: files.map((f) => ({
        type: "listItem",
        spread: false,
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: `./changelogs/${f.version}.md`,
                children: [{ type: "text", value: f.version }],
              },
            ],
          },
        ],
      })),
    },
  ],
};

const indexMd = remark()
  .use(remarkStringify, {
    bullet: "-",
    listItemIndent: "one",
    tight: true,
  })
  .stringify(indexTree);
fs.writeFileSync(changelogPath, indexMd, "utf8");

if (newVersions.length > 0) {
  console.log(`\n✅ Created ${newVersions.length} new version file(s)`);
}
if (existingVersions.size > 0) {
  console.log(`📋 Kept ${existingVersions.size} existing version file(s)`);
}
console.log(
  `📝 Updated ${infile} with index of ${files.length} total version(s)\n`
);

// --- Amend the release commit to include split changelog files ---
try {
  execSync(`git add ${changelogsDir} ${changelogPath}`);
  execSync(`git commit --amend --no-edit --no-verify`);
  console.log(`✅ Amended release commit to include split changelog files.`);
} catch (err) {
  console.error("⚠️  Failed to amend commit:", err.message);
}
