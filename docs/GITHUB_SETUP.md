# GitHub Repository Setup Guide

Complete guide for setting up a GitHub repository with this project.

## Initial Repository Creation

### 1. Create Repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: `webrtc-call-recorder`
3. **Description**: "Global WebRTC call recording application with legal compliance"
4. **Visibility**: Public (for OSS)
5. **Initialize with**: None (we already have commits)

### 2. Add Remote & Push Code

```bash
cd c:\Users\irosa\Desktop\Claude\Ring

# Add GitHub remote
git remote add origin https://github.com/YOUR-ORG/webrtc-call-recorder.git

# Push code
git push -u origin main

# Push tags
git push origin --tags
```

### 3. Configure Repository Settings

#### General Settings
- **Default branch**: main
- **Branch protection**: Enable for main/develop
- **Require status checks to pass**: Yes
- **Require pull request reviews**: Yes (at least 1)
- **Dismiss stale pull request approvals**: Yes
- **Require code owner reviews**: Yes
- **Allow auto-merge**: Yes

#### Security Settings
- **Enable GHSA (GitHub Security Advisory)**: Yes
- **Enable Dependabot alerts**: Yes
- **Enable Dependabot security updates**: Yes
- **Enable code scanning with CodeQL**: Yes

#### Actions Settings
- **Allow all actions**: Yes (or restrict to approved)
- **Artifact retention**: 30 days
- **Log retention**: 90 days

---

## GitHub Actions Configuration

### Workflows Included

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `server-ci.yml` | Push to main/PR | Server tests & quality checks |
| `mobile-ci.yml` | Push to main/PR | Mobile app tests & linting |
| `integration-tests.yml` | Push to main/PR | End-to-end + load tests |
| `release.yml` | Manual dispatch | Automated release process |

### Required Secrets

Add these secrets to the repository (Settings → Secrets → Actions):

```bash
# Optional: For npm registry publishing
NPM_TOKEN="your-npm-token-here"

# Optional: For Docker Hub
DOCKER_USERNAME="your-docker-username"
DOCKER_PASSWORD="your-docker-password"

# Optional: For AWS deployments
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"

# Optional: Email notifications
NOTIFICATION_EMAIL="dev-team@example.com"
```

### Enabling Workflows

1. Go to **Actions** tab
2. Review workflows - they should all be enabled by default
3. Click on each workflow to see recent runs
4. Check for any failures and fix issues

---

## Branch Protection Rules

### Protect Main Branch

1. Go to **Settings** → **Branches**
2. Click "Add rule"
3. **Branch name pattern**: `main`
4. Enable:
   - Require a pull request before merging
   - Dismiss stale pull request approvals when new commits are pushed
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Require code reviews from code owners
   - Include administrators

### Protect Develop Branch

Repeat above for `develop` branch but allow direct pushes for experimental changes.

---

## Code Owners Configuration

Create `.github/CODEOWNERS`:

```plaintext
# Global owners
* @your-username

# Server changes
/server/** @backend-team
/server/legaldb/** @legal-team

# Mobile changes
/mobile/** @mobile-team

# Documentation
/docs/** @docs-team
*.md @docs-team

# Workflows
.github/workflows/** @devops-team
```

---

## Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Node.js dependencies
  - package-ecosystem: "npm"
    directory: "/server"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 5

  - package-ecosystem: "npm"
    directory: "/mobile"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "04:00"
    open-pull-requests-limit: 5
```

---

## CodeQL Analysis

CodeQL is enabled by default for public repositories.

### View Results

1. Go to **Security** → **Code scanning**
2. Review findings
3. Each finding shows:
   - Severity level
   - File location
   - Suggested fix
   - Related documentation

### Suppressing False Positives

For legitimate findings that are not issues:

```javascript
// lgtm [js/sql-injection-detection]
// nosec
const query = `SELECT * FROM table WHERE id = ${id}`;
```

---

## Publishing to npm (Optional)

### Setup npm Publishing

1. Create npm account at https://www.npmjs.com
2. Create access token (Account → Tokens)
3. Add `NPM_TOKEN` secret to GitHub
4. Add publish script to workflow:

```yaml
- name: Publish to npm
  if: startsWith(github.ref, 'refs/tags/')
  run: |
    echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" > ~/.npmrc
    npm publish
```

---

## Release Management

### Creating a Release

#### Manual Release (Recommended for First Release)

```bash
# Create tag locally
git tag -a v0.2.0 -m "Release v0.2.0"

# Push tag
git push origin v0.2.0

