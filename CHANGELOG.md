# Changelog

All notable changes to DriveCam are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project README with local development, OAuth, deployment, and security guidance.
- Contributor workflow and validation checklist.

### Changed

- Expanded the interface into dedicated phone, tablet, laptop, and short-landscape layouts.
- Added safe-area support, responsive navigation, adaptive content grids, and reduced-motion handling.

### Fixed

- Isolated development and production Next.js output directories to prevent stale React Client Manifest errors.
- Added explicit `dev`, `build`, and `start` commands for predictable local workflows.
- Suppressed hydration noise caused by browser extensions that inject attributes into the document body.
- Documented how to recover when a browser tab outlives its development HMR server.

## [1.0.0] - 2026-08-17

### Added

- Mobile-first DriveCam interface with onboarding, camera, file browser, and settings screens.
- Supabase Google OAuth authentication using profile and Google Drive scopes.
- Authenticated Google Drive API client for listing folders and images.
- Direct image upload to a configurable Drive folder.
- Folder creation, renaming, moving, and trashing.
- Image moving and trashing.
- Camera preview using `getUserMedia` with a desktop-safe fallback scene.
- Capture controls for flash state, timer, grid, aspect ratio, zoom, and camera switching.
- Approve-or-retake capture review and optional instant-save mode.
- Browser-persisted capture preferences and session-scoped Google provider tokens.
- Responsive desktop phone frame and full-screen mobile layout.

### Security

- Added Git ignore rules for local environment files.
- Kept Supabase service-role and Google OAuth client secrets out of browser code.
- Used Drive trash operations instead of irreversible file deletion.
- Added automatic sign-out cleanup for the session-scoped Google provider token.

[Unreleased]: https://github.com/calebjubal/drive-directory-saver/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/calebjubal/drive-directory-saver/releases/tag/v1.0.0
