import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def generate_valuation_pdf(property_data, valuations):
    """
    Generates a clean, professional PDF valuation report in-memory.
    Returns a BytesIO buffer ready for download or email attachment.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    elements = []
    styles = getSampleStyleSheet()

    # ---- Color palette ----
    primary_color = colors.HexColor("#1A365D")
    secondary_color = colors.HexColor("#2B6CB0")
    light_bg = colors.HexColor("#F7FAFC")
    text_dark = colors.HexColor("#2D3748")
    accent_color = colors.HexColor("#319795")
    border_color = colors.HexColor("#E2E8F0")

    # ---- Typography ----
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=primary_color,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#718096"),
        spaceAfter=12
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=secondary_color,
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=text_dark
    )

    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#A0AEC0")
    )

    # =========================================================
    # 1. HEADER
    # =========================================================
    elements.append(Paragraph("AURA Real Estate Intelligence", title_style))
    elements.append(Paragraph(
        f"Automated Property Valuation Report  •  Generated on {datetime.now().strftime('%d %b %Y, %I:%M %p')}",
        subtitle_style
    ))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=14))

    # =========================================================
    # 2. PROPERTY SPECIFICATIONS
    # =========================================================
    elements.append(Paragraph("Property Specifications", heading_style))

    locality = property_data.get("locality", "N/A")
    bhk = property_data.get("bhk") or property_data.get("bhk_size") or "N/A"
    area = property_data.get("area") or property_data.get("area_sqft") or "N/A"
    furnishing = property_data.get("furnishing") or property_data.get("furnishing_status") or "N/A"
    prop_type = property_data.get("property_type", "Apartment")

    prop_details = [
        [
            Paragraph(f"<b>Locality:</b> {locality}", body_style),
            Paragraph(f"<b>Configuration:</b> {bhk} BHK", body_style)
        ],
        [
            Paragraph(f"<b>Carpet Area:</b> {area} Sq.Ft.", body_style),
            Paragraph(f"<b>Furnishing:</b> {furnishing}", body_style)
        ],
        [
            Paragraph(f"<b>Property Type:</b> {prop_type}", body_style),
            Paragraph(f"<b>Report Type:</b> Full Valuation", body_style)
        ]
    ]

    prop_table = Table(prop_details, colWidths=[260, 260])
    prop_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_bg),
        ("BOX", (0, 0), (-1, -1), 0.5, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#EDF2F7")),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(prop_table)
    elements.append(Spacer(1, 12))

    # =========================================================
    # 3. VALUATION BREAKDOWN
    # =========================================================
    elements.append(Paragraph("Estimated Market Valuation Breakdown", heading_style))
    elements.append(Paragraph(
        "Based on current micro-market trends, historical transactions, and asset configuration.",
        body_style
    ))
    elements.append(Spacer(1, 6))

    valuation_data = [
        [
            Paragraph("<b>Valuation Tier</b>", body_style),
            Paragraph("<b>Estimated Price Range</b>", body_style),
            Paragraph("<b>Market Sentiment</b>", body_style)
        ]
    ]

    sentiment_map = {
        "base_price": "Baseline Estimate",
        "Base_Price": "Baseline Estimate",
        "Normal": "Fair Market Value",
        "normal": "Fair Market Value",
        "Premium": "Premium Positioning",
        "premium": "Premium Positioning",
        "Premium_Brand": "Brand / Luxury Expectation",
        "brand": "Brand / Luxury Expectation",
        "Brand-New": "Brand / Luxury Expectation"
    }

    for tier, ranges in valuations.items():
        sentiment = sentiment_map.get(tier, "Market Estimate")

        if isinstance(ranges, (list, tuple)) and len(ranges) >= 2:
            val_min = str(ranges[0]).replace("₹", "").strip()
            val_max = str(ranges[1]).replace("₹", "").strip()
            formatted_range = f"Rs. {val_min} – Rs. {val_max}"
        else:
            val_single = str(ranges).replace("₹", "").strip()
            formatted_range = f"Rs. {val_single}"

        display_tier = tier.replace("_", " ").title()

        valuation_data.append([
            Paragraph(f"<b>{display_tier}</b>", body_style),
            Paragraph(formatted_range, body_style),
            Paragraph(sentiment, body_style)
        ])

    val_table = Table(valuation_data, colWidths=[150, 190, 180])
    val_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EBF8FF")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, border_color),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(val_table)
    elements.append(Spacer(1, 14))

    # =========================================================
    # 4. MARKET INSIGHTS
    # =========================================================
    elements.append(Paragraph("Micro-Market Insights & Recommendations", heading_style))

    insight_text = (
        "• <b>Liquidity Analysis:</b> Properties in this micro-market typically transition within "
        "45–60 days under standard market conditions.<br/><br/>"
        "• <b>Infrastructure Impact:</b> Ongoing civic developments and transit connectivity in the "
        "vicinity are projected to support medium-term capital appreciation.<br/><br/>"
        "• <b>Negotiation Buffer:</b> It is recommended to keep a 5–8% negotiation buffer over the "
        "expected valuation tier during discussions.<br/><br/>"
        "• <b>Data Confidence:</b> Valuation is derived from historical MMR transaction patterns "
        "and comparable asset configurations."
    )
    elements.append(Paragraph(insight_text, body_style))
    elements.append(Spacer(1, 22))

    # =========================================================
    # 5. FOOTER / DISCLAIMER
    # =========================================================
    elements.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#CBD5E0"), spaceAfter=8))
    elements.append(Paragraph(
        "<b>Disclaimer:</b> This document is computer-generated by the AURA Estate Intelligence Engine "
        "for analytical reference only. Final transaction values may vary depending on physical inspection, "
        "legal due diligence, and prevailing market conditions at the time of sale.",
        small_style
    ))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer