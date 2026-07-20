import type { CSSProperties } from 'react';
import { usePage } from '@maxal_studio/kratosjs-react/views';

/**
 * Default landing page, server-rendered by KratosJs Views.
 * Registered in src/index.ts via `panel.route('get', '/', ...)`. Replace it with
 * your own marketing / app pages — this is just proof that SSR works out of the box.
 *
 * The page title/description come from the server route's props and are rendered by
 * the shared `<Head>` in src/views/Layout.tsx — no per-page <Head> needed here.
 */
export default function Home() {
	const { props } = usePage<{ title: string; adminUrl: string; renderedAt: string }>();

	return (
		<div style={styles.page}>
			<main style={styles.card}>
				<div style={styles.badge}>K</div>
				<h1 style={styles.title}>{props.title}</h1>
				<p style={styles.tagline}>
					A full-stack KratosJs app: a server-rendered front end and an admin panel, from one backend.
				</p>

				<p style={styles.proof}>
					⚡ This page was server-rendered at <strong>{props.renderedAt}</strong>
				</p>

				<div style={styles.actions}>
					<a style={{ ...styles.button, ...styles.primary }} href={props.adminUrl}>
						Open the Admin Panel →
					</a>
					<a
						style={{ ...styles.button, ...styles.secondary }}
						href="https://github.com/maxal-studio/kratosjs">
						Documentation
					</a>
				</div>

				<p style={styles.hint}>
					Edit <code style={styles.code}>src/views/pages/Home.tsx</code> and add routes with{' '}
					<code style={styles.code}>panel.route()</code>.
				</p>
			</main>

			<footer style={styles.footer}>Powered by KratosJs</footer>
		</div>
	);
}

const styles: Record<string, CSSProperties> = {
	page: {
		minHeight: '100vh',
		margin: 0,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '1.5rem',
		fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
		color: '#e5e7eb',
		background: 'radial-gradient(1200px 600px at 50% -10%, #1e293b 0%, #0b1120 60%)',
		padding: '2rem',
		boxSizing: 'border-box',
	},
	card: {
		width: '100%',
		maxWidth: 560,
		textAlign: 'center',
		background: 'rgba(255,255,255,0.03)',
		border: '1px solid rgba(255,255,255,0.08)',
		borderRadius: 20,
		padding: '3rem 2rem',
		boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
	},
	badge: {
		width: 64,
		height: 64,
		margin: '0 auto 1.25rem',
		borderRadius: 16,
		display: 'grid',
		placeItems: 'center',
		fontSize: 32,
		fontWeight: 800,
		color: '#0b1120',
		background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
	},
	title: { fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#f8fafc' },
	tagline: { fontSize: '1.05rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 auto 1.5rem', maxWidth: 440 },
	proof: {
		display: 'inline-block',
		fontSize: '0.85rem',
		color: '#7dd3fc',
		background: 'rgba(56,189,248,0.08)',
		border: '1px solid rgba(56,189,248,0.2)',
		borderRadius: 999,
		padding: '0.4rem 0.9rem',
		margin: '0 0 1.75rem',
	},
	actions: { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' },
	button: {
		display: 'inline-block',
		padding: '0.7rem 1.25rem',
		borderRadius: 12,
		fontWeight: 600,
		fontSize: '0.95rem',
		textDecoration: 'none',
	},
	primary: { color: '#0b1120', background: 'linear-gradient(135deg, #38bdf8, #818cf8)' },
	secondary: { color: '#e5e7eb', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' },
	hint: { marginTop: '1.75rem', fontSize: '0.85rem', color: '#64748b' },
	code: { background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '0.1rem 0.4rem', fontSize: '0.85em' },
	footer: { fontSize: '0.8rem', color: '#475569' },
};
