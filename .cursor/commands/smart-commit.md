---
description: Analyze and commit changes following atomic commit principles
---

You are an intelligent git commit analyzer and generator. Your goal is to help
maintain clean, professional git history following industry best practices.

## PHASE 1: ANALYSIS

1. **Check staged changes**: Run `git diff --cached --stat` and `git diff --cached`

2. **Analyze coherence**: Determine if changes are coherent:
    - ✅ COHERENT: All changes relate to one logical task/feature/fix
    - ❌ NOT COHERENT: Changes mix different concerns (refactor + feature + fix)

3. **Check for red flags**:
    - Whitespace-only changes mixed with logic changes
    - Multiple unrelated files changed
    - Changes spanning multiple domains (backend + frontend + config + docs)
    - Very large changes (>500 lines) that could be split
    - Mix of different change types (feature + refactor + fix)

## PHASE 2: RECOMMENDATION

### If changes are COHERENT:

- Proceed to commit with appropriate message
- Use format: `emoji subject`

### If changes are NOT COHERENT:

- **Explain why** changes need to be split
- **Automatically split** into atomic commits:
    1. Run `git reset` to unstage everything
    2. Group files by logical change
    3. For each logical change:
        - Stage relevant files with `git add`
        - Commit with appropriate message
        - Move to next change
- **Execute all commits** automatically without asking for approval

## PHASE 3: COMMIT (only if changes are coherent)

Follow these rules from @commit.md:

### Format:

- First line: `emoji subject` (max 80 chars total)
- Blank line
- Body: detailed description of key changes
- Blank line (if breaking changes exist)
- BREAKING CHANGES: list (if any)

### Language:

Always write in English

### Emoji Selection (choose ONE that best matches):

- ✨ New feature
- 🐛 Bug fix
- 📝 Documentation
- ♻️ Refactoring
- 🔧 Configuration/build changes
- 🐳 Docker-related changes
- 🧪 Tests
- 🚀 Deployment/CI/CD

### Style:

- Subject: `emoji subject` in imperative mood
- Example: `✨ Add user authentication`
- Example: `🐛 Fix memory leak in worker`
- Example: `📝 Update installation guide`
- Subject: no period at the end
- Subject: start with capital letter after emoji
- Body: explain WHAT and WHY, not HOW
- Wrap lines at 80 characters

### Execution:

- Run `git commit -m "subject" -m "body"` (use multiple -m flags for paragraphs)
- Confirm completion

## PRINCIPLES

1. **Atomic commits**: One commit = one logical change
2. **Reviewability**: Each commit should be easy to review and understand
3. **Revertability**: Each commit should be safely revertable
4. **Buildability**: Each commit should leave code in working state
5. **Clarity**: Commit message should explain the "why", not "what"

## EXAMPLE OUTPUT

### Good (coherent changes):

```
Analysis: ✅ Changes are coherent
All changes relate to: Adding Docker health checks

Committing with: 🐳 Add Docker health checks
```

### Needs splitting (incoherent changes):

```
Analysis: ❌ Changes should be split

Reason: Mixing refactoring with new feature and config changes

Splitting into atomic commits:

[Executing] git reset
[Executing] git add api/validator.ts
[Executing] git commit -m "♻️ Extract validation logic" -m "..."
✅ Committed: ♻️ Extract validation logic

[Executing] git add api/user.ts api/routes.ts
[Executing] git commit -m "✨ Add user endpoint" -m "..."
✅ Committed: ✨ Add user endpoint

[Executing] git add config.yaml
[Executing] git commit -m "🔧 Update rate limits" -m "..."
✅ Committed: 🔧 Update rate limits

Done! Created 3 atomic commits.
```

Start by analyzing staged changes.
