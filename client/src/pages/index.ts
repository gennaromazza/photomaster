// Re-export dei componenti principali
export { default as Dashboard } from './dashboard';
export { default as AuthPage } from './auth-page';
export { default as NotFound } from './not-found';
export { default as ForgotPasswordPage } from './forgot-password';
export { default as ResetPasswordPage } from './reset-password';

// Settings
export { default as SettingsPage } from './settings/index';
export { default as CategoriesPage } from './settings/categories';
export { default as OriginsPage } from './settings/origins';

// Clients
export { default as ClientsPage } from './clients/index';
export { default as NewClientPage } from './clients/new';

// Events
export { default as EventsPage } from './events/index';
export { default as NewEventPage } from './events/new';
export { default as EventDetailPage } from './events/[id]';

// Tasks
export { default as TasksPage } from './tasks/index';

// Collaborators
export { default as CollaboratorsPage } from './collaborators/index';
export { default as NewCollaboratorPage } from './collaborators/new';
export { default as CollaboratorDetailPage } from './collaborators/[id]';

// Contracts
export { default as ContractsPage } from './contracts/index';
export { default as ContractViewPage } from './contracts/view';

// Quotes
export { default as QuotesPage } from './quotes/index';