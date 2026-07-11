from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.core.schemas import EvidenceItem
from app.tools.url_extract import domain_from_url, extract_urls

_PRIZE = re.compile(r"(?i)\b(won|winner|congratulations|congrats|prize|lottery|selected)\b")
_MONEY = re.compile(r"(?i)\b(\d[\d,]*)\s*(rupees?|rs\.?|₹)\b|\brupees?\s+(\d[\d,]*)")
_CREATOR = re.compile(r"(?i)\b(mr\.?\s*beast|mrleast|mr\s*beast|pewdiepie|creator)\b")
_SUBSCRIBE = re.compile(r"(?i)\bsubscribe\b")
_BANK = re.compile(r"(?i)\b(bank|kyc|otp|upi|account\s*frozen|card\s*blocked|verify\s*account)\b")
_LOAN_FEE = re.compile(
    r"(?i)\b(pre[- ]?approved|personal\s+loan|processing\s+fee|loan\s+disbursal|"
    r"refundable\s+fee|pay\s+.*\s+via\s+upi)\b"
)
_URGENCY = re.compile(r"(?i)\b(urgent|immediately|act\s*now|within\s*\d+\s*(hours?|mins?))\b")


@dataclass
class ScamPatternProfile:
    tags: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    evidence: list[EvidenceItem] = field(default_factory=list)
    explanation: str = ""
    recommended_action: str = ""
    family_friendly_rewrite: str = ""
    status: str = "medium_risk"
    confidence: float = 0.72


def analyze_message_patterns(text: str, urls: list[str] | None = None) -> ScamPatternProfile:
    """Build message-specific flags and evidence when LLM/RAG are thin."""
    urls = urls or extract_urls(text)
    lower = text.lower()
    profile = ScamPatternProfile()

    has_prize = bool(_PRIZE.search(text))
    has_money = bool(_MONEY.search(text))
    has_creator = bool(_CREATOR.search(text))
    has_subscribe = bool(_SUBSCRIBE.search(text))
    has_bank = bool(_BANK.search(text))
    has_urgency = bool(_URGENCY.search(text))
    has_loan_fee = bool(_LOAN_FEE.search(text))
    has_youtube = "youtube.com" in lower or "youtu.be" in lower

    if has_prize or has_money:
        profile.tags.append("unsolicited_prize")
        profile.red_flags.append(
            "Claims you won money or a prize you never signed up for"
        )
        profile.evidence.append(
            EvidenceItem(
                source_name="FTC — Prize and lottery scams",
                source_url="https://consumer.ftc.gov/articles/prize-and-lottery-scams",
                supports_claim=False,
                snippet=(
                    "Real prizes do not arrive by random text asking you to pay, subscribe, "
                    "or click a link to claim winnings."
                ),
            )
        )

    money_match = _MONEY.search(text)
    if money_match:
        amount = (money_match.group(1) or money_match.group(3) or "").strip()
        if amount:
            profile.red_flags.append(
                f"Promises a specific cash amount ({amount} rupees) with no official verification"
            )

    if has_creator:
        profile.tags.append("celebrity_impersonation")
        profile.red_flags.append(
            "Uses a famous creator's name to make the offer look real"
        )

    if has_youtube and (has_subscribe or has_prize or has_money):
        profile.tags.append("youtube_impersonation")
        profile.red_flags.append(
            "Asks you to subscribe on YouTube to collect money — real payouts do not work this way"
        )
        profile.evidence.append(
            EvidenceItem(
                source_name="YouTube creator impersonation (common pattern)",
                source_url="https://support.google.com/youtube/answer/2802268",
                supports_claim=False,
                snippet=(
                    "YouTube and creators do not text strangers asking them to subscribe "
                    "to claim cash prizes. Giveaway scams often misuse creator names."
                ),
            )
        )

    for url in urls[:2]:
        domain = domain_from_url(url)
        if domain and domain not in ("youtube.com", "youtu.be"):
            profile.red_flags.append(f"Contains a link to {domain}, which is not an official prize portal")
        elif has_prize or has_money:
            profile.red_flags.append(
                "Uses a YouTube link as part of a prize claim — not how verified giveaways work"
            )

    if has_loan_fee:
        profile.tags.append("loan_fee_scam")
        profile.red_flags.append(
            "Offers a pre-approved loan but asks for an upfront processing fee via UPI"
        )
        profile.red_flags.append(
            "Legitimate lenders deduct fees from disbursement — they do not ask for advance UPI payments"
        )
        profile.evidence.append(
            EvidenceItem(
                source_name="RBI — caution on loan fee fraud",
                source_url="https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
                supports_claim=False,
                snippet=(
                    "Fraudsters pose as lenders offering instant loans and demand upfront "
                    "processing or insurance fees. RBI-regulated lenders do not ask for "
                    "advance fees via SMS or UPI to release a loan."
                ),
            )
        )

    if has_bank:
        profile.tags.append("bank_impersonation")
        profile.red_flags.append("Uses bank, KYC, OTP, or UPI language typical of phishing")
        profile.evidence.append(
            EvidenceItem(
                source_name="RBI — safe digital banking",
                source_url="https://www.rbi.org.in/",
                supports_claim=False,
                snippet=(
                    "Banks do not ask for KYC updates, OTPs, or payments through SMS links."
                ),
            )
        )

    if has_urgency:
        profile.red_flags.append("Uses urgency pressure to make you act before thinking")

    if not profile.red_flags:
        profile.red_flags.append("Unsolicited message with suspicious reward or action request")

    # Status from severity
    high_signals = sum(
        1
        for t in profile.tags
        if t in ("bank_impersonation", "celebrity_impersonation", "youtube_impersonation", "loan_fee_scam")
    )
    if has_bank or has_loan_fee:
        profile.status = "high_risk"
        profile.confidence = 0.82
    elif has_prize and (has_creator or has_youtube or has_subscribe):
        profile.status = "high_risk"
        profile.confidence = 0.78
    elif high_signals >= 1 or has_prize:
        profile.status = "medium_risk"
        profile.confidence = 0.74
    else:
        profile.status = "low_risk"
        profile.confidence = 0.55

    profile.explanation = _build_explanation(profile.tags, has_creator, has_youtube)
    profile.recommended_action = _build_action(profile.tags, urls, has_bank)
    profile.family_friendly_rewrite = _build_family_message(profile.tags, has_creator, has_money)

    return profile