# Go to GitHub → Releases
# Click "Draft a new release"
# Select tag v0.2.0
# Add release notes from CHANGELOG.md
# Publish
```

#### Automated Release (After v0.2.0)

```bash
# Go to Actions → Release workflow
# Click "Run workflow"
# Enter version: 0.3.0
# Set prerelease: false
# Click "Run workflow"
```

---

## GitHub Pages Documentation

### Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: main, /docs folder
4. Wait for publish to complete

### GitHub Pages Structure

```
/docs
├── index.md (rendered as home page)
├── setup.md
├── api.md
└── _config.yml (Jekyll config)
```

Create `docs/index.md`:

```markdown
# WebRTC Call Recorder Documentation

Welcome to the WebRTC Call Recorder documentation.

## Getting Started
- [Quick Start](../QUICKSTART.md)
- [Installation](../INSTALLATION.md)
- [Architecture](../ARCHITECTURE.md)

## Development
- [Developer Guide](./DEVELOPMENT.md)
- [API Reference](./API.md)

## Compliance
- [Legal Requirements](./LEGAL.md)
- [Security Policy](../.github/SECURITY.md)

## Contributing
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
```

---

## Status Badges

Add to top of README.md:

```markdown
# WebRTC Call Recorder

![GitHub](https://img.shields.io/github/license/your-org/webrtc-call-recorder)
![GitHub package.json version](https://img.shields.io/github/package-json/v/your-org/webrtc-call-recorder)
[![CI](https://github.com/your-org/webrtc-call-recorder/actions/workflows/server-ci.yml/badge.svg)](https://github.com/your-org/webrtc-call-recorder/actions)
[![codecov](https://codecov.io/gh/your-org/webrtc-call-recorder/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/webrtc-call-recorder)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

---

## Continuous Deployment (Optional)

### Deploy to AWS on Release

Add to `.github/workflows/release.yml`:

```yaml
- name: Deploy to AWS
  if: success()
  run: |
    # Deploy backend to ECS
    aws ecs update-service \
      --cluster webrtc-prod \
      --service webrtc-service \
      --force-new-deployment
```

### Deploy to Kubernetes

```yaml
- name: Deploy to Kubernetes
  if: success()
  run: |
    kubectl set image deployment/webrtc \
      webrtc=your-registry/webrtc:${{ github.event.inputs.version }}
```

---

## Monitoring & Alerting

### GitHub Actions Notifications

Settings → Notifications → Actions:
- Notify on: Check completions
- Recipients: Notify team members

### Slack Integration (Optional)

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add webhook URL as GitHub secret
3. Add Slack notification to workflows:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "GitHub Action failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*GitHub Action Failed*\nRepository: ${{ github.repository }}\nBranch: ${{ github.ref }}"
            }
          }
        ]
      }
```

---

## First-Time Contributor Guide

Create `docs/CONTRIBUTING_FIRST_TIME.md`:

```markdown
# First-Time Contributor Guide

Welcome! Here's how to make your first contribution:

## Step 1: Fork the Repository
Click the "Fork" button on the repository page.

## Step 2: Clone Your Fork
\`\`\`bash
git clone https://github.com/YOUR-USERNAME/webrtc-call-recorder.git
cd webrtc-call-recorder
\`\`\`

## Step 3: Create a Branch
\`\`\`bash
git checkout -b feature/my-feature
\`\`\`

## Step 4: Make Changes
Edit files, run tests, commit changes.

## Step 5: Push & Create PR
\`\`\`bash
git push origin feature/my-feature
\`\`\`
Then create a pull request on GitHub.

## Step 6: Address Review
Make requested changes, push again.

## Step 7: Merge
Maintainers will merge when approved!
```

---

## Maintenance Tasks

### Weekly
- [ ] Review GitHub Dependabot alerts
- [ ] Check workflow run results
- [ ] Review open pull requests

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit fix`
- [ ] Review security alerts
- [ ] Update CHANGELOG for upcoming release

### Quarterly
- [ ] Major version updates (if breaking changes)
- [ ] Review and update documentation
- [ ] Security audit (third-party recommended)
- [ ] Performance benchmarking

---

## Troubleshooting

### Workflows Not Running

1. Check **Actions** tab for errors
2. Verify branch protection rules
3. Check workflow syntax: `yamllint .github/workflows/`
4. Verify secrets are set

### Status Checks Failing

1. Go to **Pull Request** → **Checks**
2. Click on failing check for details
3. Review logs
4. Fix code locally and push

### Coverage Not Updating

1. Ensure `codecov` action is in workflow
2. Verify `lcov.info` is generated
3. Check codecov.io settings

---

**Last Updated**: 2025-11-17

For more help, see:
- [GitHub Documentation](https://docs.github.com)
- [GitHub Actions Guide](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
