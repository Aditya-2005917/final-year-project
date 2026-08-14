"""
AURA Chat Service – improved intent detection + ML valuation + better comps.
"""
import os
import re
import pandas as pd
from groq import Groq
from app.database_setup import get_db_connection
from app.services.email_report_service import generate_pdf_report_bytes, send_valuation_email

try:
    from app.utils.market_calibration import apply_market_uplift, format_price_display
except ImportError:
    try:
        from market_calibration import apply_market_uplift, format_price_display
    except ImportError:
        def apply_market_uplift(p, loc):
            return float(p or 0) * 1.10
        def format_price_display(lakhs):
            return f"₹{lakhs/100:.2f} Cr" if lakhs >= 100 else f"₹{lakhs:.1f} L"

try:
    from app.services.model_service import model_service
except ImportError:
    model_service = None

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

SYSTEM_PROMPT = """
You are **AURA**, a seasoned Mumbai Metropolitan Region (MMR) property broker and market advisor.

Persona:
- Speak like a helpful local broker: warm, practical, direct, never salesy-spammy.
- You know micro-markets across Mumbai, Thane, Navi Mumbai, Mira-Bhayandar and Vasai-Virar.
- You guide buyers on 1/2/3/4 BHK apartments, villas, independent houses and penthouses.

Hard rules:
1. Never invent listings, prices, or furnishing status that are not present in the Dataset Context or Valuation Context.
2. When a Valuation Context is provided (ML model output), lead with those numbers as the AI-estimated market value.
3. If the Dataset Context says "No exact matching listings", say so clearly, then offer the closest alternatives from the data.
4. Always mention the actual furnishing status present in the data.
5. Prefer concrete configs (BHK, area, locality, budget) over vague advice.
6. When the user is exploring, proactively ask 1 clarifying question (budget, BHK, locality preference, or ready-to-move vs investment).

Broker playbook:
- Match the user to 2–4 options from Dataset Context when available.
- Compare price per sq.ft and total ticket size in ₹ L / ₹ Cr.
- Call out trade-offs (connectivity vs price, new vs older stock).
- For investment questions, mention rental demand only in general MMR terms — do not invent yields.

Response style:
- Clean Markdown
- Short paragraphs or tight bullet points
- End with one natural follow-up question a broker would ask
"""

VERIFIED_LOCALITIES = [
    "Airoli", "Ambernath", "Andheri", "Badlapur", "Bandra", "Bhandup",
    "Bhayandar", "Bhiwandi", "Borivali", "Byculla", "Chembur", "Dadar",
    "Dahisar", "Deonar", "Dombivli", "Ghansoli", "Ghatkopar", "Goregaon",
    "Jogeshwari", "Juhu", "Kalamboli", "Kalyan", "Kalwa", "Kamothe",
    "Kandivali", "Kanjurmarg", "Karjat", "Kasarvadavali", "Khar", "Kharghar",
    "Koper Khairane", "Kurla", "Lower Parel", "Mahim", "Malad", "Mazagaon",
    "Mira Road", "Mulund", "Mumbra", "Nahur", "Naigaon", "Nala Sopara",
    "Nerul", "Palghar", "Panvel", "Parel", "Powai", "Prabhadevi",
    "Sanpada", "Santacruz", "Seawoods", "Shelu", "Shil Phata", "Sion",
    "Taloja", "Thane", "Thakurli", "Titwala", "Ulwe", "Vangani",
    "Vasai", "Vashi", "Vikhroli", "Vile Parle", "Virar", "Wadala", "Worli"
]

conversation_memory = {}


def get_conversation_history(user_id, limit=3):
    if not user_id or user_id == 0:
        return []
    return conversation_memory.get(user_id, [])[-limit:]


def add_to_memory(user_id, role, content):
    if not user_id or user_id == 0:
        return
    if user_id not in conversation_memory:
        conversation_memory[user_id] = []
    conversation_memory[user_id].append({"role": role, "content": content})
    conversation_memory[user_id] = conversation_memory[user_id][-10:]


def has_property_intent(msg: str) -> bool:
    msg = msg.lower().strip()
    greetings = {
        "hi", "hey", "hello", "hii", "helo", "yo", "sup",
        "good morning", "good afternoon", "good evening", "namaste"
    }
    if msg in greetings or len(msg) < 4:
        return False
    keywords = [
        "bhk", "apartment", "flat", "property", "house", "buy", "looking",
        "want", "need", "show", "options", "available", "list", "price",
        "budget", "lakh", "lac", "crore", "cr", "sqft", "sq.ft", "furnished",
        "unfurnished", "semi", "investment", "recommend", "suggest", "compare",
        "predict", "valuation", "value", "worth", "estimate", "rate"
    ]
    return any(k in msg for k in keywords)


