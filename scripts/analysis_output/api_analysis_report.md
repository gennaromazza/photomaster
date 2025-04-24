# Studio Master API Analysis

## Statistics

- Total endpoints: 66
- Backend defined: 22
- Frontend used: 57
- Translation mappings: 11

## Inconsistencies

### Unused Endpoints

Endpoints defined in the backend but not used in the frontend:

| Endpoint | Defined In |
|----------|------------|
| `/api/auth/google` | server/auth.ts |
| `/api/auth/google/callback` | server/auth.ts |
| `/api/users/{id}` | server/auth.ts |
| `/api/users/{id}/password` | server/auth.ts |
| `/api/users/{id}/approve` | server/auth.ts |
| `/api/users/{id}/disable` | server/auth.ts |
| `/api/users` | server/auth.ts |
| `/api/users/pending` | server/auth.ts |
| `/api/google/callback` | server/routes.ts |

### Undefined Endpoints

Endpoints used in the frontend but not defined in the backend:

| Endpoint | Used In |
|----------|--------|
| `/api/notifications` | client/src/components/layout/notifications.tsx |
| `/api/notifications/read-all` | client/src/components/layout/notifications.tsx |
| `/api/settings` | client/src/components/layout/header.tsx |
| `/api/tasks/uncompleted` | client/src/components/dashboard/task-section.tsx |
| `/api/collaborators` | client/src/components/dashboard/team-section.tsx |
| `/api/events` | client/src/components/dashboard/events-section.tsx |
| `/api/contracts` | client/src/components/dashboard/contracts-section.tsx |
| `/api/quotes` | client/src/components/dashboard/quotes-status-detail.tsx |
| `/api/service-categories` | client/src/components/dashboard/event-categories-chart.tsx |
| `/api/tasks` | client/src/components/events/event-tasks.tsx |
| `/api/collaborators/available` | client/src/components/events/collaborators-card.tsx |
| `/api/clients` | client/src/components/events/event-info.tsx |
| `/api/services` | client/src/components/services/service-items-manager.tsx |
| `/api/service-items` | client/src/components/services/service-items-manager.tsx |
| `/api/service-bundles` | client/src/components/quotes/fixed-module.tsx |
| `/api/products` | client/src/components/quotes/modules/fixed-module-editor.tsx |
| `/api/google/status` | client/src/components/settings/google-calendar-integration.tsx |
| `/api/google/sync-all` | client/src/components/settings/google-calendar-integration.tsx |
| `/api/google/import` | client/src/components/settings/google-calendar-integration.tsx |
| `/api/google/auth` | client/src/components/settings/google-calendar-integration.tsx |
| `/api/gallery/galleries` | client/src/components/galleries/gallery-card.tsx |
| `/api/gallery/cleanup` | client/src/components/galleries/gallery-cleanup.tsx |
| `/api/selection/sessions` | client/src/components/selection-system/admin/SelectionsDashboard.tsx |
| `/api/selection/photo` | client/src/components/selection-system/client/CommentSystem.tsx |
| `/api/selection/comments` | client/src/components/selection-system/client/CommentSystem.tsx |
| `/api/selection/sessions/key` | client/src/components/selection-system/shared/PhotoSelector.tsx |
| `/api/events/senza-collaboratori` | client/src/components/collaboratori/eventi-disponibili-list.tsx |
| `/api/collaboratori/sincronizza-assegnazioni` | client/src/components/collaboratori/collaboratori-list.tsx |
| `/api/clauses` | client/src/hooks/use-clauses.ts |
| `/api/event-types` | client/src/hooks/use-clauses.ts |
| `/api/service-categories/active` | client/src/pages/events/new.tsx |
| `/api/tasks/event` | client/src/pages/tasks/new.tsx |
| `/api/lead-sources` | client/src/pages/quotes/new-redesign.tsx |
| `/api/clauses/quote` | client/src/pages/quotes/new.tsx |
| `/api/quotes/share` | client/src/pages/quotes/public/[token].tsx |
| `/api/quotes/modules` | client/src/pages/quotes/public/[token].tsx |
| `/api/settings/email-usage` | client/src/pages/settings/resource-limits.tsx |
| `/api/settings/storage-usage` | client/src/pages/settings/resource-limits.tsx |
| `/api/service-bundle-items` | client/src/pages/bundles/index.tsx |
| `/api/bundle-leads` | client/src/pages/bundles/detail/[id].tsx |
| `/api/finance/stats` | client/src/pages/dashboard/finances.tsx |
| `/api/finance/transactions` | client/src/pages/dashboard/finances.tsx |
| `/api/finance/scheduled-payments` | client/src/pages/dashboard/finances/index.tsx |
| `/api/gallery/chapters` | client/src/pages/galleries/[id]/chapters/new.tsx |

### Italian-English Conflicts

Endpoints with both Italian and English versions defined in the backend:

*No Italian-English conflicts found*

## Translation Mappings

| Italian Endpoint | English Endpoint |
|-----------------|------------------|
| `/api/collaboratori` | `/api/collaborators` |
| `/api/collaboratori/` | `/api/collaborators/` |
| `/api/collaboratori/{id}/eventi` | `/api/collaborators/{id}/events` |
| `/api/collaboratori/{id}/pagamenti` | `/api/collaborators/{id}/payments` |
| `/api/collaboratori/{id}/montaggi` | `/api/collaborators/{id}/editing` |
| `/api/collaboratori/{id}/dashboard` | `/api/collaborators/{id}/dashboard` |
| `/api/eventi` | `/api/events` |
| `/api/eventi/` | `/api/events/` |
| `/api/eventi/senza-collaboratori` | `/api/events/without-collaborators` |
| `/api/pagamenti` | `/api/payments` |
| `/api/pagamenti/` | `/api/payments/` |
