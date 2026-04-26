#!/usr/bin/env python3
"""
Gerador de PDF Premium V2 - Auditoria de Boas Práticas
Sistema NutriGestão SaaS
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                 PageBreak, Flowable)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os

# Define colors
NAVY = HexColor("#1a2744")
GREEN_SUCCESS = HexColor("#2e7d32")
ORANGE_ALERT = HexColor("#f57c00")
RED_ERROR = HexColor("#c62828")
WHITE = HexColor("#ffffff")
LIGHT_GRAY = HexColor("#f8f9fa")
DARK_TEXT = HexColor("#212121")
MEDIUM_GRAY = HexColor("#757575")

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_LEFT = 15 * mm
MARGIN_RIGHT = 15 * mm
MARGIN_TOP = 15 * mm
MARGIN_BOTTOM = 15 * mm

class HeaderFlowable(Flowable):
    """Header com Navy background, título e metadata"""
    def __init__(self):
        super().__init__()
        self.width = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
        self.height = 100*mm

    def draw(self):
        c = self.canv
        # Navy background
        c.setFillColor(NAVY)
        c.rect(-MARGIN_LEFT, 0, PAGE_WIDTH, self.height, fill=1, stroke=0)

        # Title
        c.setFont("Helvetica-Bold", 32)
        c.setFillColor(WHITE)
        c.drawString(10, self.height - 35*mm, "AUDITORIA DE BOAS PRÁTICAS")

        # Subtitle
        c.setFont("Helvetica", 13)
        c.setFillColor(HexColor("#e0e0e0"))
        c.drawString(10, self.height - 45*mm, "EINSTEIN MORUMBI · KOJI · I2 ANDAR")

        # Metadata
        c.setFont("Helvetica", 9)
        c.setFillColor(HexColor("#b0bec5"))
        metadata = "Auditor: Alana Barbosa  |  Data: 16/03/2026  |  ID: F26031600003  |  08:53 - 09:20"
        c.drawString(10, self.height - 52*mm, metadata)

class PhotoPlaceholder(Flowable):
    """Placeholder para fotos de NC com borda vermelha"""
    def __init__(self, description):
        super().__init__()
        self.description = description
        self.width = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
        self.height = 40*mm

    def draw(self):
        c = self.canv
        # Red border
        c.setLineWidth(2)
        c.setStrokeColor(RED_ERROR)
        c.setFillColor(HexColor("#f0f0f0"))
        c.rect(10, 0, self.width - 20, self.height, fill=1, stroke=1)

        # Text
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(RED_ERROR)
        c.drawString(20, self.height - 15, f"FOTO: {self.description}")

        # Icon
        c.setFont("Helvetica", 28)
        c.drawCentredString(self.width/2, self.height/2 - 5, "📷")

def create_pdf(output_path):
    """Create the PDF with all content"""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=MARGIN_RIGHT,
        leftMargin=MARGIN_LEFT,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Auditoria de Boas Práticas V2"
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=DARK_TEXT,
        spaceAfter=12,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )

    item_style = ParagraphStyle(
        'ItemText',
        parent=styles['Normal'],
        fontSize=11,
        textColor=DARK_TEXT,
        spaceAfter=6,
        alignment=TA_LEFT,
        fontName='Helvetica'
    )

    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        spaceAfter=8,
        alignment=TA_LEFT,
        fontName='Helvetica'
    )

    # ========== PAGE 1: HEADER + KPIs + METRICS TABLE ==========

    story.append(HeaderFlowable())
    story.append(Spacer(1, 50*mm))

    # KPIs
    story.append(Paragraph("KPIs GERAIS", section_title_style))
    story.append(Spacer(1, 10))

    kpi_table = Table(
        [
            [Paragraph("<b>PONTOS REALIZADOS</b><br/>690/728", body_style),
             Paragraph("<b>NÃO CONFORMIDADES</b><br/><font color='#c62828'>4</font>", body_style),
             Paragraph("<b>PLANOS DE AÇÃO</b><br/>0", body_style)]
        ],
        colWidths=[170, 170, 170]
    )

    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), WHITE),
        ('BORDER', (0, 0), (-1, -1), 1, LIGHT_GRAY),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
    ]))

    story.append(kpi_table)
    story.append(Spacer(1, 15))

    # Metrics Table
    story.append(Paragraph("RESUMO POR SEÇÕES", section_title_style))
    story.append(Spacer(1, 10))

    metrics_data = [
        ["Seção", "Avaliação (%)", "NC", "Status"],
        ["INSTALAÇÃO (ÁREA INTERNA DA LOJA)", "96,88%", "1", "Adequado"],
        ["PESSOAL: HIGIENE, CONTROLE DE SAÚDE E CAPACITAÇÃO", "100%", "0", "Adequado"],
        ["RECEBIMENTO E ARMAZENAMENTO", "100%", "0", "Adequado"],
        ["PRÉ-PREPARO, PREPARO E EXPOSIÇÃO", "100%", "0", "Adequado"],
        ["EQUIPAMENTOS, MÓVEIS E UTENSÍLIOS", "78,95%", "1", "Atenção"],
        ["RESÍDUOS E CONTROLE INTEGRADO DE PRAGAS", "28,57%", "2", "Crítico"],
        ["TEMPERATURA", "100%", "0", "Adequado"],
        ["PLANILHA", "100%", "0", "Adequado"],
        ["DOCUMENTAÇÃO", "100%", "0", "Adequado"],
    ]

    metrics_table = Table(metrics_data, colWidths=[280, 80, 40, 80])

    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),

        ('BACKGROUND', (0, 1), (-1, -1), WHITE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor("#f8f9fa")]),
        ('BORDER', (0, 0), (-1, -1), 0.5, HexColor("#e0e0e0")),

        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),

        ('TEXTCOLOR', (2, 1), (2, -1), RED_ERROR),
        ('FONTNAME', (2, 1), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 1), (3, -1), 'Helvetica-Bold'),
    ]))

    story.append(metrics_table)
    story.append(PageBreak())

    # ========== PAGE 2: SEÇÃO 2 - INSTALAÇÃO ==========

    story.append(Paragraph("INSTALAÇÃO (ÁREA INTERNA DA LOJA)", section_title_style))
    story.append(Spacer(1, 8))

    section_info = Paragraph(
        "<font color='#2e7d32'><b>Score: 96,88%</b></font> | "
        "<font color='#c62828'><b>Não Conformidades: 1</b></font>",
        body_style
    )
    story.append(section_info)
    story.append(Spacer(1, 12))

    instalacao_items = [
        ("CONFORME", "Instalação organizada e dimensionada"),
        ("NC", "Piso - manchado com ferrugem (FOTO)"),
        ("CONFORME", "Ralo e calha - limpos e em boas condições"),
        ("CONFORME", "Parede - limpa e impermeável"),
        ("CONFORME", "Teto - limpo e em boas condições"),
        ("CONFORME", "Porta - limpa e com fechamento automático"),
        ("N/A", "Janela e tela"),
        ("CONFORME", "Iluminação adequada"),
        ("CONFORME", "Ventilação adequada"),
        ("CONFORME", "Pia - limpa e em boas condições"),
        ("CONFORME", "Pia higienização das mãos - completa"),
        ("CONFORME", "Cartaz de higienização presente"),
        ("CONFORME", "Sem objetos estranhos"),
        ("CONFORME", "Casa de máquinas limpa"),
        ("CONFORME", "Caixa de gordura presente e vedada"),
        ("N/A", "Sanitário e vestiário"),
        ("CONFORME", "Aviso bebida alcoólica presente"),
    ]

    for status, text in instalacao_items:
        if status == "conforme":
            icon, color = "✓", GREEN_SUCCESS
        elif status == "nc":
            icon, color = "✗", RED_ERROR
        else:
            icon, color = "—", MEDIUM_GRAY

        if status == "nc":
            item_text = f"<font color='#{color.hexval()}'><b>{icon}</b></font> <font color='#c62828'><b>{text}</b></font>"
            story.append(Paragraph(item_text, item_style))
            story.append(Spacer(1, 5))
            story.append(PhotoPlaceholder("Piso - manchado com ferrugem na área de pré-preparo"))
            story.append(Spacer(1, 12))

            justif_text = Paragraph(
                "<b>JUSTIFICATIVA:</b> Manchas de ferrugem identificadas no piso da área "
                "de pré-preparo. Recomendação: realizar limpeza profunda e aplicar selador "
                "apropriado para evitar propagação.",
                body_style
            )
            story.append(justif_text)
            story.append(Spacer(1, 12))
        else:
            item_text = f"<font color='#{color.hexval()}'><b>{icon}</b></font> {text}"
            story.append(Paragraph(item_text, item_style))
            story.append(Spacer(1, 6))

    story.append(PageBreak())

    # ========== PAGE 3: SEÇÃO 3 - PESSOAL ==========

    story.append(Paragraph("PESSOAL: HIGIENE, CONTROLE DE SAÚDE E CAPACITAÇÃO", section_title_style))
    story.append(Spacer(1, 8))

    section_info = Paragraph(
        "<font color='#2e7d32'><b>Score: 100%</b></font> | "
        "<font color='#2e7d32'><b>Não Conformidades: 0</b></font>",
        body_style
    )
    story.append(section_info)
    story.append(Spacer(1, 12))

    pessoal_items = [
        ("CONFORME", "Funcionário: unhas e aparência adequadas"),
        ("CONFORME", "Uniforme limpo e completo"),
        ("N/A", "Condição de saúde"),
        ("CONFORME", "Higienização adequada das mãos"),
        ("CONFORME", "Objetos pessoais guardados"),
        ("CONFORME", "EPI adequado"),
        ("CONFORME", "Máscara - uso adequado"),
        ("CONFORME", "Refeição em local adequado"),
    ]

    for status, text in pessoal_items:
        if status == "conforme":
            icon, color = "✓", GREEN_SUCCESS
        elif status == "nc":
            icon, color = "✗", RED_ERROR
        else:
            icon, color = "—", MEDIUM_GRAY

        item_text = f"<font color='#{color.hexval()}'><b>{icon}</b></font> {text}"
        story.append(Paragraph(item_text, item_style))
        story.append(Spacer(1, 8))

    story.append(PageBreak())

    # ========== PAGE 4: SEÇÃO 6 E 7 ==========

    story.append(Paragraph("EQUIPAMENTOS, MÓVEIS E UTENSÍLIOS", section_title_style))
    story.append(Spacer(1, 8))

    section_info = Paragraph(
        "<font color='#f57c00'><b>Score: 78,95%</b></font> | "
        "<font color='#c62828'><b>Não Conformidades: 1</b></font>",
        body_style
    )
    story.append(section_info)
    story.append(Spacer(1, 12))

    equipamentos_items = [
        ("CONFORME", "Equipamentos limpos e conservados"),
        ("NC", "Higienização inadequada - sujidades (FOTO)"),
        ("CONFORME", "Produto de limpeza regularizado na ANVISA"),
        ("CONFORME", "Material de limpeza guardado adequadamente"),
        ("CONFORME", "Esponja e pano descartável corretos"),
        ("CONFORME", "Máquina de lavar louça adequada"),
        ("CONFORME", "Louça do cliente higienizada"),
    ]

    for status, text in equipamentos_items:
        if status == "conforme":
            icon, color = "✓", GREEN_SUCCESS
        elif status == "nc":
            icon, color = "✗", RED_ERROR
        else:
            icon, color = "—", MEDIUM_GRAY

        if status == "nc":
            item_text = f"<font color='#{color.hexval()}'><b>{icon}</b></font> <font color='#c62828'><b>{text}</b></font>"
            story.append(Paragraph(item_text, item_style))
            story.append(Spacer(1, 5))
            story.append(PhotoPlaceholder("Equipamento com sujidades em superfícies internas"))
            story.append(Spacer(1, 12))

            justif_text = Paragraph(
                "<b>JUSTIFICATIVA:</b> Equipamento apresenta resíduos e sujidades em "
                "superfícies de contato com alimentos. Plano de ação: implementar protocolo "
                "de higienização diária e monitoramento.",
                body_style
            )
            story.append(justif_text)
            story.append(Spacer(1, 12))
        else:
            item_text = f"<font color='#{color.hexval()}'><b>{icon}</b></font> {text}"
            story.append(Paragraph(item_text, item_style))
            story.append(Spacer(1, 8))

    story.append(Spacer(1, 20))
    story.append(Paragraph("RESÍDUOS E CONTROLE INTEGRADO DE PRAGAS", section_title_style))
    story.append(Spacer(1, 8))

    section_info = Paragraph(
        "<font color='#c62828'><b>Score: 28,57%</b></font> | "
        "<font color='#c62828'><b>Não Conformidades: 2</b></font>",
        body_style
    )
    story.append(section_info)
    story.append(Spacer(1, 12))

    residuos_items = [
        ("NC", "Descarte inadequado na lixeira de compostagem (FOTO)"),
        ("CONFORME", "Resíduo de óleo comestível identificado"),
        ("NC", "Presença de mosquitinhos na área do bar (FOTO)"),
    ]

    nc_descriptions = {
        "Descarte inadequado": "Lixeira de compostagem com descarte incorreto de resíduos",
        "Presença de mosquitinhos": "Presença de pragas (mosquitas-da-fruta) na área do bar"
    }

    for status, text in residuos_items:
        if status == "conforme":
            icon, color = "✓", GREEN_SUCCESS
        elif status == "nc":
            icon, color = "✗", RED_ERROR
        else:
            icon, color = "—", MEDIUM_GRAY

        if status == "nc":
            item_text = f"<font color='#{color.hexval()}'><b>{icon}</b></font> <font color='#c62828'><b>{text}</b></font>"
            story.append(Paragraph(item_text, item_style))
            story.append(Spacer(1, 5))

            # Choose appropriate description
            if "lixeira" in text.lower():
                story.append(PhotoPlaceholder(nc_descriptions["Descarte inadequado"]))
            else:
                story.append(PhotoPlaceholder(nc_descriptions["Presença de mosquitinhos"]))

            story.append(Spacer(1, 12))

            if "lixeira" in text.lower():
                justif_text = Paragraph(
                    "<b>JUSTIFICATIVA:</b> Lixeira de compostagem recebendo resíduos não "
                    "apropriados. Plano de ação urgente: treinamento de equipe sobre "
                    "segregação correta de resíduos.",
                    body_style
                )
            else:
                justif_text = Paragraph(
                    "<b>JUSTIFICATIVA:</b> Presença de insetos (mosquitas-da-fruta) na "
                    "área do bar. Recomendação: chamar empresa de controle de pragas e "
                    "revisar armazenamento de frutas/bebidas.",
                    body_style
                )

            story.append(justif_text)
            story.append(Spacer(1, 12))
        else:
            item_text = f"<font color='#{color.hexval()}'><b>{icon}</b></font> {text}"
            story.append(Paragraph(item_text, item_style))
            story.append(Spacer(1, 8))

    # Build PDF
    doc.build(story)
    return output_path

if __name__ == "__main__":
    # Output path
    output_file = "/Users/Diego/GIT/Nutricao_stratosTech/checklist_auditoria_v2.pdf"

    # Create PDF
    result = create_pdf(output_file)
    print(f"✓ PDF gerado com sucesso!")
    print(f"✓ Localização: {result}")
    print(f"✓ Tamanho: {os.path.getsize(result) / 1024:.1f} KB")
