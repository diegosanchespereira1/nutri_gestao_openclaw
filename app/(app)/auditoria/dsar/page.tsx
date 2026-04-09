import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/layout/page-header';
import { PageLayout } from '@/components/layout/page-layout';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { DsarForm } from '@/components/auditoria/dsar-form';

export const metadata = {
  title: 'Relatório DSAR | NutriGestão',
};

export default async function DsarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Carregar lista de pacientes do utilizador
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  if (error || !patients) {
    return (
      <PageLayout>
        <PageHeader
          title="Relatório DSAR"
          description="Gerar relatório de acesso a dados de paciente"
          back={{ href: '/auditoria', label: 'Auditoria' }}
        />
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum paciente encontrado.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Relatório DSAR"
        description="Data Subject Access Request — Gere um relatório de quem acedeu aos dados de um paciente específico. Necessário para cumprir direitos LGPD Art. 18."
        back={{ href: '/auditoria', label: 'Auditoria' }}
      />

      <div className="border-border space-y-4 rounded-lg border bg-blue-50 p-4">
        <h2 className="text-sm font-semibold text-blue-900">
          O que é um Relatório DSAR?
        </h2>
        <p className="text-sm text-blue-800">
          Quando um paciente (ou responsável legal) solicita saber <strong>quem</strong> acedeu
          aos seus dados pessoais, quando acedeu e o quê fez, o profissional tem obrigação
          legal de fornecer este relatório (LGPD Art. 18). Escolha um paciente abaixo para gerar
          o relatório.
        </p>
      </div>

      <DsarForm patients={patients} />
    </PageLayout>
  );
}
