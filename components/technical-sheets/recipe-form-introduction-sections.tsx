"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function RecipeFormIntroductionSections({ className }: Props) {
  const [expandedIntro, setExpandedIntro] = useState(false);
  const [expandedInstructions, setExpandedInstructions] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── INTRODUÇÃO ── */}
      <button
        type="button"
        onClick={() => setExpandedIntro(!expandedIntro)}
        className="w-full flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-3 font-medium text-teal-900 hover:bg-teal-100 transition-colors"
      >
        <ChevronDown
          className={cn(
            "size-5 transition-transform",
            expandedIntro && "rotate-180",
          )}
        />
        Introdução
      </button>

      {expandedIntro && (
        <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-relaxed text-teal-900">
          <p>
            <strong>O que é a Ficha Técnica de Preparação (FTP)?</strong>
          </p>
          <p>
            A ficha técnica é um instrumento gerencial e de apoio operacional,
            pelo qual se faz o levantamento dos custos, se ordena as etapas de
            preparação e montagem dos pratos que são, ou podem vir a ser,
            preparados.
          </p>
          <p>
            A Unidade de Alimentação e Nutrição, ao preparar um prato,
            deve-se ater a um padrão não só para garantir a qualidade, mas
            também os custos fixados.
          </p>
          <p>
            A partir dessa ficha são estipulados os preços de venda de maneira
            a atender as expectativas da clientela do restaurante.
          </p>

          <p className="pt-2">
            <strong>
              Quais as vantagens de se estabelecer o uso da FTP em Unidades de
              Alimentação e Nutrição?
            </strong>
          </p>

          <ol className="list-inside list-decimal space-y-2">
            <li>
              Diminui perdas na cozinha, pois padroniza as quantidades e
              determina os produtos que entrarão na preparação dos pratos.
            </li>
            <li>
              Dinamiza o trabalho da brigada de cozinha, cujos profissionais
              também têm acesso às fichas técnicas.
            </li>
            <li>
              Facilita a preparação dos pratos, já que uma única fonte
              informativa racionaliza o tempo.
            </li>
            <li>
              Permite o bom treinamento de novos cozinheiros, padronizando o
              trabalho.
            </li>
            <li>
              Facilita o trabalho do setor de compras com informações precisas
              de consumo.
            </li>
            <li>
              Ajuda no controle dos desvios com quantidades bem definidas.
            </li>
            <li>Garante ao cliente qualidade e quantidade consistentes.</li>
            <li>É a base de cálculo do preço de venda dos pratos.</li>
            <li>
              Permite alterações de preços com base na realidade do mercado.
            </li>
          </ol>
        </div>
      )}

      {/* ── INSTRUÇÕES ── */}
      <button
        type="button"
        onClick={() => setExpandedInstructions(!expandedInstructions)}
        className="w-full flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 font-medium text-blue-900 hover:bg-blue-100 transition-colors"
      >
        <ChevronDown
          className={cn(
            "size-5 transition-transform",
            expandedInstructions && "rotate-180",
          )}
        />
        Instruções de Preenchimento
      </button>

      {expandedInstructions && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
          <p>
            <strong>É fundamental que se elabore uma ficha técnica contendo todas as informações sobre o preparo do produto.</strong>
          </p>

          <div className="space-y-2">
            <p>
              A ficha técnica deve conter o nome do produto, a sua
              classificação (bebida, entrada, prato principal ou sobremesa),
              rendimento em porções, ingredientes, quantidades e custos
              unitários de aquisição.
            </p>

            <p>
              Observe os fatores de Correção e o Índice de Aproveitamento dos
              ingredientes utilizados.
            </p>

            <p>
              Se o empreendimento utiliza embalagem para viagem ou outro item
              importante na confecção do prato, ele deve constar na ficha.
            </p>
          </div>

          <p className="pt-2">
            <strong>Passo a passo de preenchimento:</strong>
          </p>

          <ol className="list-inside list-decimal space-y-2">
            <li>
              <strong>Ingredientes:</strong> Liste todos na coluna respectiva.
              Para adicionar mais linhas, clique em "+ Adicionar".
            </li>
            <li>
              <strong>Quantidade Líquida (coluna B):</strong> A quantidade de
              matéria-prima limpa, depois de pré-preparada, filetada,
              desossada, etc.
            </li>
            <li>
              <strong>Unidade (coluna C):</strong> g (gramas), Kg (quilogramas),
              ml (mililitros), l (litros), ou un (unidades).
            </li>
            <li>
              <strong>Aproveitamento (coluna D):</strong> Índice em decimal
              (ex: 0,85 = 85%). A planilha calcula automaticamente a Qtd. Bruta.
            </li>
            <li>
              <strong>Qtd. Bruta (coluna E):</strong> Calculada automaticamente
              = Qtd. Líquida / Aproveitamento.
            </li>
            <li>
              <strong>Custo Bruto Unitário (coluna F):</strong> Preço por
              unidade (R$/kg, R$/l, etc).
            </li>
            <li>
              <strong>Custo Total (coluna G):</strong> Calculado automaticamente
              = Custo Unitário × Qtd. Bruta.
            </li>
            <li>
              <strong>CMV%:</strong> Custo dos Materiais Vendidos. Padrão 25%.
              Ajuste conforme sua margem desejada (20%, 30%, etc).
            </li>
            <li>
              <strong>Preços:</strong> Todos os preços são calculados
              automaticamente com base no CMV%.
            </li>
            <li>
              <strong>Modo de Preparo:</strong> Descreva o passo a passo da
              confecção.
            </li>
          </ol>

          <p className="pt-3 border-t border-blue-200">
            <strong>Dica:</strong> 🔵 Azul = preencha você | ⚫ Preto =
            calculado automaticamente
          </p>
        </div>
      )}
    </div>
  );
}
