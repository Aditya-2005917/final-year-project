# locality_config.py

import re


# ============================================================
# CANONICAL MMR LOCALITIES
# ============================================================

CANONICAL_LOCALITIES = [
    # Mumbai
    "Andheri",
    "Andheri East",
    "Andheri West",
    "Bandra",
    "Bandra East",
    "Bandra West",
    "Bhandup",
    "Bhandup East",
    "Bhandup West",
    "Borivali",
    "Borivali East",
    "Borivali West",
    "Byculla",
    "Chembur",
    "Dadar",
    "Dahisar",
    "Deonar",
    "Ghatkopar",
    "Ghatkopar East",
    "Ghatkopar West",
    "Goregaon",
    "Goregaon East",
    "Goregaon West",
    "Jogeshwari",
    "Juhu",
    "Kandivali",
    "Kandivali East",
    "Kandivali West",
    "Khar",
    "Kurla",
    "Lower Parel",
    "Mahim",
    "Malad",
    "Malad East",
    "Malad West",
    "Mazagaon",
    "Mulund",
    "Mulund East",
    "Mulund West",
    "Nahur",
    "Parel",
    "Powai",
    "Prabhadevi",
    "Santacruz",
    "Santacruz East",
    "Santacruz West",
    "Sion",
    "Vikhroli",
    "Vikhroli East",
    "Vikhroli West",
    "Vile Parle",
    "Vile Parle East",
    "Vile Parle West",
    "Wadala",
    "Worli",

    # Thane
    "Ambernath",
    "Badlapur",
    "Bhiwandi",
    "Dombivli",
    "Kalyan",
    "Kalwa",
    "Kasarvadavali",
    "Mumbra",
    "Shil Phata",
    "Thane",
    "Thane East",
    "Thane West",
    "Thakurli",
    "Titwala",
    "Ulhasnagar",
    "Vangani",

    # Navi Mumbai / Raigad
    "Airoli",
    "Ghansoli",
    "Kamothe",
    "Kalamboli",
    "Kharghar",
    "Koper Khairane",
    "Nerul",
    "Panvel",
    "Sanpada",
    "Seawoods",
    "Taloja",
    "Ulwe",
    "Vashi",

    # Western MMR
    "Bhayandar",
    "Mira Road",
    "Naigaon",
    "Nala Sopara",
    "Vasai",
    "Virar",

    # Outer MMR
    "Karjat",
    "Palghar",
    "Shelu",
]


# ============================================================
# REGION
# ============================================================

REGION_MAP = {
    # Mumbai
    **{
        locality: "Mumbai"
        for locality in [
            "Andheri",
            "Andheri East",
            "Andheri West",
            "Bandra",
            "Bandra East",
            "Bandra West",
            "Bhandup",
            "Bhandup East",
            "Bhandup West",
            "Borivali",
            "Borivali East",
            "Borivali West",
            "Byculla",
            "Chembur",
            "Dadar",
            "Dahisar",
            "Deonar",
            "Ghatkopar",
            "Ghatkopar East",
            "Ghatkopar West",
            "Goregaon",
            "Goregaon East",
            "Goregaon West",
            "Jogeshwari",
            "Juhu",
            "Kandivali",
            "Kandivali East",
            "Kandivali West",
            "Khar",
            "Kurla",
            "Lower Parel",
            "Mahim",
            "Malad",
            "Malad East",
            "Malad West",
            "Mazagaon",
            "Mulund",
            "Mulund East",
            "Mulund West",
            "Nahur",
            "Parel",
            "Powai",
            "Prabhadevi",
            "Santacruz",
            "Santacruz East",
            "Santacruz West",
            "Sion",
            "Vikhroli",
            "Vikhroli East",
            "Vikhroli West",
            "Vile Parle",
            "Vile Parle East",
            "Vile Parle West",
            "Wadala",
            "Worli",
        ]
    },

    # Thane
    **{
        locality: "Thane"
        for locality in [
            "Ambernath",
            "Badlapur",
            "Bhiwandi",
            "Dombivli",
            "Kalyan",
            "Kalwa",
            "Kasarvadavali",
            "Mumbra",
            "Shil Phata",
            "Thane",
            "Thane East",
            "Thane West",
            "Thakurli",
            "Titwala",
            "Ulhasnagar",
            "Vangani",
        ]
    },

    # Navi Mumbai
    **{
        locality: "Navi Mumbai"
        for locality in [
            "Airoli",
            "Ghansoli",
            "Kamothe",
            "Kalamboli",
            "Kharghar",
            "Koper Khairane",
            "Nerul",
            "Panvel",
            "Sanpada",
            "Seawoods",
            "Taloja",
            "Ulwe",
            "Vashi",
        ]
    },

    # Mira-Bhayandar
    "Bhayandar": "Mira-Bhayandar",
    "Mira Road": "Mira-Bhayandar",

    # Vasai-Virar
    "Naigaon": "Vasai-Virar",
    "Nala Sopara": "Vasai-Virar",
    "Vasai": "Vasai-Virar",
    "Virar": "Vasai-Virar",

    # Palghar
    "Palghar": "Palghar",

    # Raigad
    "Karjat": "Raigad",
    "Shelu": "Raigad",
}