def is_valuation_request(msg: str) -> bool:
    msg = msg.lower()
    triggers = [
        "predict", "prediction", "valuation", "value this", "what is the price",
        "what would be the price", "how much", "estimate", "worth",
        "market value", "expected price", "price range", "tell me the price",
        "run valuation", "calculate price", "what price"
    ]
    return any(t in msg for t in triggers)


def find_matched_locality(msg: str) -> str | None:
    msg_lower = msg.lower()
    for loc in VERIFIED_LOCALITIES:
        if loc.lower() in msg_lower:
            return loc

    aliases = {
        "ambernath": "Ambernath", "ambarnath": "Ambernath",
        "dombivli": "Dombivli", "dombivali": "Dombivli",
        "nalasopara": "Nala Sopara", "nala sopara": "Nala Sopara",
        "vileparle": "Vile Parle", "vile parle": "Vile Parle",
        "mira road": "Mira Road", "miraroad": "Mira Road",
        "koper khairane": "Koper Khairane", "koparkhairane": "Koper Khairane",
        "shilphata": "Shil Phata", "lower parel": "Lower Parel",
        "kasaradavali": "Kasarvadavali",
    }
    for alias, canonical in aliases.items():
        if alias in msg_lower:
            return canonical
    return None


def extract_features(msg: str) -> dict:
    msg_l = msg.lower()

    locality = find_matched_locality(msg) or "Andheri"

    bhk_match = re.search(r"(\d)\s*bhk", msg_l)
    bhk = int(bhk_match.group(1)) if bhk_match else 1

    area_match = re.search(r"(\d{2,4})\s*(?:sq\.?\s*ft|sqft|sq\.ft\.?)", msg_l)
    area = int(area_match.group(1)) if area_match else 550

    bath_match = re.search(r"(\d)\s*bath", msg_l)
    bathrooms = int(bath_match.group(1)) if bath_match else max(1, bhk)

    balcony_match = re.search(r"(\d)\s*balcon", msg_l)
    balconies = int(balcony_match.group(1)) if balcony_match else 0

    age = 0
    if any(w in msg_l for w in ["new", "under construction", "ready to move", "new launch"]):
        age = 0
    else:
        age_match = re.search(r"(\d{1,2})\s*(?:year|yr|yrs|age)", msg_l)
        if age_match:
            age = int(age_match.group(1))

    furnishing = "Unfurnished"
    if any(w in msg_l for w in ["fully furnished", "full furnished", "fully-furnished"]):
        furnishing = "Fully Furnished"
    elif "semi" in msg_l and "furnished" in msg_l:
        furnishing = "Semi-Furnished"
    elif "furnished" in msg_l and "un" not in msg_l:
        furnishing = "Semi-Furnished"

    prop_type = "Apartment"
    if "villa" in msg_l:
        prop_type = "Villa"
    elif "penthouse" in msg_l:
        prop_type = "Penthouse"
    elif "independent" in msg_l or "bungalow" in msg_l:
        prop_type = "Independent House"

    return {
        "locality": locality,
        "property_type": prop_type,
        "furnishing": furnishing,
        "area": area,
        "bhk": bhk,
        "bathrooms": bathrooms,
        "balconies": balconies,
        "age": age,
    }


def run_ml_valuation(features: dict) -> str:
    if model_service is None:
        return "ML valuation model is not loaded on the server."

    try:
        valuations, error = model_service.predict(features)
        if error:
            return f"Valuation engine error: {error}"

        lines = [
            f"**AI Valuation for {features['bhk']} BHK {features['property_type']} in {features['locality']}**",
            f"- Area: {features['area']} sq.ft | Furnishing: {features['furnishing']} | Age: {features['age']} yrs",
            "",
            "**Estimated Market Value (mid-2026 calibrated):**",
        ]

        base = valuations.get("base_price") or valuations.get("Base_Price")
        if base:
            lines.append(f"- **Baseline**: {base}")

        for tier in ["Normal", "Premium", "Premium_Brand"]:
            val = valuations.get(tier)
            if val:
                if isinstance(val, (list, tuple)) and len(val) >= 2:
                    lines.append(f"- **{tier.replace('_', ' ')}**: {val[0]} – {val[1]}")
                else:
                    lines.append(f"- **{tier.replace('_', ' ')}**: {val}")

        lines.append("")
        lines.append("_These figures are model estimates based on historical MMR transactions adjusted for current market levels. Actual transaction prices may vary._")
        return "\n".join(lines)

    except Exception as e:
        return f"Could not run valuation: {str(e)}"


