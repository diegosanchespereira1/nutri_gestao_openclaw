# Resumo dos Épicos — NutriGestão

## Epic 1: Auth, Perfil e Setup ✅ DONE
Stories 1.1-1.9 concluídas. Inclui: scaffold Next.js/Supabase, shadcn/ui tema teal, shell logado com sidebar, login/registro, sessão/logout, recuperação de acesso, perfil com CRN, 2FA.

## Epic 2: Cadastro Operacional, Onboarding e Importação 🔄 IN-PROGRESS
FRs: FR6–FR11, FR55, FR56
- 2.1 ✅ Modelo e CRUD de clientes PF/PJ
- 2.2 ✅ Estabelecimentos por cliente PJ e tipo
- 2.3 ✅ Pacientes — vínculos com estabelecimento/PF
- 2.4 ✅ Perfil nutricional e formulários de avaliação
- 2.5 ✅ Histórico consolidado multi-estabelecimento
- **2.6 📋 Importação CSV/Excel com mapeamento e erros (FR11)**
- **2.7 📋 Wizard de onboarding + sugestão de portarias (FR55, FR56)**

## Epic 3: Checklists Regulatórios
FRs: FR12, FR13, FR14
- 3.1 Catálogo de checklists por portaria (campos obrigatórios)
- 3.2 Preenchimento e validação de obrigatórios
- 3.3 Checklists customizados pelo profissional

## Epic 4: Visitas Técnicas, Dossiê, PDF e Email
FRs: FR5, FR17–FR25, FR70
- 4.1 Agendamento de visitas
- 4.2 Iniciar visita com checklist aplicável
- 4.3 Fotos por item (Supabase Storage)
- 4.4 Anotações textuais por item
- 4.5 Destaque NC recorrente (histórico)
- 4.6 Compilar dossiê ao finalizar
- 4.7 Revisar, editar e aprovar dossiê
- 4.8 PDF assíncrono com CRN (fila + worker)
- 4.9 Envio automático por email

## Epic 5: Dashboard e Organização
FRs: FR50–FR54
- 5.1 Agenda do dia por prioridade
- 5.2 Alertas regulatórios com countdown
- 5.3 Pendências financeiras no dashboard
- 5.4 Separação pacientes vs financeiro
- 5.5 Briefing semanal
- 5.6 Gráficos com tokens do tema

## Epic 6: Ficha Técnica, TACO e Custos
FRs: FR26–FR36
- 6.1 Receitas com linhas de ingrediente
- 6.2 Ligação TACO e informação nutricional automática
- 6.3 Matéria-prima com custo unitário
- 6.4 Fatores de correção e cocção
- 6.5 Custo total + impostos + margem + preço por porção
- 6.6 Escalonamento por regra de três
- 6.7 Recálculo em cascata (preço ingrediente → todas fichas)
- 6.8 Exportar ficha técnica PDF

## Epic 7: POPs
FRs: FR37–FR40
- 7.1 Templates de POP por tipo de estabelecimento
- 7.2 Criar e editar POP vinculado a estabelecimento
- 7.3 Versionamento de POP
- 7.4 Exportar POP em PDF

## Epic 8: Financeiro Básico
FRs: FR41–FR45
- 8.1 Status de pagamento por cliente
- 8.2 Recorrência de cobrança (mensal/anual/avulso)
- 8.3 Datas de início/fim de contrato
- 8.4 Contratos a partir de modelos pré-preenchidos
- 8.5 Alertas de renovação e vencimento

## Epic 9: Portal de Acesso Externo (LGPD)
FRs: FR46–FR49
- 9.1 Cadastro de usuários externos (familiar, médico)
- 9.2 Permissões por categoria de dado
- 9.3 Visualização no portal externo
- 9.4 Consentimento parental para menores

## Epic 10: Admin SaaS
FRs: FR57–FR60, FR15, FR16
- 10.1 Gestão de tenants (profissionais)
- 10.2 Planos, limites e add-ons
- 10.3 Métricas da plataforma
- 10.4 Catálogo de portarias, TACO e templates
- 10.5 CRUD e versionamento de checklists regulatórios
- 10.6 Notificar profissionais ao atualizar portaria

## Epic 11: Segurança, Privacidade e Acessibilidade
FRs: FR61–FR70, NFR9–NFR17, NFR28–NFR32
- 11.1 Testes de RLS multi-tenant (automáticos a cada deploy)
- 11.2 Log de auditoria de dados de paciente
- 11.3 Registro de consentimentos digital
- 11.4 Relatório de dados pessoais (DSAR)
- 11.5 Portabilidade de dados do profissional
- 11.6 Notificações push/email transversais
- 11.7 Exclusão de conta (LGPD Art. 18)
- 11.8 Smoke tests de acessibilidade WCAG AA