# ============================================================
# BASE LOCALITY
#
# East/West variants are retained as separate model categories.
# Base locality is used only for fallback comparables.
# ============================================================

BASE_LOCALITY_MAP = {}

for locality in CANONICAL_LOCALITIES:
    if locality.endswith(" East"):
        BASE_LOCALITY_MAP[locality] = locality[:-5]

    elif locality.endswith(" West"):
        BASE_LOCALITY_MAP[locality] = locality[:-5]

    else:
        BASE_LOCALITY_MAP[locality] = locality


# ============================================================
# EXPLICIT ALIASES
# ============================================================

LOCALITY_ALIASES = {
    # Ambernath
    "ambarnath": "Ambernath",
    "ambernath east": "Ambernath",
    "ambernath west": "Ambernath",

    # Taloja
    "taloje": "Taloja",

    # Panvel
    "old panvel": "Panvel",

    # Nala Sopara
    "nallasopara": "Nala Sopara",
    "nallasopara w": "Nala Sopara",
    "nala sopara w": "Nala Sopara",
    "nala sopara west": "Nala Sopara",
    "nala sopara east": "Nala Sopara",

    # Belapur
    "cbd belapur": "Belapur",
    "central business district belapur": "Belapur",

    # Ghansoli
    "ghansoli gaon": "Ghansoli",

    # Saki Naka
    "sakinaka": "Saki Naka",
    "saki naka": "Saki Naka",

    # Panch Pakhadi
    "panch pakhdi": "Panch Pakhadi",
    "panch pakhadi": "Panch Pakhadi",

    # Andheri
    "andheri e": "Andheri East",
    "andheri w": "Andheri West",
    "andheri east": "Andheri East",
    "andheri west": "Andheri West",

    # Thane
    "thane e": "Thane East",
    "thane w": "Thane West",
    "thane east": "Thane East",
    "thane west": "Thane West",

    # Ghatkopar
    "ghatkopar e": "Ghatkopar East",
    "ghatkopar w": "Ghatkopar West",

    # Bandra
    "bandra e": "Bandra East",
    "bandra w": "Bandra West",

    # Bhandup
    "bhandup e": "Bhandup East",
    "bhandup w": "Bhandup West",

    # Borivali
    "borivali e": "Borivali East",
    "borivali w": "Borivali West",

    # Goregaon
    "goregaon e": "Goregaon East",
    "goregaon w": "Goregaon West",

    # Kandivali
    "kandivali e": "Kandivali East",
    "kandivali w": "Kandivali West",

    # Malad
    "malad e": "Malad East",
    "malad w": "Malad West",

    # Mulund
    "mulund e": "Mulund East",
    "mulund w": "Mulund West",

    # Santacruz
    "santacruz e": "Santacruz East",
    "santacruz w": "Santacruz West",

    # Vikhroli
    "vikhroli e": "Vikhroli East",
    "vikhroli w": "Vikhroli West",

    # Vile Parle
    "vile parle e": "Vile Parle East",
    "vile parle w": "Vile Parle West",

    # Mira Road
    "mira road east": "Mira Road",
    "mira road west": "Mira Road",

    # Naigaon
    "naigaon east": "Naigaon",
    "naigaon west": "Naigaon",
}


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(value):
    if value is None:
        return ""

    text = str(value).strip().lower()

    text = text.replace("_", " ")
    text = text.replace("-", " ")
    text = text.replace("/", " ")

    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# LOCALITY NORMALIZATION
#
# IMPORTANT:
# We deliberately do NOT perform aggressive fuzzy matching.
# A wrong locality is worse than an unknown locality.
# ============================================================

def normalize_locality(value):
    key = normalize_text(value)

    if not key:
        return "Unknown"

    if key in LOCALITY_ALIASES:
        return LOCALITY_ALIASES[key]

    for locality in CANONICAL_LOCALITIES:
        if key == normalize_text(locality):
            return locality

    # Safe title-case fallback.
    # Unknown localities are NOT silently mapped.
    return str(value).strip().title()


def base_locality(locality):
    locality = normalize_locality(locality)
    return BASE_LOCALITY_MAP.get(locality, locality)


def region_for_locality(locality):
    locality = normalize_locality(locality)
    return REGION_MAP.get(locality, "MMR")


def is_known_locality(locality):
    return normalize_locality(locality) in CANONICAL_LOCALITIES


def locality_group(locality):
    """
    Hierarchical locality identifier.

    East/West variants remain separate at the exact level.
    """
    locality = normalize_locality(locality)

    return {
        "exact": locality,
        "base": base_locality(locality),
        "region": region_for_locality(locality),
    }