def parse_user_intent_and_query_db(user_message: str) -> str:
    if not has_property_intent(user_message):
        return "No listings injected – greeting or general chat. Reply as a friendly MMR broker: greet briefly, mention you can help with valuations, locality options (1/2/3 BHK etc.), and ask what config or budget they have in mind."

    features = extract_features(user_message)
    valuation_context = ""

    if is_valuation_request(user_message):
        valuation_context = run_ml_valuation(features)

    try:
        possible_paths = [
            os.path.join(os.getcwd(), "cleaned_properties.csv"),
            os.path.join(os.getcwd(), "..", "cleaned_properties.csv"),
            os.path.join(os.getcwd(), "ml", "data", "processed", "cleaned_properties.csv"),
            os.path.join(os.getcwd(), "..", "ml", "data", "processed", "cleaned_properties.csv"),
            "cleaned_properties.csv",
        ]
        csv_path = next((p for p in possible_paths if os.path.exists(p)), None)
        if not csv_path:
            comps_text = "No property dataset found."
        else:
            df = pd.read_csv(csv_path)
            df.columns = df.columns.str.strip().str.lower()

            col_map = {
                "price_lakhs": "price",
                "area_sqft": "area_sqft",
                "bhk_size": "bhk_size",
                "furnishing_status": "furnishing_status",
                "locality": "locality",
                "property_type": "property_type",
                "property_age": "property_age",
            }
            for old, new in col_map.items():
                if old in df.columns and new not in df.columns:
                    df[new] = df[old]

            msg = user_message.lower()
            bhk_val = features["bhk"]
            area_val = features["area"]
            matched_locality = features["locality"]

            want_fully = any(w in msg for w in ["fully furnished", "full furnished", "fully-furnished"])
            want_semi = "semi" in msg and "furnished" in msg
            want_unfurnished = any(w in msg for w in ["unfurnished", "un-furnished"])

            filtered = df.copy()

            if matched_locality and "locality" in filtered.columns:
                filtered = filtered[
                    filtered["locality"].astype(str).str.lower().str.contains(matched_locality.lower(), na=False)
                ]

            if bhk_val and "bhk_size" in filtered.columns:
                filtered = filtered[filtered["bhk_size"] == bhk_val]

            if area_val and "area_sqft" in filtered.columns:
                lo, hi = area_val * 0.75, area_val * 1.25
                filtered = filtered[
                    (filtered["area_sqft"] >= lo) & (filtered["area_sqft"] <= hi)
                ]

            if "furnishing_status" in filtered.columns:
                if want_fully:
                    filtered = filtered[
                        filtered["furnishing_status"].astype(str).str.lower().str.contains(r"fully\s*furnished", na=False, regex=True)
                    ]
                elif want_semi:
                    filtered = filtered[
                        filtered["furnishing_status"].astype(str).str.lower().str.contains("semi", na=False)
                    ]
                elif want_unfurnished:
                    filtered = filtered[
                        filtered["furnishing_status"].astype(str).str.lower().str.contains("unfurnished", na=False)
                    ]

            if len(filtered) < 3 and area_val and "area_sqft" in df.columns:
                filtered = df.copy()
                if matched_locality:
                    filtered = filtered[
                        filtered["locality"].astype(str).str.lower().str.contains(matched_locality.lower(), na=False)
                    ]
                if bhk_val:
                    filtered = filtered[filtered["bhk_size"] == bhk_val]
                lo, hi = area_val * 0.60, area_val * 1.40
                filtered = filtered[
                    (filtered["area_sqft"] >= lo) & (filtered["area_sqft"] <= hi)
                ]

            if "area_sqft" in filtered.columns and area_val:
                filtered = filtered.copy()
                filtered["_dist"] = (filtered["area_sqft"] - area_val).abs()
                filtered = filtered.sort_values("_dist")

            filtered = filtered.head(6)

            if filtered.empty:
                filter_desc = []
                if bhk_val:
                    filter_desc.append(f"{bhk_val} BHK")
                if matched_locality:
                    filter_desc.append(matched_locality)
                if want_fully:
                    filter_desc.append("Fully Furnished")
                elif want_semi:
                    filter_desc.append("Semi-Furnished")
                elif want_unfurnished:
                    filter_desc.append("Unfurnished")
                if area_val:
                    filter_desc.append(f"~{area_val} sq.ft")

                comps_text = (
                    f"No exact matching listings found for: {' + '.join(filter_desc) if filter_desc else 'the requested criteria'}.\n\n"
                    "IMPORTANT: Clearly tell the user that no verified listings match their exact requirements. "
                    "Then you may offer general market advice for that locality."
                )
            else:
                lines = [
                    f"**Verified comparable listings** "
                    f"(Locality: {matched_locality} | BHK: {bhk_val} | ~{area_val} sq.ft)"
                ]
                for idx, (_, r) in enumerate(filtered.iterrows(), 1):
                    raw_price = float(r.get("price", r.get("price_lakhs", 0)))
                    price = apply_market_uplift(raw_price, r.get("locality", matched_locality))
                    price_str = format_price_display(price)
                    furn = r.get("furnishing_status", "Not specified")
                    area_r = int(r.get("area_sqft", 0))
                    lines.append(
                        f"**Option {idx}:** {int(r.get('bhk_size', bhk_val))} BHK in **{r.get('locality')}** | "
                        f"{area_r} sq.ft | {furn} | **{price_str}**"
                    )
                comps_text = "\n".join(lines)

    except Exception as e:
        print(f"Dataset query error: {e}")
        comps_text = "Error reading dataset. Answer using general MMR knowledge."

    parts = []
    if valuation_context:
        parts.append("### Valuation Context (use these numbers)\n" + valuation_context)
    parts.append("### Dataset Context (comparable listings)\n" + comps_text)
    return "\n\n".join(parts)


