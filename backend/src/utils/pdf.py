"""PDF generation utilities using ReportLab."""

from datetime import date, datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as ReportLabImage, PageBreak,
)


def calculate_age(born) -> str:
    """Calculate age string from a date or date-string."""
    if not born:
        return "N/A"
    if isinstance(born, str):
        try:
            born = datetime.strptime(born, "%Y-%m-%d").date()
        except ValueError:
            return "N/A"
    today = date.today()
    years = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    months = (today.year - born.year) * 12 + today.month - born.month
    if years < 1:
        return f"{months} meses"
    months_remainder = months % 12
    return f"{years} años, {months_remainder} meses"


def _parse_html_to_flowables(html_content, style_normal, style_bullet):
    """Convert simple HTML (p, ul, ol) to ReportLab flowables."""
    from bs4 import BeautifulSoup

    flowables = []
    soup = BeautifulSoup(html_content, "html.parser")
    for element in soup.contents:
        if element.name == "p":
            text = str(element).replace("<p>", "").replace("</p>", "")
            flowables.append(Paragraph(text, style_normal))
        elif element.name == "ul":
            for li in element.find_all("li"):
                text = str(li).replace("<li>", "").replace("</li>", "")
                flowables.append(Paragraph(f"• {text}", style_bullet))
        elif element.name == "ol":
            for idx, li in enumerate(element.find_all("li"), 1):
                text = str(li).replace("<li>", "").replace("</li>", "")
                flowables.append(Paragraph(f"{idx}. {text}", style_bullet))
        elif isinstance(element, str) and element.strip():
            flowables.append(Paragraph(element, style_normal))
    return flowables


def _get_styles():
    """Return a dict of common PDF styles."""
    styles = getSampleStyleSheet()
    return {
        "normal": styles["Normal"],
        "title": ParagraphStyle("Title", parent=styles["Heading1"], fontSize=12, alignment=1, spaceAfter=2),
        "subtitle": ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=9, alignment=1, textColor=colors.grey),
        "label": ParagraphStyle("Label", parent=styles["Normal"], fontSize=8, fontName="Helvetica-Bold"),
        "value": ParagraphStyle("Value", parent=styles["Normal"], fontSize=8),
        "med_name": ParagraphStyle("MedName", parent=styles["Normal"], fontSize=9, fontName="Helvetica-Bold"),
        "med_detail": ParagraphStyle("MedDetail", parent=styles["Normal"], fontSize=9, leftIndent=10),
        "bullet": ParagraphStyle("Bullet", parent=styles["Normal"], fontSize=9, leftIndent=15, firstLineIndent=0, spaceBefore=1, spaceAfter=1, bulletIndent=5),
        "section_title": ParagraphStyle("SectionTitle", parent=styles["Heading1"], fontSize=12, spaceBefore=10, spaceAfter=5, textColor=colors.darkblue),
        "caption": ParagraphStyle("Caption", parent=styles["Normal"], fontSize=9, alignment=1, fontName="Helvetica-Oblique", spaceBefore=2),
    }


