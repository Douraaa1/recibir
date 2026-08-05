// Shared with src/index.ts (server startup logging) and src/actions/userActions.ts
// (building absolute password-setup links) so the derivation lives in one place.
export function getPublicUrl(): string {
	const port = parseInt(process.env.PORT || '3000');
	// Render sets RENDER_EXTERNAL_URL automatically; PUBLIC_URL is the manual
	// override (e.g. behind a custom domain). Falls back to localhost in dev.
	return process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
}