def process_chat_message(user_message: str, user_id=None) -> str:
    msg_lower = user_message.lower()
    is_email_request = any(
        k in msg_lower for k in ["email", "mail", "send pdf", "send report", "send me the report"]
    )

    db_context = parse_user_intent_and_query_db(user_message)
    bot_response = ""

    if is_email_request and user_id and user_id != 0:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT email FROM users WHERE id = %s;", [user_id])
            row = cursor.fetchone()
            cursor.close()
            conn.close()

            if row and row[0]:
                pdf_bytes = generate_pdf_report_bytes(user_message, db_context)
                send_valuation_email(row[0], pdf_bytes)
                bot_response = f"I have generated your valuation report and emailed it to **{row[0]}**."
            else:
                bot_response = "I couldn't find a registered email for your account."
        except Exception as e:
            print(f"Email error: {e}")
            bot_response = "Failed to email the report. Please try again later."
    else:
        if not groq_client:
            bot_response = "Groq API key is not configured on the server."
        else:
            try:
                history = get_conversation_history(user_id, limit=3)
                messages = [{"role": "system", "content": SYSTEM_PROMPT}]
                for h in history:
                    messages.append(h)

                messages.append({
                    "role": "user",
                    "content": f"""User Message: {user_message}

{db_context}

Respond as AURA. Be honest about what is available. If a Valuation Context is present, lead with those numbers."""
                })

                completion = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=messages,
                    temperature=0.30,
                    max_tokens=1200,
                )
                bot_response = completion.choices[0].message.content.strip()

                add_to_memory(user_id, "user", user_message)
                add_to_memory(user_id, "assistant", bot_response)

            except Exception as e:
                print(f"Groq API error: {e}")
                bot_response = "AURA is temporarily unavailable. Please try again in a moment."

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history (user_id, user_message, bot_response, created_at) VALUES (%s, %s, %s, NOW());",
            [user_id if user_id and user_id != 0 else None, user_message, bot_response],
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Chat log error: {e}")

    return bot_response


def fetch_user_chat_history(current_user_id):
    if not current_user_id or current_user_id == 0:
        return []
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_message, bot_response, created_at FROM chat_history WHERE user_id = %s ORDER BY created_at ASC LIMIT 50;",
            [current_user_id],
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "userMessage": r[1],
                "botResponse": r[2],
                "createdAt": str(r[3]) if r[3] else None,
            }
            for r in rows
        ]
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()