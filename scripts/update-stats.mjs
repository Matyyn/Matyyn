import fs from 'fs';
import path from 'path';

const token = process.env.GITHUB_TOKEN;
const username = process.env.GITHUB_ACTOR || 'Matyyn';

if (!token) {
  console.error('GITHUB_TOKEN is required');
  process.exit(1);
}

const query = `
query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes {
        stargazerCount
        isPrivate
      }
    }
    pullRequests { totalCount }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}
`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Matyyn-Profile-Updater',
  },
  body: JSON.stringify({ query, variables: { login: username } }),
});

const json = await res.json();
if (!json.data?.user) {
  console.error('Failed to fetch GitHub GraphQL data:', JSON.stringify(json));
  process.exit(1);
}

const user = json.data.user;
const publicRepos = user.repositories.nodes.filter(r => !r.isPrivate).length;
const totalStars = user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);
const totalPRs = user.pullRequests.totalCount;
const followers = user.followers.totalCount;
const yearContributions = user.contributionsCollection.contributionCalendar.totalContributions;

// Calculate current streak from calendar days
const days = user.contributionsCollection.contributionCalendar.weeks
  .flatMap(w => w.contributionDays)
  .sort((a, b) => a.date.localeCompare(b.date));

let currentStreak = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount > 0) {
    currentStreak++;
  } else if (i < days.length - 1) {
    break;
  }
}

const streakRingOffset = Math.max(0, Math.round(289 - (Math.min(currentStreak, 365) / 365) * 289));
const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const svg = `<svg fill="none" viewBox="0 0 440 205" width="440" height="205" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1527" />
      <stop offset="100%" stop-color="#111c38" />
    </linearGradient>
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0.45" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
  </defs>

  <style>
    .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 16px; fill: #38bdf8; }
    .subtitle { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 11px; fill: #94a3b8; }
    .label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 12.5px; fill: #cbd5e1; }
    .val { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 13px; fill: #f8fafc; }
    .streak-num { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 24px; fill: #38bdf8; }
    .streak-lbl { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 10.5px; fill: #7dd3fc; }
  </style>

  <rect x="1" y="1" width="438" height="203" rx="12" fill="url(#cardBg)" stroke="url(#cardBorder)" stroke-width="1.5" />

  <text x="22" y="32" class="title">Abdul Mateen's GitHub Stats</text>
  <text x="22" y="48" class="subtitle">@${username} · Updated ${todayLabel}</text>
  <line x1="22" y1="60" x2="418" y2="60" stroke="#334155" stroke-width="1" />

  <g transform="translate(22, 82)">
    <text x="0" y="0" class="label">📊 Contributions (Last Year):</text>
    <text x="210" y="0" class="val">${yearContributions}</text>

    <text x="0" y="25" class="label">📦 Total Owned Repos:</text>
    <text x="210" y="25" class="val">${user.repositories.totalCount} (${publicRepos} public)</text>

    <text x="0" y="50" class="label">⭐ Total Stars Earned:</text>
    <text x="210" y="50" class="val">${totalStars}</text>

    <text x="0" y="75" class="label">🔀 Total Pull Requests:</text>
    <text x="210" y="75" class="val">${totalPRs}</text>

    <text x="0" y="100" class="label">👥 Followers:</text>
    <text x="210" y="100" class="val">${followers}</text>
  </g>

  <g transform="translate(345, 130)">
    <circle cx="0" cy="0" r="46" fill="#0f172a" stroke="#1e293b" stroke-width="6" />
    <circle cx="0" cy="0" r="46" fill="none" stroke="url(#accentGrad)" stroke-width="6" stroke-dasharray="289" stroke-dashoffset="${streakRingOffset}" stroke-linecap="round" />
    <text x="0" y="-2" text-anchor="middle" class="streak-num">${currentStreak}</text>
    <text x="0" y="16" text-anchor="middle" class="streak-lbl">DAY STREAK</text>
    <text x="0" y="31" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" fill="#64748b">Live Graph</text>
  </g>
</svg>
`;

const outPath = path.join(process.cwd(), 'assets', 'stats.svg');
fs.writeFileSync(outPath, svg, 'utf8');
console.log('Updated stats.svg successfully.');
