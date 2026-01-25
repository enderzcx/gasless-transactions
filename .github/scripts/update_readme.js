const fs = require('fs');
const path = require('path');

const readmePath = path.join(process.env.GITHUB_WORKSPACE, 'README.md');

// Helper to extract value from issue body
function extractValue(body, keyRegex) {
  const match = body.match(keyRegex);
  return match ? match[1].trim() : '';
}

// Format table row column (escape pipes, remove newlines)
function formatCol(text) {
  if (!text) return '-';
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function updateRegistration(issue, readmeContent) {
  const body = issue.body || '';
  
  // Fields match register.md template
  const name = extractValue(body, /\*\*Name \[姓名\]:\*\*\s*(.*)/i);
  const contact = extractValue(body, /\*\*ContactMethod.*?:\*\*\s*(.*)/i);
  const wantsTeam = extractValue(body, /\*\*WantsTeam.*?:\*\*\s*(.*)/i);
  const comment = extractValue(body, /\*\*Comment.*?:\*\*\s*(.*)/i);
  
  const githubId = issue.user.login;
  const issueUrl = issue.html_url;
  
  // Table columns: | 姓名 | GitHub ID | 联系方式 | 组队意愿 | 备注 | 更新资料 |
  const newRow = `| ${formatCol(name)} | [@${githubId}](https://github.com/${githubId}) | ${formatCol(contact)} | ${formatCol(wantsTeam)} | ${formatCol(comment)} | [Link](${issueUrl}) |`;
  
  const startMarker = '<!-- Registration star -->';
  const endMarker = '<!-- Registration end -->';
  
  return insertRow(readmeContent, startMarker, endMarker, newRow);
}

function updateSubmission(issue, readmeContent) {
  const body = issue.body || '';
  
  // Fields match submission.md template
  const projectName = extractValue(body, /\*\*ProjectName.*?:\*\*\s*(.*)/i);
  const description = extractValue(body, /\*\*Brief description.*?:\*\*\s*(.*)/i);
  const repoLink = extractValue(body, /\*\*Github Repo Link.*?:\*\*\s*(.*)/i);
  
  const githubId = issue.user.login;
  const date = new Date().toISOString().split('T')[0];
  
  // Table columns: | 项目名称 | GitHub ID | 项目描述 | 项目链接 | 提交时间 |
  const newRow = `| ${formatCol(projectName)} | [@${githubId}](https://github.com/${githubId}) | ${formatCol(description)} | [Repo](${repoLink}) | ${date} |`;
  
  const startMarker = '<!-- Submission star -->';
  const endMarker = '<!-- Submission end -->';
  
  return insertRow(readmeContent, startMarker, endMarker, newRow);
}

function insertRow(content, startMarker, endMarker, newRow) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    console.log(`Markers not found: ${startMarker}, ${endMarker}`);
    return content;
  }
  
  const sectionContent = content.substring(startIndex, endIndex);
  let newSection = sectionContent;

  // Remove the "Pending update" placeholder row if it exists
  // | 待更新... | - | ...
  if (newSection.includes('| 待更新... |')) {
    // Regex to remove the line containing "待更新..."
    newSection = newSection.replace(/.*\|\s*待更新\.\.\.\s*\|.*\r?\n?/, '');
  }
  
  // Ensure we append cleanly. We look for the last pipe '|' character or just append at the end of section
  // To avoid messing up table formatting, we appended to the end of the content before the endMarker.
  // We trim right to remove excess newlines then add newline + newRow + newline
  
  newSection = newSection.trimEnd() + '\n' + newRow + '\n';
  
  return content.substring(0, startIndex) + newSection + content.substring(endIndex);
}

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath || !fs.existsSync(eventPath)) {
  console.log('Event path not found');
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const issue = event.issue;

if (!issue) {
  console.log('No issue found in event');
  process.exit(0);
}

let newContent = fs.readFileSync(readmePath, 'utf8');
let updated = false;

const labels = issue.labels ? issue.labels.map(l => l.name) : [];

if (labels.includes('registration')) {
  console.log('Processing Registration...');
  newContent = updateRegistration(issue, newContent);
  updated = true;
} else if (labels.includes('submission')) {
  console.log('Processing Submission...');
  newContent = updateSubmission(issue, newContent);
  updated = true;
} else {
  console.log('No matching labels found (registration, submission)');
}

if (updated) {
  fs.writeFileSync(readmePath, newContent);
  console.log('README.md updated');
}