def _build_explanation(tags: list[str], has_creator: bool, has_youtube: bool) -> str:
    if "celebrity_impersonation" in tags or "youtube_impersonation" in tags:
        return (
            "This reads like a fake prize message using a YouTube creator angle. "
            "Legitimate giveaways are announced on verified channels, not random texts "
            "asking you to subscribe to claim money."
        )
    if "unsolicited_prize" in tags:
        return (
            "The message follows a classic lottery/prize scam pattern: unexpected winnings "
            "plus a simple action (click, subscribe, pay) to collect."
        )
    if "bank_impersonation" in tags or "loan_fee_scam" in tags:
        return (
            "The message uses banking or loan language commonly seen in advance-fee fraud."
        )
    return "Several parts of this message match known scam patterns."


def _build_action(tags: list[str], urls: list[str], has_bank: bool) -> str:
    if "celebrity_impersonation" in tags or "youtube_impersonation" in tags:
        return (
            "Do not subscribe, reply, or click anything. Real creator giveaways are only "
            "announced on verified accounts — block the sender and delete the message."
        )
    if "unsolicited_prize" in tags:
        return (
            "Ignore the prize claim. Do not send money or personal details. "
            "Delete the message and warn others in your family group if it was forwarded."
        )
    if "loan_fee_scam" in tags:
        return (
            "Do not pay any processing fee. Real lenders never ask for upfront UPI payments "
            "to release a pre-approved loan. Delete the message and block the sender."
        )
    if has_bank:
        return (
            "Do not call numbers or open links in the message. "
            "Contact your bank using the number on your card or passbook if concerned."
        )
    if urls:
        return "Do not open the link. Delete the message without interacting."
    return "Treat the message as suspicious. Delete it without replying or clicking."


def _build_family_message(
    tags: list[str],
    has_creator: bool,
    has_money: bool,
) -> str:
    if has_creator or "youtube_impersonation" in tags:
        return (
            "This is a fake 'you won money' text that pretends to be linked to a YouTube "
            "creator. Real giveaways never text random people asking them to subscribe to "
            "claim cash. Scammers use famous names to sound believable — safe to delete and ignore."
        )
    if "unsolicited_prize" in tags and has_money:
        return (
            "This is a lottery-style scam: a message says you won money you never entered for. "
            "Fraudsters hope you'll click or reply. No real organisation pays prizes this way — "
            "please delete it and don't forward."
        )
    if "loan_fee_scam" in tags:
        return (
            "This is a fake loan message: it says you're pre-approved but asks for an upfront "
            "fee before any money is sent. Real banks and NBFCs never take processing fees "
            "via SMS or UPI links. Please delete it and don't pay anything."
        )
    if "bank_impersonation" in tags:
        return (
            "This looks like a fake bank or KYC message. Banks don't ask for OTPs or payments "
            "over SMS links. If unsure, call the bank using the number on your passbook — "
            "not any number in the message."
        )
    return (
        "This message looks like a common scam pattern. It's safest to delete it without "
        "clicking links or sharing personal details."
    )


def filter_irrelevant_evidence(
    evidence: list[EvidenceItem],
    text: str,
) -> list[EvidenceItem]:
    """Drop RBI/KYC snippets when the message is not bank-related."""
    if _BANK.search(text):
        return evidence
    return [
        e
        for e in evidence
        if not (
            e.source_name.upper() == "RBI"
            and "kyc" in e.snippet.lower()
        )
    ]


def merge_red_flags(primary: list[str], secondary: list[str], cap: int = 5) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for flag in primary + secondary:
        key = flag.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(flag.strip())
        if len(out) >= cap:
            break
    return out
