-- Novos tipos de evento para limites, assentos e billing.
-- Plano: docs/plano-limites-tenant-e-billing.md §4.3
--
-- `subscription_events` é imutável (sem UPDATE/DELETE, nem para super_admin), por
-- isso a única forma de acrescentar tipos é recriar o CHECK.

alter table public.subscription_events
  drop constraint if exists subscription_events_event_type_check;

alter table public.subscription_events
  add constraint subscription_events_event_type_check check (
    event_type in (
      -- já existentes
      'plan_changed', 'suspended', 'unsuspended',
      'payment_received', 'trial_started', 'trial_expired',
      'feature_override_set', 'tenant_created', 'tenant_blocked_lgpd',
      'tenant_unblocked_lgpd', 'account_deleted',
      -- limites (§6) e retenção (§10)
      'limits_changed', 'team_members_toggled', 'record_restored',
      -- documento fiscal do tenant (§7)
      'tenant_document_set',
      -- assentos e billing (§8)
      'seats_changed', 'checkout_completed', 'subscription_updated',
      'subscription_canceled', 'payment_failed'
    )
  );
