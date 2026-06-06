#!/usr/bin/env python3
"""
Gerador de PDF Premium V2 - Auditoria de Boas Práticas
NutriGestão SaaS
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.colors import HexColor, Color
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, PageBreak, Flowable, KeepTogether)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.graphics.shapes import Drawing, Rect, Circle, String, Line
from reportlab.graphics import renderPDF
import os

# ─── CORES ────────────────────────────────────────────────────────────────────
NAVY       = HexColor("#1B2A4A")
NAVY_LIGHT = HexColor("#243560")
GREEN      = HexColor("#1B7A3E")
GREEN_LIGHT= HexColor("#E8F5EE")
ORANGE     = HexColor("#D97706")
ORANGE_LIGHT = HexColor("#FEF3C7")
RED        = HexColor("#B91C1C")
RED_LIGHT  = HexColor("#FEE2E2")
WHITE      = HexColor("#FFFFFF")
OFF_WHITE  = HexColor("#F9FAFB")
GRAY_100   = HexColor("#F3F4F6")
GRAY_200   = HexColor("#E5E7EB")
GRAY_400   = HexColor("#9CA3AF")
GRAY_600   = HexColor("#4B5563")
GRAY_800   = HexColor("#1F2937")
ACCENT     = HexColor("#0EA5E9")  # sky blue para destaques

PAGE_W, PAGE_H = A4
ML = 18 * mm
MR = 18 * mm
MT = 15 * mm
MB = 15 * mm
CONTENT_W = PAGE_W - ML - MR


# ─── FLOWABLES CUSTOMIZADOS ────────────────────────────────────────────────────

class CoverHeader(Flowable):
    """Cabeçalho da página 1 com background navy, score em destaque e meta-info."""
    def __init__(self, width, height=88*mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Background azul escuro com faixa decorativa
        c.setFillColor(NAVY)
        c.roundRect(-ML, 0, PAGE_W, h + MT, 0, fill=1, stroke=0)

        # Faixa lateral decorativa (barra azul + clara)
        c.setFillColor(ACCENT)
        c.rect(w - 5, 0, 5, h, fill=1, stroke=0)

        # ── Título e subtítulo ────────────────────────────────
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 24)
        c.drawString(0, h - 22*mm, "AUDITORIA DE BOAS PRÁTICAS")

        c.setFont("Helvetica", 13)
        c.setFillColor(HexColor("#93C5FD"))
        c.drawString(0, h - 32*mm, "EINSTEIN MORUMBI  ·  KOJI  ·  I2 ANDAR")

        # ── Linha separadora ──────────────────────────────────
        c.setStrokeColor(HexColor("#3B82F6"))
        c.setLineWidth(1.2)
        c.line(0, h - 36*mm, w - 60, h - 36*mm)

        # ── Meta-dados ────────────────────────────────────────
        c.setFont("Helvetica", 8.5)
        c.setFillColor(HexColor("#CBD5E1"))
        meta = [
            ("Auditora", "Alana Barbosa"),
            ("Data", "16/03/2026"),
            ("ID", "F26031600003"),
            ("Início", "08:53"),
            ("Término", "09:20"),
            ("Plataforma", "Mobile"),
        ]
        x = 0
        for label, val in meta:
            c.setFont("Helvetica", 7)
            c.setFillColor(HexColor("#94A3B8"))
            c.drawString(x, h - 43*mm, label.upper())
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(WHITE)
            c.drawString(x, h - 50*mm, val)
            x += 85

        # ── Score circular grande ─────────────────────────────
        cx = w - 28*mm
        cy = h - 30*mm
        r = 22*mm

        # Anel externo (fundo)
        c.setStrokeColor(HexColor("#1E3A5F"))
        c.setLineWidth(6)
        c.circle(cx, cy, r, fill=0, stroke=1)

        # Arco do score (~95% = quase completo) — simulado com arco
        c.setStrokeColor(GREEN)
        c.setLineWidth(6)
        c.arc(cx - r, cy - r, cx + r, cy + r, startAng=90, extent=342)  # 94.78% → ~341°

        # Score text
        c.setFont("Helvetica-Bold", 19)
        c.setFillColor(WHITE)
        c.drawCentredString(cx, cy + 3, "94,78%")
        c.setFont("Helvetica", 7)
        c.setFillColor(HexColor("#93C5FD"))
        c.drawCentredString(cx, cy - 8, "APROVEITAMENTO")
        c.setFont("Helvetica", 6.5)
        c.setFillColor(HexColor("#64748B"))
        c.drawCentredString(cx, cy - 17, "Padrão mínimo: 80%")


class KPICard(Flowable):
    """Card de KPI individual com valor grande e barra de progresso opcional."""
    def __init__(self, label, value, subtitle=None, color=GREEN, width=55*mm, height=28*mm, show_bar=False, bar_pct=None):
        super().__init__()
        self.label = label
        self.value = value
        self.subtitle = subtitle
        self.color = color
        self.width = width
        self.height = height
        self.show_bar = show_bar
        self.bar_pct = bar_pct

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Card background
        c.setFillColor(WHITE)
        c.setStrokeColor(GRAY_200)
        c.setLineWidth(0.5)
        c.roundRect(0, 0, w, h, 4, fill=1, stroke=1)

        # Top accent bar
        c.setFillColor(self.color)
        c.roundRect(0, h - 3, w, 3, 2, fill=1, stroke=0)

        # Label
        c.setFont("Helvetica", 6.5)
        c.setFillColor(GRAY_400)
        c.drawString(8, h - 13, self.label.upper())

        # Value
        c.setFont("Helvetica-Bold", 22)
        c.setFillColor(self.color)
        c.drawString(8, h - 28, str(self.value))

        if self.subtitle:
            c.setFont("Helvetica", 8)
            c.setFillColor(GRAY_600)
            c.drawString(8, 10, self.subtitle)

        if self.show_bar and self.bar_pct is not None:
            bar_y = 6
            bar_h = 4
            bar_max = w - 16
            # Background
            c.setFillColor(GRAY_200)
            c.roundRect(8, bar_y, bar_max, bar_h, 2, fill=1, stroke=0)
            # Fill
            c.setFillColor(self.color)
            c.roundRect(8, bar_y, bar_max * self.bar_pct, bar_h, 2, fill=1, stroke=0)


class SectionHeader(Flowable):
    """Header premium de cada seção do checklist."""
    def __init__(self, number, title, score_pct, nc_count, width=CONTENT_W):
        super().__init__()
        self.number = number
        self.title = title
        self.score_pct = score_pct
        self.nc_count = nc_count
        self.width = width
        self.height = 18*mm

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Determine color by score
        if self.score_pct is None:
            bg_color = GRAY_100
            border_color = GRAY_400
        elif self.score_pct >= 80:
            bg_color = GREEN_LIGHT
            border_color = GREEN
        elif self.score_pct >= 50:
            bg_color = ORANGE_LIGHT
            border_color = ORANGE
        else:
            bg_color = RED_LIGHT
            border_color = RED

        # Background
        c.setFillColor(bg_color)
        c.setStrokeColor(border_color)
        c.setLineWidth(0)
        c.roundRect(0, 0, w, h, 3, fill=1, stroke=0)

        # Left border accent
        c.setFillColor(border_color)
        c.rect(0, 0, 4, h, fill=1, stroke=0)

        # Section number badge
        c.setFillColor(NAVY)
        c.roundRect(10, (h - 8*mm)/2, 8*mm, 8*mm, 3, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(WHITE)
        c.drawCentredString(14*mm, h/2 - 2, str(self.number))

        # Title
        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColor(GRAY_800)
        c.drawString(26*mm, h/2 + 1, self.title)

        # Score badge (right side)
        if self.score_pct is not None:
            score_text = f"{self.score_pct:.2f}%".replace(".", ",")
            badge_x = w - 60*mm
            # Score
            c.setFont("Helvetica-Bold", 13)
            c.setFillColor(border_color)
            c.drawRightString(w - 40*mm, h/2 - 3, score_text)

            # NC badge
            nc_color = RED if self.nc_count > 0 else GREEN
            c.setFillColor(nc_color)
            c.roundRect(w - 35*mm, (h - 7*mm)/2, 32*mm, 7*mm, 10, fill=1, stroke=0)
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(WHITE)
            nc_text = f"NC: {self.nc_count}"
            c.drawCentredString(w - 35*mm + 16*mm, h/2 - 2, nc_text)


class CheckItem(Flowable):
    """Item individual do checklist com status e texto."""
    def __init__(self, status, text, width=CONTENT_W):
        super().__init__()
        self.status = status  # "OK", "NC", "NA"
        self.text = text
        self.width = width
        # Calc height based on text length
        self.height = 10*mm

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Status indicator
        if self.status == "OK":
            bg = GREEN
            fg = WHITE
            icon = "OK"
        elif self.status == "NC":
            bg = RED
            fg = WHITE
            icon = "NC"
        else:
            bg = GRAY_400
            fg = WHITE
            icon = "N/A"

        # Pill badge
        pill_w = 18*mm
        pill_h = 5*mm
        pill_y = (h - pill_h) / 2
        c.setFillColor(bg)
        c.roundRect(0, pill_y, pill_w, pill_h, pill_h/2, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 6.5)
        c.setFillColor(fg)
        c.drawCentredString(pill_w/2, pill_y + 1.5, icon)

        # Item text
        c.setFont("Helvetica" if self.status != "NC" else "Helvetica-Bold", 9.5)
        c.setFillColor(RED if self.status == "NC" else GRAY_800 if self.status == "OK" else GRAY_400)
        # Clip text to width
        max_chars = 110
        display_text = self.text if len(self.text) <= max_chars else self.text[:max_chars] + "..."
        c.drawString(pill_w + 6, h/2 - 2, display_text)


class NCBox(Flowable):
    """Caixa de justificativa para não-conformidades."""
    def __init__(self, justificativa, width=CONTENT_W, height=20*mm):
        super().__init__()
        self.justificativa = justificativa
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Background vermelho claro
        c.setFillColor(RED_LIGHT)
        c.setStrokeColor(RED)
        c.setLineWidth(0.8)
        c.roundRect(0, 0, w, h, 3, fill=1, stroke=1)

        # Left bar
        c.setFillColor(RED)
        c.rect(0, 0, 3, h, fill=1, stroke=0)

        # Label
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(RED)
        c.drawString(10, h - 10, "JUSTIFICATIVA / NÃO CONFORMIDADE")

        # Text
        c.setFont("Helvetica", 8.5)
        c.setFillColor(GRAY_800)
        max_chars = 145
        text = self.justificativa if len(self.justificativa) <= max_chars else self.justificativa[:max_chars] + "..."
        c.drawString(10, h - 20, text)


class PhotoBox(Flowable):
    """Placeholder visual para fotos de não-conformidades."""
    def __init__(self, caption, width=CONTENT_W, height=45*mm):
        super().__init__()
        self.caption = caption
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Outer frame
        c.setFillColor(GRAY_100)
        c.setStrokeColor(RED)
        c.setLineWidth(1.5)
        c.roundRect(0, 0, w, h, 4, fill=1, stroke=1)

        # Inner photo area (centered)
        inner_margin = 8
        iw = w - 2*inner_margin
        ih = h - 18
        c.setFillColor(GRAY_200)
        c.setStrokeColor(GRAY_400)
        c.setLineWidth(0.5)
        c.rect(inner_margin, 14, iw, ih, fill=1, stroke=1)

        # Camera icon (simplified)
        cx = w / 2
        cy = 14 + ih / 2
        c.setFillColor(GRAY_400)
        c.circle(cx, cy, 10, fill=0, stroke=1)
        c.circle(cx, cy, 6, fill=1, stroke=0)
        c.setFillColor(GRAY_400)
        c.rect(cx - 12, cy + 7, 24, 5, fill=1, stroke=0)

        # Caption bar
        c.setFillColor(RED)
        c.rect(0, 0, w, 14, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(WHITE)
        c.drawString(6, 4, f"REGISTRO FOTOGRÁFICO  ·  {self.caption.upper()}")


class ScoreGaugeSmall(Flowable):
    """Mini indicador de score para o sumário geral."""
    def __init__(self, label, value, color, width=40*mm, height=40*mm):
        super().__init__()
        self.label = label
        self.value = value
        self.color = color
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        cx = self.width / 2
        cy = self.height / 2 + 5
        r = 15*mm

        # Background ring
        c.setStrokeColor(GRAY_200)
        c.setLineWidth(5)
        c.circle(cx, cy, r, fill=0, stroke=1)

        # Value ring
        c.setStrokeColor(self.color)
        c.setLineWidth(5)
        if isinstance(self.value, (int, float)):
            extent = (self.value / 100) * 360
        else:
            extent = 0
        c.arc(cx - r, cy - r, cx + r, cy + r, startAng=90, extent=extent)

        # Value text
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(self.color)
        if isinstance(self.value, (int, float)):
            c.drawCentredString(cx, cy - 3, f"{self.value:.0f}%")
        else:
            c.drawCentredString(cx, cy - 3, str(self.value))

        # Label
        c.setFont("Helvetica", 7)
        c.setFillColor(GRAY_600)
        c.drawCentredString(cx, 5, self.label)


# ─── FUNÇÕES AUXILIARES ────────────────────────────────────────────────────────

def get_score_color(score_pct):
    if score_pct is None:
        return GRAY_400
    elif score_pct >= 80:
        return GREEN
    elif score_pct >= 50:
        return ORANGE
    else:
        return RED


def build_items(story, items, spacer_h=2*mm):
    """Adiciona items de checklist ao story."""
    for item in items:
        status = item["status"]  # "OK", "NC", "NA"
        text   = item["text"]
        story.append(CheckItem(status, text))
        story.append(Spacer(1, spacer_h))

        if status == "NC":
            if "justificativa" in item:
                story.append(NCBox(item["justificativa"]))
                story.append(Spacer(1, 2*mm))
            if "foto" in item:
                story.append(Spacer(1, 1*mm))
                story.append(PhotoBox(item["foto"]))
                story.append(Spacer(1, 4*mm))


# ─── DADOS DO RELATÓRIO ────────────────────────────────────────────────────────

REPORT = {
    "titulo": "AUDITORIA DE BOAS PRÁTICAS",
    "local": "EINSTEIN MORUMBI · KOJI · I2 ANDAR",
    "data": "16/03/2026",
    "auditor": "Alana Barbosa",
    "id": "F26031600003",
    "inicio": "08:53",
    "termino": "09:20",
    "score_geral": 94.78,
    "pp_total": 728,
    "pr_total": 690,
    "nc_total": 4,
    "fotos": 5,
    "planos_acao": 0,
}

SECTIONS = [
    {
        "number": 1,
        "title": "INFORMAÇÃO DA VISITA",
        "score": None, "pp": None, "pr": None, "nc": 0,
        "items": [
            {"status": "OK", "text": "Início da visita: 16/03/2026 às 08:53"},
        ]
    },
    {
        "number": 2,
        "title": "INSTALAÇÃO (ÁREA INTERNA DA LOJA)",
        "score": 96.88, "pp": 64, "pr": 62, "nc": 1,
        "items": [
            {"status": "OK",  "text": "Instalação: organizada e dimensionada de forma a facilitar a execução dos procedimentos"},
            {"status": "NC",  "text": "Piso: limpo, revestido com material liso, antiderrapante, impermeável, lavável e em boas condições",
             "justificativa": "Pisos manchados e com ferrugem. Recomenda-se limpeza profunda e aplicação de selador adequado.",
             "foto": "Piso manchado com ferrugem - área de pré-preparo"},
            {"status": "OK",  "text": "Ralo e calha: limpos, íntegros, sifonados, com tampa e sistema de fechamento"},
            {"status": "OK",  "text": "Parede: limpa, lisa, impermeável, lavável, de cor clara e em boas condições"},
            {"status": "OK",  "text": "Teto: limpo, liso, impermeável, lavável, sem fresta e resistente ao calor"},
            {"status": "OK",  "text": "Porta: limpa, resistente, impermeável, ajustada ao batente e com fechamento automático"},
            {"status": "NA",  "text": "Janela e tela: limpa, resistente, com proteção contra praga e sujidade"},
            {"status": "OK",  "text": "Iluminação: limpa, adequada, calha em boas condições e lâmpada protegida"},
            {"status": "OK",  "text": "Ventilação: grade e dutos limpos, com renovação e circulação do ar"},
            {"status": "OK",  "text": "Pia: limpa, de material liso, impermeável, lavável e em boas condições"},
            {"status": "OK",  "text": "Pia higienização das mãos: limpa, em ponto estratégico, com paper toalha e sabonete"},
            {"status": "OK",  "text": "Cartaz com procedimento correto de higienização das mãos presente"},
            {"status": "OK",  "text": "Objeto estranho à atividade do local: ausente"},
            {"status": "OK",  "text": "Casa de máquinas: limpa, organizada e desobstruída"},
            {"status": "OK",  "text": "Caixa de gordura: presente, vedada, limpa e em bom estado de conservação"},
            {"status": "NA",  "text": "Sanitário e vestiário: limpo, organizado, sem comunicação direta, em boas condições"},
            {"status": "OK",  "text": "Aviso de proibição de venda de bebida alcoólica para menores de 18 anos: presente"},
        ]
    },
    {
        "number": 3,
        "title": "PESSOAL: HIGIENE, CONTROLE DE SAÚDE E CAPACITAÇÃO",
        "score": 100.0, "pp": 68, "pr": 68, "nc": 0,
        "items": [
            {"status": "OK", "text": "Funcionário: unha curta, sem esmalte, sem adorno, sem barba, com touca e crachá"},
            {"status": "OK", "text": "Funcionário: uniforme limpo, conservado, completo, sem bolso acima da cintura, calçado fechado"},
            {"status": "NA", "text": "Funcionário: bom hábito de higiene e boa condição de saúde ou afastado da manipulação"},
            {"status": "OK", "text": "Funcionário: higienização adequada das mãos ao chegar, na troca de função e ao voltar do banheiro"},
            {"status": "OK", "text": "Funcionário: objeto pessoal em local organizado, limpo e adequado"},
            {"status": "OK", "text": "Funcionário: EPI limpo, conservado, presente e uso adequado (avental, bota, luva)"},
            {"status": "OK", "text": "Funcionário: máscara com utilização adequada conforme regulamentação vigente"},
            {"status": "OK", "text": "Funcionário: refeição realizada em local próprio e adequado"},
        ]
    },
    {
        "number": 4,
        "title": "RECEBIMENTO E ARMAZENAMENTO",
        "score": 100.0, "pp": 84, "pr": 84, "nc": 0,
        "items": [
            {"status": "NA", "text": "Recebimento: alimento, embalagem e descartável não colocados diretamente sobre o piso"},
            {"status": "NA", "text": "Recebimento refrigerado/congelado: tempo adequado entre recebimento e armazenamento"},
            {"status": "OK", "text": "Armazenamento: produto em embalagem adequada, limpa, íntegra, sem sinais de umidade"},
            {"status": "OK", "text": "Armazenamento: produto sem sinais de descongelamento ou recongelamento"},
            {"status": "OK", "text": "Armazenamento: produto com identificação adequada e dentro do prazo de validade"},
            {"status": "OK", "text": "Descongelamento: sob refrigeração, identificado com data de início e data de uso"},
            {"status": "NA", "text": "Dessalgue: sob refrigeração, identificado com data de início e data de uso"},
            {"status": "OK", "text": "Devolução: produto segregado e identificado"},
            {"status": "OK", "text": "Guarda de amostra: por 96 horas (sólido ≤ 4°C ou -18°C / líquido ≤ 4°C)"},
            {"status": "OK", "text": "Guarda de amostra: mínimo 100g, coletada 1/3 do tempo antes do término da distribuição"},
            {"status": "OK", "text": "Guarda de amostra: identificada com nome, data, horário e sem risco de contaminação"},
        ]
    },
    {
        "number": 5,
        "title": "PRÉ-PREPARO, PREPARO E EXPOSIÇÃO",
        "score": 100.0, "pp": 164, "pr": 164, "nc": 0,
        "items": [
            {"status": "OK", "text": "Higienização de vegetais: seleção, lavagem, desinfecção (imersão completa) e enxague"},
            {"status": "OK", "text": "Higienização de vegetais: produto regularizado na ANVISA, dentro do prazo de validade"},
            {"status": "NA", "text": "Dessalgue: sob temperatura <5°C ou por meio de fervura"},
            {"status": "OK", "text": "Descongelamento: sob temperatura <5°C ou em forno, quando imediato cozimento"},
            {"status": "OK", "text": "Congelamento: adequado (cocção → resfriamento forçado → congelamento)"},
            {"status": "NA", "text": "Tratamento térmico: mínimo de 74°C ou 70°C por 2 min ou 65°C por 15 min"},
            {"status": "OK", "text": "Resfriamento: adequado (de 60°C a 10°C em 2 horas)"},
            {"status": "NA", "text": "Reaquecimento: adequado (mínimo de 74°C)"},
            {"status": "OK", "text": "Uso de ovo: íntegro e limpo; cozido por 7 min em fervura e frito com gema dura"},
            {"status": "OK", "text": "Reutilização do óleo de fritura: óleo filtrado e sem fumaça, espuma, resíduo ou alteração"},
            {"status": "NA", "text": "Preparo: alimento manipulado em no máximo 30 minutos"},
            {"status": "OK", "text": "Preparo: alimento manipulado com utensílio ou com luva descartável"},
            {"status": "OK", "text": "Alimento pronto: mantido em equipamento próprio que permite manutenção térmica"},
            {"status": "NA", "text": "Self service: identificado com principais ingredientes e temperos"},
            {"status": "NA", "text": "Self service: utensílio exclusivo por alimento e com cabo longo"},
            {"status": "NA", "text": "Self service: com barreira de proteção contra contaminação pelo consumidor"},
            {"status": "OK", "text": "Alimento a granel: identificado, em recipiente limpo, com proteção e material sanitário"},
            {"status": "NA", "text": "Balcão térmico: água limpa e trocada diariamente"},
            {"status": "OK", "text": "Resto alimentar: alimento já exposto ou em temperatura inadequada não reutilizado"},
            {"status": "OK", "text": "Contaminação cruzada: ausente"},
        ]
    },
    {
        "number": 6,
        "title": "EQUIPAMENTOS, MÓVEIS E UTENSÍLIOS",
        "score": 78.95, "pp": 76, "pr": 60, "nc": 1,
        "items": [
            {"status": "OK", "text": "Equipamentos, utensílios e móveis: limpos, conservados, de material sanitário e protegidos"},
            {"status": "NC", "text": "Equipamentos, utensílios e móveis: higienizados de forma adequada e frequente",
             "justificativa": "Equipamentos com sujidades visíveis em superfícies de contato com alimentos. Implementar protocolo de higienização diária.",
             "foto": "Equipamento com resíduos - superfície de contato com alimentos"},
            {"status": "OK", "text": "Produto de limpeza: regularizado na ANVISA, dentro do prazo de validade e identificado"},
            {"status": "OK", "text": "Material de limpeza: limpo, bem conservado, guardado em local próprio"},
            {"status": "OK", "text": "Esponja e pano descartável: em local adequado, não imerso em solução, uso correto"},
            {"status": "OK", "text": "Máquina de lavar louça: presente, com temperatura de lavagem 55-65°C e enxague 80-90°C"},
            {"status": "OK", "text": "Louça do cliente (prato, talher, copo e bandeja): limpa e devidamente higienizada"},
        ]
    },
    {
        "number": 7,
        "title": "RESÍDUOS E CONTROLE INTEGRADO DE PRAGAS",
        "score": 28.57, "pp": 28, "pr": 8, "nc": 2,
        "items": [
            {"status": "NC", "text": "Lixo: separação, acondicionamento e destino corretos; recipiente limpo, adequado, em boas condições",
             "justificativa": "Descarte inadequado na lixeira de compostagem. Ação imediata: treinamento sobre segregação correta de resíduos.",
             "foto": "Lixeira de compostagem com descarte incorreto de resíduos"},
            {"status": "OK", "text": "Resíduo de óleo comestível: em recipiente próprio, rígido, fechado e identificado"},
            {"status": "NC", "text": "Pragas: ausência; uso de medidas preventivas; produto aplicado somente por empresa especializada",
             "justificativa": "Presença de mosquitinhos (drosófilas) na área do bar. Acionar imediatamente empresa de controle de pragas.",
             "foto": "Presença de drosófilas na área do bar - urgente"},
        ]
    },
    {
        "number": 8,
        "title": "TEMPERATURA",
        "score": 100.0, "pp": 128, "pr": 128, "nc": 0,
        "items": [
            {"status": "NA", "text": "Temperatura de equipamentos de manutenção quente: adequada"},
            {"status": "OK", "text": "Temperatura de equipamentos de manutenção refrigerada: adequada"},
            {"status": "OK", "text": "Temperatura de equipamentos de manutenção congelada: adequada"},
        ]
    },
    {
        "number": 9,
        "title": "PLANILHA",
        "score": 100.0, "pp": 48, "pr": 48, "nc": 0,
        "items": [
            {"status": "OK", "text": "Planilha de controle de temperatura: recebimento"},
            {"status": "OK", "text": "Planilha de controle de temperatura: equipamentos (2 vezes ao dia)"},
            {"status": "NA", "text": "Planilha de controle de temperatura: pratos prontos para consumo (a cada 2 horas)"},
            {"status": "OK", "text": "Planilha de controle de temperatura e troca: óleo de fritura"},
        ]
    },
    {
        "number": 10,
        "title": "DOCUMENTAÇÃO",
        "score": 100.0, "pp": 68, "pr": 68, "nc": 0,
        "items": [
            {"status": "OK", "text": "AVCB ou CLCB: presente e válido"},
            {"status": "OK", "text": "Licença de Funcionamento: presente e válida"},
            {"status": "OK", "text": "Licença Sanitária: presente e válida"},
            {"status": "OK", "text": "Responsável Técnico: legalmente habilitado com contrato de prestação de serviços"},
            {"status": "OK", "text": "PCMSO e PGR: presente e válido"},
            {"status": "OK", "text": "FDS (FISPQ) de produtos de higienização: presente e disponível"},
            {"status": "OK", "text": "Higienização da caixa d'água: comprovante a cada 6 meses"},
            {"status": "OK", "text": "Análise da água caixa d'água: certificado de análise a cada 6 meses"},
            {"status": "OK", "text": "Filtro de água: comprovante de troca de filtro"},
            {"status": "OK", "text": "Controle de pragas: comprovante de execução e relatório de medidas preventivas"},
            {"status": "OK", "text": "Calibração: comprovante anual de equipamentos (termômetro, balança e outros)"},
            {"status": "OK", "text": "Manutenção: comprovante de manutenção preventiva e corretiva de equipamentos"},
            {"status": "OK", "text": "Comprovante de treinamento: conteúdo, carga horária e registro de participação"},
            {"status": "OK", "text": "ASO (amostragem): na admissão, presente e dentro da validade"},
            {"status": "OK", "text": "Auditoria de Boas Práticas (interna e fornecedor): realizada periodicamente"},
            {"status": "OK", "text": "Manual de Boas Práticas: presente, específico para o estabelecimento, com POPs"},
        ]
    },
]


# ─── GERADOR PRINCIPAL ─────────────────────────────────────────────────────────

def make_styles():
    base = getSampleStyleSheet()

    def ps(name, **kw):
        return ParagraphStyle(name, parent=base["Normal"], **kw)

    return {
        "h1": ps("H1", fontName="Helvetica-Bold", fontSize=16, textColor=NAVY,
                 spaceAfter=6, spaceBefore=12),
        "h2": ps("H2", fontName="Helvetica-Bold", fontSize=12, textColor=GRAY_800,
                 spaceAfter=4),
        "body": ps("Body", fontName="Helvetica", fontSize=9.5, textColor=GRAY_800,
                   spaceAfter=4, leading=14),
        "small": ps("Small", fontName="Helvetica", fontSize=8, textColor=GRAY_600,
                    spaceAfter=3),
        "caption": ps("Caption", fontName="Helvetica-Oblique", fontSize=8,
                      textColor=GRAY_400, alignment=TA_CENTER),
        "badge_green": ps("BadgeG", fontName="Helvetica-Bold", fontSize=10,
                          textColor=GREEN),
        "badge_red": ps("BadgeR", fontName="Helvetica-Bold", fontSize=10,
                        textColor=RED),
    }


def create_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=MR, leftMargin=ML,
        topMargin=MT, bottomMargin=MB,
        title="Auditoria de Boas Práticas V2 - NutriGestão"
    )

    story = []
    ST = make_styles()

    # ═══════════════════════════════════════════════════════════════════════
    # PÁGINA 1 — Capa / Sumário Executivo
    # ═══════════════════════════════════════════════════════════════════════

    story.append(CoverHeader(CONTENT_W))
    story.append(Spacer(1, 4*mm))

    # ── KPI Cards ─────────────────────────────────────────────────────────
    card_w = (CONTENT_W - 8*mm) / 3

    kpi_row = Table(
        [[
            KPICard("PONTOS REALIZADOS", "690", subtitle=f"de {REPORT['pp_total']} possíveis",
                    color=GREEN, width=card_w, height=30*mm,
                    show_bar=True, bar_pct=690/728),
            KPICard("NÃO CONFORMIDADES", REPORT["nc_total"], color=RED,
                    width=card_w, height=30*mm),
            KPICard("PLANOS DE AÇÃO", REPORT["planos_acao"], color=GRAY_400,
                    subtitle="Em aberto", width=card_w, height=30*mm),
        ]],
        colWidths=[card_w, card_w, card_w],
        rowHeights=[30*mm],
    )
    kpi_row.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 2*mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2*mm),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(kpi_row)
    story.append(Spacer(1, 5*mm))

    # ── Tabela de métricas ─────────────────────────────────────────────────
    story.append(Paragraph("RESULTADO POR CATEGORIA", ST["h1"]))

    header_row = ["Categoria", "PP", "PR", "NA", "NC", "Aproveitamento"]
    data = [header_row]

    for s in SECTIONS:
        if s["score"] is None:
            ap_val = "—"
        else:
            ap_val = f"{s['score']:.2f}%".replace(".", ",")

        nc_val = str(s["nc"]) if s["nc"] > 0 else "0"
        row = [
            f"{s['number']}. {s['title']}",
            str(s["pp"]) if s["pp"] else "—",
            str(s["pr"]) if s["pr"] else "—",
            "—",
            nc_val,
            ap_val,
        ]
        data.append(row)

    # Linha total
    data.append([
        "GERAL",
        str(REPORT["pp_total"]),
        str(REPORT["pr_total"]),
        "17",
        str(REPORT["nc_total"]),
        f"{REPORT['score_geral']:.2f}%".replace(".", ","),
    ])

    col_w = [CONTENT_W * 0.46, CONTENT_W * 0.08, CONTENT_W * 0.08,
              CONTENT_W * 0.08, CONTENT_W * 0.08, CONTENT_W * 0.22]

    tbl_style = TableStyle([
        # Header
        ("BACKGROUND",   (0, 0),  (-1, 0),  NAVY),
        ("TEXTCOLOR",    (0, 0),  (-1, 0),  WHITE),
        ("FONTNAME",     (0, 0),  (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0),  (-1, 0),  8.5),
        ("TOPPADDING",   (0, 0),  (-1, 0),  6),
        ("BOTTOMPADDING",(0, 0),  (-1, 0),  6),
        ("ALIGN",        (1, 0),  (-1, 0),  "CENTER"),
        # Body rows
        ("FONTNAME",     (0, 1),  (-1, -2), "Helvetica"),
        ("FONTSIZE",     (0, 1),  (-1, -2), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [WHITE, GRAY_100]),
        ("ALIGN",        (1, 1),  (-1, -2), "CENTER"),
        ("TOPPADDING",   (0, 1),  (-1, -2), 5),
        ("BOTTOMPADDING",(0, 1),  (-1, -2), 5),
        # Totals row
        ("BACKGROUND",   (0, -1), (-1, -1), HexColor("#1B2A4A")),
        ("TEXTCOLOR",    (0, -1), (-1, -1), WHITE),
        ("FONTNAME",     (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",     (0, -1), (-1, -1), 9),
        ("ALIGN",        (1, -1), (-1, -1), "CENTER"),
        ("TOPPADDING",   (0, -1), (-1, -1), 7),
        ("BOTTOMPADDING",(0, -1), (-1, -1), 7),
        # Grid
        ("GRID",         (0, 0),  (-1, -1), 0.3, GRAY_200),
        ("LINEBELOW",    (0, 0),  (-1, 0),  1,   ACCENT),
        # NC column red when >0
        ("TEXTCOLOR",    (4, 1),  (4, -2),  RED),
        ("FONTNAME",     (4, 1),  (4, -2),  "Helvetica-Bold"),
    ])

    tbl = Table(data, colWidths=col_w)
    tbl.setStyle(tbl_style)
    story.append(tbl)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # PÁGINAS SEGUINTES — Seções de avaliação
    # ═══════════════════════════════════════════════════════════════════════

    for sec in SECTIONS:
        # Section header
        story.append(SectionHeader(
            sec["number"], sec["title"],
            sec["score"], sec["nc"]
        ))
        story.append(Spacer(1, 3*mm))

        # Sub-info line
        if sec["pp"] is not None:
            info = Paragraph(
                f'<font color="#4B5563">PP: <b>{sec["pp"]}</b> &nbsp;·&nbsp; '
                f'PR: <b>{sec["pr"]}</b> &nbsp;·&nbsp; '
                f'NC: <b><font color="#B91C1C">{sec["nc"]}</font></b></font>',
                ST["small"]
            )
            story.append(info)
            story.append(Spacer(1, 2*mm))

        # Items
        build_items(story, sec["items"])
        story.append(Spacer(1, 4*mm))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # ÚLTIMA PÁGINA — Assinatura
    # ═══════════════════════════════════════════════════════════════════════

    story.append(Paragraph("ASSINATURA E ENCERRAMENTO", ST["h1"]))
    story.append(Spacer(1, 4*mm))

    sig_data = [
        [
            Paragraph("<b>Assinatura do Cliente</b>", ST["body"]),
            Paragraph("<b>Assinatura da Consultora</b>", ST["body"]),
        ],
        [
            Paragraph(" ", ST["body"]),
            Paragraph(" ", ST["body"]),
        ],
        [
            Paragraph("_________________________", ST["body"]),
            Paragraph("_________________________", ST["body"]),
        ],
        [
            Paragraph("Data: ___/___/______", ST["small"]),
            Paragraph("Nutricionista Responsável — Alana Barbosa\nalana.silva@eurofinslatam.com\n+55 11 9 8631-0191", ST["small"]),
        ]
    ]
    sig_tbl = Table(sig_data, colWidths=[CONTENT_W/2 - 5*mm, CONTENT_W/2 - 5*mm])
    sig_tbl.setStyle(TableStyle([
        ("TOPPADDING",   (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 12),
        ("LEFTPADDING",  (0, 0), (-1, -1), 5*mm),
        ("BACKGROUND",   (0, 0), (-1, 0),  GRAY_100),
        ("GRID",         (0, 0), (-1, -1), 0.5, GRAY_200),
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
    ]))
    story.append(sig_tbl)
    story.append(Spacer(1, 8*mm))

    # Footer note
    story.append(Paragraph(
        f'<font color="#9CA3AF">ID: {REPORT["id"]} &nbsp;·&nbsp; '
        f'Gerado em: {REPORT["data"]} &nbsp;·&nbsp; '
        f'Término: {REPORT["termino"]} &nbsp;·&nbsp; '
        f'NutriGestão SaaS</font>',
        ST["caption"]
    ))

    # Build
    doc.build(story)
    return output_path


if __name__ == "__main__":
    output = "/Users/Diego/GIT/Nutricao_stratosTech/checklist_auditoria_v2.pdf"
    print("Gerando PDF premium V2...")
    result = create_pdf(output)
    size_kb = os.path.getsize(result) / 1024
    print(f"PDF gerado: {result} ({size_kb:.1f} KB)")
