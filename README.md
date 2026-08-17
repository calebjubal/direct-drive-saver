# DriveCam

DriveCam is a mobile-first web camera that saves photos directly to a folder in Google Drive. Users connect their Google account, select a destination, capture a photo, approve or retake it, and manage Drive folders and images without leaving the app.

## Features

- Google sign-in through Supabase Auth
- Live Google Drive folder and image browsing
- Configurable default save location
- Browser camera access with front/rear camera switching
- Flash, timer, grid, aspect-ratio, and zoom controls
- Optional approve-or-retake step after capture
- Instant-save mode for faster capture workflows
- Folder creation, renaming, moving, and trashing
- Image uploading, moving, and trashing
- Responsive mobile UI with a desktop phone-style presentation

## Technology

- [Next.js](https://nextjs.org/) 16
- [React](https://react.dev/) 19
- [Supabase Auth](https://supabase.com/docs/guides/auth) with Google OAuth
- [Google Drive API v3](https://developers.google.com/workspace/drive/api/guides/about-sdk)
- Browser `MediaDevices.getUserMedia()` and Canvas APIs

The web application is located in [`fixtures/next-app`](./fixtures/next-app).

## Prerequisites

- Node.js 20.9 or newer
- A Supabase project
- A Google Cloud project with the Google Drive API enabled
- A Google OAuth web client configured in Supabase

## Google and Supabase setup

### 1. Configure Google Cloud

1. Enable the Google Drive API for your Google Cloud project.
2. Configure the OAuth consent screen.
3. Add these scopes to the consent screen:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/drive`
4. Create an OAuth client with the **Web application** type.
5. Add `http://localhost:3000` as an authorized JavaScript origin for local development.
6. Add the Supabase callback URL as an authorized redirect URI:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

The full Drive scope is required because DriveCam can browse and manage existing files and folders. Google classifies this as a restricted scope, so a public production deployment may require OAuth app verification.

### 2. Configure Supabase

1. Open **Authentication → Providers → Google** in the Supabase dashboard.
2. Enable Google and enter the Google OAuth client ID and client secret.
3. Under **Authentication → URL Configuration**, set the local site URL to `http://localhost:3000`.
4. Add `http://localhost:3000/**` to the redirect allow list.

### 3. Create the environment file

Create `fixtures/next-app/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<key>
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=<restricted-google-api-key>
```

The publishable Supabase key is suitable for a browser client. The Google API key is also bundled into the browser because it is prefixed with `NEXT_PUBLIC_`; restrict it in Google Cloud to the Drive API and the application’s permitted website origins. The API key identifies the Google Cloud project but does not authorize access to private Drive data—OAuth provides that authorization.

## Local development

```bash
cd fixtures/next-app
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Camera access works on `localhost` during development. Production deployments must use HTTPS for browser camera permissions.

### Troubleshooting a stale client manifest

If Next.js reports that a module is missing from the React Client Manifest, stop every running DriveCam server and restart it with `npm run dev`. Development artifacts are stored in `.next-dev`, while production builds use `.next`, so running `npm run build` can no longer invalidate the development server.

## Production build

```bash
cd fixtures/next-app
npm run build
```

Run the compiled production application with `npm run start`.

## How the application works

1. Supabase redirects the user to Google with profile and full Drive scopes.
2. Supabase completes OAuth and returns a Google provider token with the user session.
3. DriveCam keeps the provider token in session storage and uses it for authenticated Drive API requests.
4. Folder metadata and image thumbnails are loaded from Drive rather than copied into a local database.
5. Captured images are uploaded directly to the currently selected Drive folder.
6. Delete actions move items to Google Drive trash so they remain recoverable.

## Project structure

```text
fixtures/next-app/
├── app/
│   ├── lib/
│   │   ├── drive.js       # Authenticated Google Drive API operations
│   │   └── supabase.js    # Supabase browser client
│   ├── globals.css        # Mobile UI and responsive styling
│   ├── layout.js          # Next.js metadata and application shell
│   └── page.js            # Authentication, camera, files, and settings UI
├── .env.local             # Local credentials; ignored by Git
├── package-lock.json
└── package.json
```

## Security notes

- Never commit `.env.local` or OAuth client secrets.
- Never put a Supabase secret or `service_role` key in a `NEXT_PUBLIC_` variable.
- Provider tokens can access private Drive data. DriveCam stores the token for the browser session only and removes it on sign-out.
- Supabase does not refresh Google provider tokens automatically. If Drive access expires, the app asks the user to reconnect.
- Restrict the Google API key by API and allowed origin before deploying.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before proposing a change. Release history is maintained in [CHANGELOG.md](./CHANGELOG.md).
