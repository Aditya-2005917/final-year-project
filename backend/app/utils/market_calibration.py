from __future__ import annotations
import pandas as pd
import numpy as np
BASE_UPLIFT = 1.06
LOCALITY_UPLIFT = {
    "Badlapur": 1.38,
    "Badlapur East": 1.40,
    "Badlapur West": 1.36,
    "Ambernath": 1.35,
    "Ambernath East": 1.36,
    "Ambernath West": 1.34,
    "Kalyan": 1.22,
    "Kalyan East": 1.22,
    "Kalyan West": 1.22,
    "Dombivli": 1.20,
    "Dombivali": 1.20,
    "Titwala": 1.28,
    "Ulhasnagar": 1.25,
    "Mumbra": 1.18,
    "Bhiwandi": 1.20,
    "Virar": 1.18,
    "Vasai": 1.18,
    "Nala Sopara": 1.18,
    "Nallasopara": 1.18,
    "Naigaon": 1.16,
    "Mira Road": 1.14,
    "Bhayandar": 1.14,
    "Panvel": 1.16,
    "Kharghar": 1.12,
    "Taloja": 1.18,
    "Ulwe": 1.16,
    "Kamothe": 1.15,
    "Kalamboli": 1.15,

    # ---------- Mid suburbs ----------
    "Thane": 1.10,
    "Thane West": 1.10,
    "Thane East": 1.10,
    "Mulund": 1.09,
    "Mulund East": 1.09,
    "Mulund West": 1.09,
    "Ghatkopar": 1.08,
    "Ghatkopar East": 1.08,
    "Ghatkopar West": 1.08,
    "Andheri": 1.08,
    "Andheri East": 1.08,
    "Andheri West": 1.10,
    "Powai": 1.10,
    "Vashi": 1.09,
    "Nerul": 1.09,
    "Airoli": 1.09,
    "Chembur": 1.10,
    "Goregaon": 1.08,
    "Goregaon East": 1.08,
    "Goregaon West": 1.08,
    "Malad": 1.08,
    "Malad East": 1.08,
    "Malad West": 1.08,
    "Kandivali": 1.08,
    "Kandivali East": 1.08,
    "Kandivali West": 1.08,
    "Borivali": 1.08,
    "Borivali East": 1.08,
    "Borivali West": 1.08,
    "Dahisar": 1.07,

    # ---------- Central / South-Central (Matunga family needs explicit keys) ----------
    "Matunga": 1.12,
    "Matunga East": 1.13,
    "Matunga West": 1.12,
    "Matunga South": 1.12,
    "Dadar": 1.12,
    "Dadar East": 1.12,
    "Dadar West": 1.13,
    "Sion": 1.10,
    "Wadala": 1.10,
    "Parel": 1.12,
    "Lower Parel": 1.14,
    "Prabhadevi": 1.14,
    "Mahim": 1.12,
    "Byculla": 1.10,
    "Mazgaon": 1.09,
    "Sewri": 1.09,

    # ---------- Western prime ----------
    "Bandra": 1.12,
    "Bandra East": 1.12,
    "Bandra West": 1.14,
    "Khar": 1.12,
    "Khar West": 1.12,
    "Santacruz": 1.10,
    "Santacruz East": 1.10,
    "Santacruz West": 1.12,
    "Vile Parle": 1.10,
    "Vile Parle East": 1.10,
    "Vile Parle West": 1.12,
    "Juhu": 1.13,
    "Lokhandwala": 1.10,
    "Oshiwara": 1.10,
    "Versova": 1.11,

    # ---------- South Mumbai ----------
    "Worli": 1.12,
    "Colaba": 1.10,
    "Cuffe Parade": 1.10,
    "Breach Candy": 1.12,
    "Malabar Hill": 1.11,
    "Marine Drive": 1.10,
    "Nariman Point": 1.08,
    "Pedder Road": 1.13,
    "Tardeo": 1.11,
    "Mahalaxmi": 1.12,
    "Walkeshwar": 1.11,
    "Bkc (Bandra-Kurla)": 1.12,
    "Bkc": 1.12,
}


def _normalize(name: str) -> str:
    if not name:
        return ""
    n = str(name).strip().title()
    aliases = {
        "Dombivali": "Dombivli",
        "Nallasopara": "Nala Sopara",
        "Nalasopara": "Nala Sopara",
        "Ville Parle": "Vile Parle",
        "Koparkhairane": "Koper Khairane",
        "Kopar Khairane": "Koper Khairane",
        "Bkc (Bandra-Kurla)": "Bkc (Bandra-Kurla)",
        "Bkc": "Bkc (Bandra-Kurla)",
        "Bandra Kurla Complex": "Bkc (Bandra-Kurla)",
        "Matunga East": "Matunga East",
        "Matunga West": "Matunga West",
        "Matunga South": "Matunga South",
    }
    return aliases.get(n, n)


def get_uplift(locality: str) -> float:
    loc = _normalize(locality)
    factor = LOCALITY_UPLIFT.get(loc)
    if factor is None and " " in loc:
        # Try first token, then base without East/West/South
        factor = LOCALITY_UPLIFT.get(loc.split()[0])
        if factor is None:
            base = (
                loc.replace(" East", "")
                .replace(" West", "")
                .replace(" South", "")
                .replace(" North", "")
                .strip()
            )
            factor = LOCALITY_UPLIFT.get(base)
    return BASE_UPLIFT * (factor if factor is not None else 1.05)


get_uplift_factor = get_uplift


def apply_uplift(price_lakhs: float, locality: str) -> float:
    try:
        p = float(price_lakhs)
    except (TypeError, ValueError):
        return 0.0
    if p <= 0:
        return 0.0
    return round(p * get_uplift(locality), 2)


apply_market_uplift = apply_uplift


def format_price(lakhs: float) -> str:
    if lakhs is None or not np.isfinite(lakhs) or lakhs <= 0:
        return "—"
    if lakhs >= 100:
        return f"₹{lakhs / 100:.2f} Cr"
    return f"₹{lakhs:.1f} L"


format_price_display = format_price


def filter_outliers(
    df: pd.DataFrame,
    price_col: str = "price",
    area_col: str = "area_sqft",
    max_ratio: float = 2.0,
    min_ratio: float = 0.45,
    hard_min_ppsf: float = 3200,
    hard_max_ppsf: float = 95000,
) -> pd.DataFrame:
    """Drop extreme low/high outliers so comps stay realistic."""
    if df is None or df.empty:
        return df
    if price_col not in df.columns or area_col not in df.columns:
        return df

    out = df.copy()
    area = out[area_col].replace(0, np.nan)
    out["_pps"] = (out[price_col] * 100000.0) / area
    out = out[(out["_pps"] >= hard_min_ppsf) & (out["_pps"] <= hard_max_ppsf)]
    if out.empty:
        return out.drop(columns=["_pps"], errors="ignore")

    median_pps = out["_pps"].median()
    if not np.isfinite(median_pps) or median_pps <= 0:
        return out.drop(columns=["_pps"], errors="ignore")

    lo = median_pps * min_ratio
    hi = median_pps * max_ratio
    filtered = out[(out["_pps"] >= lo) & (out["_pps"] <= hi)]
    return filtered.drop(columns=["_pps"], errors="ignore")