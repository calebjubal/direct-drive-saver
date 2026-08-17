# Contributing to DriveCam

Thanks for helping improve DriveCam. This guide describes the expected development workflow and the security requirements for changes that interact with Google Drive or Supabase.

## Getting started

1. Fork or clone the repository.
2. Install the application dependencies:

   ```bash
   npm ci
   ```

3. Create `.env.local` in the repository root using the template in [README.md](./README.md).
4. Configure the Google provider and redirect URLs in Supabase.
5. Start the development server:

   ```bash
   npm exec next dev
   ```

## Making a change

1. Create a focused branch from the latest target branch.
2. Keep each change limited to one behavior or concern.
3. Preserve the mobile-first layout and keyboard accessibility.
4. Prefer the narrowest OAuth permission that can satisfy the requested feature.
5. Update documentation when behavior, setup, permissions, or environment variables change.
6. Add an entry under **Unreleased** in [CHANGELOG.md](./CHANGELOG.md) for user-visible changes.

## Code organization

- UI state and screen flows belong in `app/page.js`.
- Shared Drive requests belong in `app/lib/drive.js`.
- Supabase client configuration belongs in `app/lib/supabase.js`.
- Global visual tokens and responsive styles belong in `app/globals.css`.

Keep API operations separate from components where practical. Drive request helpers should throw useful errors and must not silently swallow authorization failures.

## Validation

Before submitting a change, run:

```bash
npm run build
```

For UI or authentication changes, also test the relevant browser flow:

- Google OAuth reaches the intended consent flow.
- The requested OAuth scopes are accurate.
- Folder selection and save-location changes work.
- Capture, review, retake, and instant-save modes work.
- Folder and photo operations refresh the visible Drive contents.
- Mobile and desktop layouts have no horizontal overflow.
- The browser console has no errors or hydration warnings.

Do not use a production Drive account for destructive testing. Delete actions should remain recoverable by moving items to trash.

## Security requirements

- Do not commit `.env.local`, OAuth client secrets, provider tokens, refresh tokens, or Supabase secret keys.
- Only Supabase publishable keys may be used in browser code.
- Treat Google provider tokens as sensitive credentials.
- Do not log authorization headers, tokens, or private Drive metadata.
- Do not broaden OAuth scopes without documenting why the additional access is required.
- Restrict browser-visible Google API keys by API and allowed origin.
- Avoid permanently deleting Drive data; prefer the trash operation.

If a credential is accidentally committed, revoke or rotate it immediately. Removing it in a later commit does not remove it from Git history.

## Commit messages

Use concise [Conventional Commits](https://www.conventionalcommits.org/) messages:

```text
feat: add shared-drive folder selection
fix: restore capture after camera permission denial
docs: clarify Google OAuth configuration
refactor: isolate Drive upload requests
```

Use multiple focused commits when a change has independently reviewable parts. Do not mix generated files, formatting changes, and functional changes without a reason.

## Pull requests

A pull request should include:

- A short problem statement and solution summary
- Screenshots or a recording for visible UI changes
- Testing performed and its result
- Any new environment variables or OAuth scopes
- Security or migration considerations
- A corresponding changelog entry when applicable

Reviewers may request smaller commits or a reduced permission scope before approving a change.