def create_prescription_pdf(consulta: dict, paciente: dict, signos: dict, medicamentos: list) -> BytesIO:
    """Generate a prescription PDF (half-letter landscape)."""
    buffer = BytesIO()
    PAGE_SIZE = (8.5 * inch, 5.5 * inch)

    doc = SimpleDocTemplate(
        buffer, pagesize=PAGE_SIZE,
        rightMargin=0.5 * inch, leftMargin=0.5 * inch,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch,
        title=f"Receta - {paciente.get('nombre', '')} {paciente.get('a_paterno', '')}",
    )

    s = _get_styles()
    elements = []

    # Header
    elements.append(Paragraph("CONSULTORIO MÉDICO", s["title"]))
    elements.append(Paragraph("Dra. Miriam Vargas - Ginecología y Obstetricia", s["subtitle"]))
    elements.append(Spacer(1, 0.1 * inch))

    # Patient info
    age_str = calculate_age(paciente.get("fecha_nacimiento"))
    weight = f"{signos.get('peso', 'N/A')} kg" if signos and signos.get("peso") else "N/A"
    height = f"{signos.get('talla', 'N/A')} cm" if signos and signos.get("talla") else "N/A"
    temp = f"{signos.get('temperatura', 'N/A')} °C" if signos and signos.get("temperatura") else "N/A"
    date_str = datetime.now().strftime("%d/%m/%Y")

    nombre_completo = f"{paciente.get('nombre', '')} {paciente.get('a_paterno', '')} {paciente.get('a_materno', '') or ''}".strip()

    patient_data = [
        [
            Paragraph("<b>Paciente:</b>", s["label"]),
            Paragraph(nombre_completo, s["value"]),
            Paragraph("<b>Edad:</b>", s["label"]),
            Paragraph(age_str, s["value"]),
            Paragraph("<b>Fecha:</b>", s["label"]),
            Paragraph(date_str, s["value"]),
        ],
        [
            Paragraph("<b>Peso:</b>", s["label"]),
            Paragraph(weight, s["value"]),
            Paragraph("<b>Talla:</b>", s["label"]),
            Paragraph(height, s["value"]),
            Paragraph("<b>Temp:</b>", s["label"]),
            Paragraph(temp, s["value"]),
        ],
    ]
    col_widths = [0.6 * inch, 2.5 * inch, 0.5 * inch, 1.2 * inch, 0.5 * inch, 1.2 * inch]
    patient_table = Table(patient_data, colWidths=col_widths)
    patient_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, colors.grey),
    ]))
    elements.append(patient_table)
    elements.append(Spacer(1, 0.15 * inch))

    # Medications
    elements.append(Paragraph("INDICACIONES MÉDICAS", s["med_name"]))
    med_data = []
    if medicamentos:
        for idx, med in enumerate(medicamentos, 1):
            med_text = f"<b>{idx}. {med.get('nombre', '')}</b>"
            details = []
            if med.get("dosis"):
                details.append(f"Dosis: {med['dosis']}")
            if med.get("frecuencia"):
                details.append(f"Frec: {med['frecuencia']}")
            if med.get("duracion"):
                details.append(f"Dur: {med['duracion']}")
            detail_text = ", ".join(details)
            if med.get("comentarios"):
                detail_text += f" ({med['comentarios']})"
            med_data.append([Paragraph(med_text, s["normal"]), Paragraph(detail_text, s["normal"])])
    else:
        med_data.append([Paragraph("Sin medicamentos recetados.", s["normal"]), ""])

    med_table = Table(med_data, colWidths=[2.5 * inch, 5 * inch])
    med_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(med_table)

    # Treatment notes
    treatment_text = consulta.get("tratamiento") or ""
    if treatment_text:
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph("Indicaciones Generales:", s["med_name"]))
        if "<p>" in treatment_text or "<ul>" in treatment_text or "<ol>" in treatment_text:
            elements.extend(_parse_html_to_flowables(treatment_text, s["med_detail"], s["bullet"]))
        else:
            elements.append(Paragraph(treatment_text, s["med_detail"]))

    # Footer
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph("_" * 40, s["normal"]))
    elements.append(Paragraph("Firma del Médico", s["normal"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def create_colposcopy_pdf(consulta: dict, paciente: dict, colposcopia: dict, image_urls: dict) -> BytesIO:
    """Generate a colposcopy report PDF (letter size).

    Page 1: 5cm top space (for custom letterhead) + patient info + hallazgos colposcopicos.
    Page 2: first 4 images in a 2x2 grid with captions.
    """
    import requests

    import os

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        rightMargin=1.5 * cm, leftMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title=f"Colposcopía - {paciente.get('nombre', '')} {paciente.get('a_paterno', '')}",
    )

    styles = getSampleStyleSheet()
    style_field_label = ParagraphStyle("FieldLabel", parent=styles["Normal"], fontSize=11, fontName="Helvetica-Bold")
    style_field_value = ParagraphStyle("FieldValue", parent=styles["Normal"], fontSize=11)
    style_section = ParagraphStyle("SectionHdr", parent=styles["Normal"], fontSize=12, fontName="Helvetica-Bold", spaceAfter=4, spaceBefore=2)
    style_caption = ParagraphStyle("ImgCaption", parent=styles["Normal"], fontSize=12, alignment=1, fontName="Helvetica-Oblique", spaceBefore=3)

    elements = []

    # ── Encabezado con imagen ─────────────────────────────────────────────────
    img_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'documentation', 'encabezado.png'))
    if os.path.exists(img_path):
        hdr_img = ReportLabImage(img_path)
        aspect = hdr_img.imageWidth / float(hdr_img.imageHeight)
        max_h = 3 * cm
        usable_w = letter[0] - 3 * cm  # page width minus left+right margins
        h = max_h
        w = h * aspect
        if w > usable_w:
            w = usable_w
            h = w / aspect
        hdr_img.drawWidth = w
        hdr_img.drawHeight = h
        hdr_img.hAlign = 'CENTER'
        elements.append(hdr_img)
        elements.append(Spacer(1, 0.3 * cm))

    style_doc_title = ParagraphStyle("DocTitle", parent=styles["Normal"], fontSize=14, fontName="Helvetica-Bold", alignment=1, spaceAfter=6)
    elements.append(Paragraph("Colposcopia", style_doc_title))
    elements.append(Spacer(1, 0.2 * cm))

    # ── Página 1 ─────────────────────────────────────────────────────────────

    # Patient name and date on the same line
    nombre_completo = f"{paciente.get('nombre', '')} {paciente.get('a_paterno', '')} {paciente.get('a_materno', '') or ''}".strip()
    fecha_raw = consulta.get("fecha") or consulta.get("created_at") or ""
    fecha_str = ""
    if fecha_raw:
        try:
            _meses = ["enero","febrero","marzo","abril","mayo","junio",
                      "julio","agosto","septiembre","octubre","noviembre","diciembre"]
            _d = datetime.strptime(fecha_raw[:10], "%Y-%m-%d")
            fecha_str = f"{_d.day} de {_meses[_d.month - 1]} de {_d.year}"
        except ValueError:
            fecha_str = fecha_raw[:10]

    header_data = [[
        Paragraph(f"<b>Nombre:</b> {nombre_completo}", style_field_value),
        Paragraph(f"<b>Fecha:</b> {fecha_str}", style_field_value),
    ]]
    header_table = Table(header_data, colWidths=[10 * cm, 8.5 * cm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.grey),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.4 * cm))

    # Hallazgos Colposcopicos section
    elements.append(Paragraph("Hallazgos Colposcopicos:", style_section))

    hc_fields = [
        ("Cervix", colposcopia.get("hc_cervix") or ""),
        ("Colposcopía", colposcopia.get("hc_colposcopia") or ""),
        ("Epitelio Acetoblanco", colposcopia.get("hc_epitelio_acetoblanco") or ""),
        ("Puntilleo", colposcopia.get("hc_puntilleo") or ""),
        ("Mosaico", colposcopia.get("hc_mosaico") or ""),
        ("Vasos Atípicos", colposcopia.get("hc_vasos_atipicos") or ""),
        ("Tumor", colposcopia.get("hc_tumor") or ""),
        ("Localización de la lesión", colposcopia.get("hc_localizacion_lesion") or ""),
        ("Extensión a fondos de saco", colposcopia.get("hc_extension_fondos_saco") or ""),
        ("Metaplasia", colposcopia.get("hc_metaplasia") or ""),
        ("Eversión Glandular", colposcopia.get("hc_eversion_glandular") or ""),
        ("Atrofia Epitelial", colposcopia.get("hc_atrofia_epitelial") or ""),
        ("Reacción Inflamatoria", colposcopia.get("hc_reaccion_inflamatoria") or ""),
        ("Exudado Vaginal", colposcopia.get("hc_exudado_vaginal") or ""),
        ("ADD", colposcopia.get("hc_add") or ""),
        ("Diagnóstico Colposcópico", colposcopia.get("hc_diagnostico_colposcopico") or ""),
    ]

    hc_table_data = [
        [Paragraph(label.upper(), style_field_label), Paragraph(value, style_field_value)]
        for label, value in hc_fields
    ]
    hc_table = Table(hc_table_data, colWidths=[6 * cm, 12 * cm])
    hc_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.lightgrey),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.Color(0.96, 0.96, 0.98)]),
    ]))
    elements.append(hc_table)

    # ── Página 2 ─────────────────────────────────────────────────────────────
    elements.append(PageBreak())

    default_captions = ["Simple", "Acido Acético", "Shiller", "Vulvoscopia"]
    img_w = 8.5 * cm
    img_h = 7.5 * cm

    # Build 4 cells: each is [image_or_placeholder, caption_paragraph]
    cells = []
    for i in range(4):
        url = image_urls.get(f"foto_{i + 1}_url")
        caption_text = colposcopia.get(f"comentario_{i + 1}") or default_captions[i]
        cap = Paragraph(caption_text, style_caption)
        if url:
            try:
                res = requests.get(url, stream=True, timeout=10)
                if res.status_code == 200:
                    img_bytes = BytesIO(res.content)
                    img = ReportLabImage(img_bytes)
                    aspect = img.imageWidth / float(img.imageHeight)
                    w, h = img_w, img_w / aspect
                    if h > img_h:
                        h = img_h
                        w = img_h * aspect
                    img.drawWidth = w
                    img.drawHeight = h
                    cells.append([img, cap])
                else:
                    cells.append([Paragraph("[Sin imagen]", style_caption), cap])
            except Exception:
                cells.append([Paragraph("[Error cargando imagen]", style_caption), cap])
        else:
            cells.append([Paragraph("[Sin imagen]", style_caption), cap])

    # 2x2 grid: rows are [img_row, caption_row] pairs
    img_row_1 = [cells[0][0], cells[1][0]]
    cap_row_1 = [cells[0][1], cells[1][1]]
    img_row_2 = [cells[2][0], cells[3][0]]
    cap_row_2 = [cells[2][1], cells[3][1]]

    grid_data = [img_row_1, cap_row_1, img_row_2, cap_row_2]
    col_w = img_w + 0.5 * cm
    grid_table = Table(grid_data, colWidths=[col_w, col_w])
    grid_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, 0), "BOTTOM"),
        ("VALIGN", (0, 1), (-1, 1), "TOP"),
        ("VALIGN", (0, 2), (-1, 2), "BOTTOM"),
        ("VALIGN", (0, 3), (-1, 3), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, colors.lightgrey),
    ]))
    elements.append(grid_table)

    def _draw_footer(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.drawRightString(
            letter[0] - 1.5 * cm,
            1 * cm,
            "DRA. MIRIAN VALERO"
        )
        canvas.restoreState()

    doc.build(elements, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    buffer.seek(0)
    return buffer
