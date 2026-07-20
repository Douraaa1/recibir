import type { ReactNode } from 'react';
import { Head, usePage } from '@maxal_studio/kratosjs-react/views';

/**
 * The default layout wrapping every view page. Passed as `layout` in the two view
 * entry files. This is the single `<Head>` for the site, so there are no tag-merge
 * surprises: per-page `title`/`description` come from the server route's props (with
 * the defaults below as fallbacks); `keywords` and the favicon are site-wide defaults.
 *
 * Add your top nav and footer here to have them on every page.
 */
const SITE = {
	title: 'RECIBIR',
	description: 'Built with KratosJs — a full-stack TypeScript framework.',
	keywords: 'kratosjs, typescript, react, ssr, admin',
	favicon: '/assets/icon.png',
};

export default function Layout({ children }: { children: ReactNode }) {
	const { props } = usePage<{ title?: string; description?: string }>();
	return (
		<>
			<Head>
				<title>{props.title ?? SITE.title}</title>
				<meta name="description" content={props.description ?? SITE.description} />
				<meta name="keywords" content={SITE.keywords} />
				<link rel="icon" href={SITE.favicon} />
			</Head>

			{/* <header><nav>…your top menu…</nav></header> */}
			{children}
			{/* <footer>…your footer…</footer> */}
		</>
	);
}
