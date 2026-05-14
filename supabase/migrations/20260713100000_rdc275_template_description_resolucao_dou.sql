-- Texto descritivo do catálogo RDC-275: referência da resolução e republicação no D.O.U.
update public.checklist_templates
set
  description = $rdc275desc$
Lista de Verificação das Boas Práticas de Fabricação (Anexo II) — estabelecimentos produtores/industrializadores de alimentos.

Resolução - RDC nº 275, de 21 de outubro de 2002(*)
Republicada no D.O.U de 06/11/2002
$rdc275desc$,
  updated_at = now()
where id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d00'::uuid;
