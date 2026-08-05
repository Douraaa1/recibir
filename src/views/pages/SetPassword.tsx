import { useState, type CSSProperties } from 'react';
import { usePage, useForm } from '@maxal_studio/kratosjs-react/views';

/**
 * Public first-login / password-reset page. Reached only via a one-time link
 * SuperAdmin generates and shares out of band (see src/actions/userActions.ts).
 * Registered in src/routes/passwordSetup.ts.
 */
export default function SetPassword() {
	const { props } = usePage<{ token: string; valid: boolean; firstname?: string; done?: boolean }>();
	const form = useForm({ token: props.token, password: '' });
	const [confirm, setConfirm] = useState('');
	const [confirmError, setConfirmError] = useState<string | null>(null);

	if (!props.valid) {
		return (
			<div style={styles.page}>
				<main style={styles.card}>
					<h1 style={styles.title}>Lien invalide</h1>
					<p style={styles.text}>Ce lien de configuration est invalide ou a expiré. Demande à SuperAdmin de t’en générer un nouveau.</p>
				</main>
			</div>
		);
	}

	if (props.done) {
		return (
			<div style={styles.page}>
				<main style={styles.card}>
					<h1 style={styles.title}>Mot de passe configuré</h1>
					<p style={styles.text}>Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
					<a style={styles.button} href="/admin">
						Se connecter →
					</a>
				</main>
			</div>
		);
	}

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		setConfirmError(null);
		if (form.data.password.length < 8) {
			form.setError('password', 'Le mot de passe doit contenir au moins 8 caractères.');
			return;
		}
		if (form.data.password !== confirm) {
			setConfirmError('Les mots de passe ne correspondent pas.');
			return;
		}
		void form.post('/set-password');
	};

	return (
		<div style={styles.page}>
			<main style={styles.card}>
				<h1 style={styles.title}>{props.firstname ? `Bienvenue, ${props.firstname}` : 'Configure ton mot de passe'}</h1>
				<p style={styles.text}>Choisis le mot de passe que tu utiliseras pour te connecter à RECIBIR.</p>

				<form onSubmit={submit} style={styles.form}>
					<label style={styles.label}>
						Mot de passe
						<input
							type="password"
							style={styles.input}
							value={form.data.password}
							onChange={e => form.setData('password', e.target.value)}
							minLength={8}
							required
							autoFocus
						/>
					</label>
					{form.errors.password && <p style={styles.error}>{form.errors.password}</p>}

					<label style={styles.label}>
						Confirmer le mot de passe
						<input
							type="password"
							style={styles.input}
							value={confirm}
							onChange={e => setConfirm(e.target.value)}
							minLength={8}
							required
						/>
					</label>
					{confirmError && <p style={styles.error}>{confirmError}</p>}

					<button type="submit" style={styles.button} disabled={form.processing}>
						{form.processing ? 'Enregistrement...' : 'Valider mon mot de passe'}
					</button>
				</form>
			</main>
		</div>
	);
}

const styles: Record<string, CSSProperties> = {
	page: {
		minHeight: '100vh',
		margin: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
		background: 'radial-gradient(1200px 600px at 50% -10%, #eef2ff 0%, #f8fafc 60%)',
		padding: '2rem',
		boxSizing: 'border-box',
	},
	card: {
		width: '100%',
		maxWidth: 420,
		background: '#fff',
		border: '1px solid #e5e7eb',
		borderRadius: 20,
		padding: '2.5rem 2rem',
		boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
	},
	title: { fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' },
	text: { fontSize: '0.95rem', lineHeight: 1.5, color: '#475569', margin: '0 0 1.5rem' },
	form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
	label: { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' },
	input: {
		fontSize: '1rem',
		padding: '0.65rem 0.85rem',
		borderRadius: 10,
		border: '1px solid #cbd5e1',
		outline: 'none',
	},
	error: { margin: '-0.5rem 0 0', fontSize: '0.85rem', color: '#dc2626' },
	button: {
		display: 'inline-block',
		textAlign: 'center',
		marginTop: '0.5rem',
		padding: '0.75rem 1.25rem',
		borderRadius: 10,
		fontWeight: 600,
		fontSize: '0.95rem',
		color: '#fff',
		background: '#2563eb',
		border: 'none',
		cursor: 'pointer',
		textDecoration: 'none',
	},
};
