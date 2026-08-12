// French catalog for the app's own business strings — resource/page labels,
// column headers, form fields, action labels, status labels, and hook-thrown
// error messages that surface as toasts. Registered under the 'app'
// namespace (see src/index.ts). Key convention:
//   app:<resourceSlug>.label / .pluralLabel
//   app:<resourceSlug>.fields.<field>          // shared form-label + column-header text
//   app:<resourceSlug>.columns.<field>         // table-only computed/virtual columns
//   app:<resourceSlug>.form.<field>.helperText / .placeholder
//   app:<resourceSlug>.status.<value>          // STATUS_LABELS maps
//   app:<resourceSlug>.actions.<actionName>.label / .modalHeading / .modalDescription
//   app:<resourceSlug>.errors.<shortReason>    // hook-thrown Error messages
//   app:pages.<pageSlug>.label / .title / .subtitle
// Mirror every key here in appEn.ts — a key present in one and missing in
// the other silently falls back to the raw key on that locale.
export const appFr: Record<string, string> = {
	// --- common (shared field labels reused across resources) ---
	'common.active': 'Actif',
	'common.createdAt': 'Créé le',
	'common.updatedAt': 'Mis à jour',
	'common.note': 'Note',
	'common.date': 'Date',
	'common.agent': 'Agent',
	'common.group': 'Groupe',
	'common.amountAED': 'Montant (AED)',

	// --- users (Collaborateurs) ---
	'users.label': 'Collaborateur',
	'users.pluralLabel': 'Collaborateurs',
	'users.form.profileMediaImage.label': 'Photo de profil',
	'users.fields.firstname': 'Prénom',
	'users.fields.lastname': 'Nom',
	'users.fields.email': 'E-mail',
	'users.fields.phone': 'Téléphone',
	'users.form.phone.placeholder': 'Entrez le numéro de téléphone...',
	'users.fields.role': 'Rôle',
	'users.columns.photo': 'Photo',
	'users.columns.netGenerated': 'Net généré (AED)',
	'users.columns.passwordStatus': 'Mot de passe',
	'users.columns.passwordSetupLink': 'Lien de configuration',
	'users.status.configured': 'Configuré',
	'users.status.linkSent': 'Lien envoyé (en attente)',
	'users.status.toConfigure': 'À configurer',
	'users.widgets.totalUsers': 'Total Utilisateurs',
	'users.widgets.activeAgents': 'Collaborateurs Actifs',
	'users.actions.generatePasswordLink.label': 'Lien de configuration du mot de passe',
	'users.actions.generatePasswordLink.modalHeading': 'Générer un lien de configuration du mot de passe ?',
	'users.actions.generatePasswordLink.modalDescription':
		"Le mot de passe actuel (s'il existe) sera immédiatement invalidé. Le collaborateur ne pourra plus se connecter tant qu'il n'aura pas suivi ce lien pour en choisir un nouveau — à toi de le lui partager (WhatsApp, SMS, en personne).",
	'users.actions.generatePasswordLink.successMessage':
		'Lien généré (valable {hours}h) — visible et copiable dans la colonne « Lien de configuration » ci-dessous, à partager toi-même avec {firstname}.',
	'users.errors.noneSelected': 'Aucun collaborateur sélectionné.',
	'users.errors.notFound': 'Collaborateur introuvable.',
	'users.errors.adminOnly': 'Seul SuperAdmin peut gérer les collaborateurs.',

	// --- settings (Paramètres — embedded in ParametresPage) ---
	'settings.recordTitle': 'Configuration',
	'settings.section.security': 'Sécurité',
	'settings.fields.sessionTimeoutMinutes': 'Timeout de session (minutes)',
	'settings.form.sessionTimeoutMinutes.helperText': "Déconnexion automatique après cette durée d'inactivité.",
	'settings.columns.timeout': 'Timeout (min)',

	// --- exchangeRates (Taux de Change) ---
	'exchangeRates.label': 'Taux de Change',
	'exchangeRates.pluralLabel': 'Taux de Change',
	'exchangeRates.currency.GNF': 'GNF — Franc Guinéen',
	'exchangeRates.currency.USD': 'USD — Dollar Américain',
	'exchangeRates.currency.AED': 'AED — Dirham des Émirats Arabes Unis',
	'exchangeRates.fields.code': 'Devise',
	'exchangeRates.fields.label': 'Libellé',
	'exchangeRates.fields.rateToGNF': 'Taux (1 unité = X GNF)',
	'exchangeRates.form.rateToGNF.helperText':
		"GNF est la devise pivot : son taux reste fixé à 1. AED est indexé sur l'USD (parité officielle fixe, 3,6725 AED pour 1 USD) : son taux se recalcule automatiquement — modifie plutôt le taux USD, qui lui varie souvent.",
	'exchangeRates.columns.code': 'Code',
	'exchangeRates.columns.rateToGNF': 'Taux vers GNF',
	'exchangeRates.errors.adminLikeOnly': 'Seuls SuperAdmin et adminGN peuvent gérer les taux de change.',
	'exchangeRates.errors.cannotDeleteCore': 'Le Dollar (USD) et le Dirham (AED) sont utilisés dans tout le système et ne peuvent pas être supprimés.',

	// --- cards (Cartes) ---
	'cards.label': 'Carte',
	'cards.pluralLabel': 'Cartes',
	'cards.fields.identifier': 'Identifiant de la carte',
	'cards.columns.identifier': 'Identifiant',

	// --- cardGroups (Groupes de Cartes) ---
	'cardGroups.label': 'Groupe de Cartes',
	'cardGroups.pluralLabel': 'Groupes de Cartes',
	'cardGroups.fields.name': 'Nom du groupe',
	'cardGroups.fields.assignedAgent': 'Agent assigné',
	'cardGroups.form.agent.helperText':
		'Utilisé pour assigner automatiquement les shifts lors de la création des cycles de retrait.',
	'cardGroups.columns.name': 'Nom',
	'cardGroups.columns.cardCount': 'Nb. cartes',

	// --- withdrawalCycles (Cycles de Retrait) ---
	'withdrawalCycles.label': 'Cycle de Retrait',
	'withdrawalCycles.pluralLabel': 'Cycles de Retrait',
	'withdrawalCycles.recordTitle': 'Cycle #{id} — {group}',
	'withdrawalCycles.fields.sentGNF': 'Envoyé (GNF)',
	'withdrawalCycles.fields.expectedAED': 'Attendu (AED)',
	'withdrawalCycles.columns.sentGNF': 'Envoyé',
	'withdrawalCycles.columns.expectedAED': 'Attendu',
	'withdrawalCycles.errors.createAdminLikeOnly': 'Seuls SuperAdmin et adminGN peuvent créer un cycle de retrait.',
	'withdrawalCycles.errors.updateAdminLikeOnly': 'Seuls SuperAdmin et adminGN peuvent modifier un cycle de retrait.',
	'withdrawalCycles.errors.noAgentAssigned':
		"Ce groupe n'a pas d'agent assigné — assigne-lui un agent avant de créer un cycle.",
	'withdrawalCycles.errors.exceedsExpected':
		"Le total retiré + débits à tort ({projected} AED) dépasserait l'Attendu du cycle ({expected} AED).",

	// --- cards errors ---
	'cards.errors.duplicateIdentifier': 'Ce numéro de carte est déjà utilisé par une autre carte.',
	'cards.errors.adminLikeOnly': 'Seuls SuperAdmin et adminGN peuvent gérer les cartes.',

	// --- cardGroups errors ---
	'cardGroups.errors.adminLikeOnly': 'Seuls SuperAdmin et adminGN peuvent gérer les groupes de cartes.',

	// --- exchangeRates errors ---
	'exchangeRates.errors.cannotDeleteBase': 'La devise de base (GNF) ne peut pas être supprimée.',

	// --- shifts (Suivi des Shifts) ---
	'shifts.label': 'Shift',
	'shifts.pluralLabel': 'Suivi des Shifts',
	'shifts.fields.agent': 'Agent (Dubaï)',
	'shifts.fields.shiftNumber': 'Shift (1 ou 2)',
	'shifts.fields.withdrawnAED': 'Montant retiré (AED)',
	'shifts.columns.cycle': 'Cycle',
	'shifts.columns.shift': 'Shift',
	'shifts.shiftBadge': 'Shift {n}',
	'shifts.columns.withdrawn': 'Retiré',
	'shifts.columns.wrongfulDebit': 'Débit à tort',
	'shifts.columns.treasury': 'Trésorerie',
	'shifts.filters.period': 'Mois / période',
	'shifts.widgets.treasuryTotal': 'Trésorerie Disponible',
	'shifts.widgets.treasuryByAgent': 'Trésorerie par Agent',
	'shifts.widgets.activeGroups': 'Groupes Actifs',
	'shifts.errors.autoCreatedOnly': 'Les shifts sont créés automatiquement avec leur cycle de retrait.',
	'shifts.errors.notFound': 'Shift introuvable.',
	'shifts.errors.notOwnShift': 'Vous ne pouvez modifier que vos propres shifts.',

	// --- wrongfulDebits (Débits à Tort) ---
	'wrongfulDebits.label': 'Débit à Tort',
	'wrongfulDebits.pluralLabel': 'Débits à Tort',
	'wrongfulDebits.fields.shift': 'Shift',
	'wrongfulDebits.fields.card': 'Carte',
	'wrongfulDebits.fields.amountAED': 'Montant débité à tort (AED)',
	'wrongfulDebits.fields.details': 'Détails',
	'wrongfulDebits.form.note.placeholder': 'Circonstances, ticket ATM, etc.',
	'wrongfulDebits.columns.card': 'Carte',
	'wrongfulDebits.columns.amount': 'Montant',
	'wrongfulDebits.columns.status': 'Statut',
	'wrongfulDebits.status.reported': 'Signalé',
	'wrongfulDebits.status.refundRequested': 'Demande envoyée',
	'wrongfulDebits.status.refunded': 'Remboursé',
	'wrongfulDebits.status.refused': 'Refusé',
	'wrongfulDebits.widgets.total': 'Débits à Tort (en attente)',
	'wrongfulDebits.actions.requestRefund.label': 'Demande envoyée à la banque',
	'wrongfulDebits.actions.requestRefund.modalHeading': 'Marquer la demande de remboursement comme envoyée ?',
	'wrongfulDebits.actions.requestRefund.successMessage': 'Demande de remboursement enregistrée.',
	'wrongfulDebits.actions.markRefunded.label': 'Marquer comme remboursé',
	'wrongfulDebits.actions.markRefunded.modalHeading': 'Confirmer le remboursement ?',
	'wrongfulDebits.actions.markRefunded.modalDescription': 'Ce montant ne comptera plus contre la trésorerie disponible.',
	'wrongfulDebits.actions.markRefunded.successMessage': 'Remboursement confirmé.',
	'wrongfulDebits.actions.markRefused.label': 'Marquer comme refusé',
	'wrongfulDebits.actions.markRefused.modalHeading': 'Marquer ce remboursement comme refusé par la banque ?',
	'wrongfulDebits.actions.markRefused.modalDescription':
		'Ce montant restera compté comme une perte contre la trésorerie disponible.',
	'wrongfulDebits.actions.markRefused.successMessage': 'Refus de la banque enregistré.',
	'wrongfulDebits.errors.notFound': 'Débit à tort introuvable.',
	'wrongfulDebits.errors.refundAlreadyRequested': 'Une demande de remboursement a déjà été envoyée pour ce débit.',
	'wrongfulDebits.errors.alreadyResolved': 'Ce débit a déjà été traité (remboursé ou refusé).',
	'wrongfulDebits.errors.notOwnShift': "Vous ne pouvez signaler un débit à tort que sur l'un de vos propres shifts.",
	'wrongfulDebits.errors.cardNotFound': 'Carte introuvable.',
	'wrongfulDebits.errors.cardWrongGroup': "Cette carte n'appartient pas au groupe de ce shift.",
	'wrongfulDebits.errors.updateAdminLikeOnly':
		'Un débit à tort déjà enregistré ne peut être modifié que par SuperAdmin ou adminGN.',

	// --- treasuryDeposits (Apports de Trésorerie) ---
	'treasuryDeposits.label': 'Apport de Trésorerie',
	'treasuryDeposits.pluralLabel': 'Apports de Trésorerie',
	'treasuryDeposits.fields.channel': 'Canal',
	'treasuryDeposits.fields.reference': 'Référence',
	'treasuryDeposits.fields.date': 'Date',
	'treasuryDeposits.fields.createdBy': 'Ajouté par',
	'treasuryDeposits.channel.bankTransfer': 'Virement bancaire',
	'treasuryDeposits.channel.other': 'Autre',
	'treasuryDeposits.errors.createSuperAdminOnly': "Seul SuperAdmin peut enregistrer un apport de trésorerie.",
	'treasuryDeposits.errors.updateSuperAdminOnly': "Seul SuperAdmin peut modifier un apport de trésorerie.",

	// --- pages ---
	'pages.parametres.label': 'Paramètres',
	'pages.parametres.security.title': 'Sécurité',
	'pages.parametres.security.subtitle': 'Timeout de session avant déconnexion automatique.',
	'pages.dashboard.label': 'Tableau de bord',
	'pages.dashboard.shifts.title': 'Suivi des Shifts',
	'pages.dashboard.shifts.subtitleTeam': 'Tous les groupes et agents',
	'pages.dashboard.shifts.subtitleSelf': 'Mes shifts',
	'pages.dashboard.wrongfulDebits.title': 'Débits à Tort — détail',
	'pages.system': 'Système',
	'pages.operations': 'Opérations',

	// --- clientPayments (Paiements Clients) ---
	'clientPayments.label': 'Paiement Client',
	'clientPayments.pluralLabel': 'Paiements Clients',
	'clientPayments.fields.senderName': "Nom de l'expéditeur",
	'clientPayments.fields.clientName': 'Nom du destinataire',
	'clientPayments.fields.recipientPhone': 'Téléphone du destinataire',
	'clientPayments.columns.code': 'Code',
	'clientPayments.columns.sender': 'Expéditeur',
	'clientPayments.columns.recipientPhone': 'Téléphone destinataire',
	'clientPayments.columns.status': 'Statut',
	'clientPayments.status.pending': 'En attente',
	'clientPayments.status.validated': 'Validé',
	'clientPayments.status.refused': 'Refusé',
	'clientPayments.status.cancelled': 'Annulé',
	'clientPayments.widgets.total': 'Total Payé aux Clients',
	'clientPayments.actions.validatePayment.label': 'Valider le paiement',
	'clientPayments.actions.validatePayment.modalHeading': 'Valider ce paiement ?',
	'clientPayments.actions.validatePayment.modalDescription': 'Ce montant sera débité de la trésorerie disponible.',
	'clientPayments.actions.validatePayment.successMessage': 'Paiement validé.',
	'clientPayments.actions.refusePayment.label': 'Refuser le paiement',
	'clientPayments.actions.refusePayment.modalHeading': 'Refuser ce paiement ?',
	'clientPayments.actions.refusePayment.successMessage': 'Paiement refusé.',
	'clientPayments.actions.cancelPayment.label': 'Annuler le paiement',
	'clientPayments.actions.cancelPayment.modalHeading': 'Annuler ce paiement ?',
	'clientPayments.actions.cancelPayment.modalDescription':
		'Un paiement validé annulé ne comptera plus contre la trésorerie disponible.',
	'clientPayments.actions.cancelPayment.successMessage': 'Paiement annulé.',
	'clientPayments.actions.downloadReceipt.label': 'Télécharger le reçu',
	'clientPayments.errors.notFound': 'Paiement introuvable.',
	'clientPayments.errors.notPending': "Ce paiement n'est plus en attente.",
	'clientPayments.errors.cancelPendingAdminLikeOnly':
		'Seuls SuperAdmin et adminGN peuvent annuler un paiement en attente.',
	'clientPayments.errors.cancelValidatedAdminOnly': 'Seul SuperAdmin peut annuler un paiement déjà validé.',
	'clientPayments.errors.updateTerminal': 'Ce paiement a déjà été traité (refusé ou annulé).',
	'clientPayments.errors.createAdminLikeOnly': 'Seuls SuperAdmin et adminGN peuvent initier un paiement client.',
	'clientPayments.errors.updatePendingAdminLikeOnly':
		'Seuls SuperAdmin et adminGN peuvent modifier un paiement en attente.',
	'clientPayments.errors.updateValidatedAdminOnly': 'Seul SuperAdmin peut modifier un paiement déjà validé.',
	'clientPayments.errors.receiptForbidden': "Vous n'avez pas accès à ce reçu.",
	'clientPayments.receipt.title': 'Reçu de paiement',
	'clientPayments.receipt.sender': 'Expéditeur',
	'clientPayments.receipt.recipient': 'Destinataire',
	'clientPayments.receipt.recipientPhone': 'Téléphone du destinataire',
	'clientPayments.receipt.status': 'Statut',
	'clientPayments.receipt.date': 'Date',
	'clientPayments.receipt.qrCaption': 'SCAN & SMILE #Env',
	'clientPayments.receipt.footer': 'Enviar, EASILY YOURS',
	'clientPayments.converter.title': 'Convertisseur rapide',
	'clientPayments.converter.currency': 'Devise reçue',
	'clientPayments.converter.amount': 'Montant reçu',
	'clientPayments.converter.result': 'Équivalent AED',
	'clientPayments.converter.insert': 'Insérer le montant',
	'clientPayments.converter.loading': 'Chargement des taux…',
	'clientPayments.converter.unavailable': 'Taux de change indisponible.',
};
