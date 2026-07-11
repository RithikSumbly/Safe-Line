from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.core.schemas import EvidenceItem

_EXAM = re.compile(
    r"(?i)\b(cbse|icse|board\s*exam|class\s*\d+|paper\s*leak|exam\s*postpon|"
    r"question\s*paper|jee|neet|upsc|exam\s*cancel)\b"
)
_DISASTER = re.compile(
    r"(?i)\b(flood|dam\s*break|evacuat|earthquake|cyclone|landslide|"
    r"building\s*collapse|gas\s*leak|fire\s*outbreak|tsunami)\b"
)
_HEALTH = re.compile(
    r"(?i)\b(outbreak|epidemic|lockdown|curfew|virus\s*spread|pandemic)\b"
)
_URGENCY = re.compile(r"(?i)\b(forward\s+to\s+all|before\s+it's\s+deleted|urgent|act\s+now)\b")


@dataclass
class CrisisPatternProfile:
    tags: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    explanation: str = ""
    recommended_action: str = ""
    family_friendly_rewrite: str = ""
    status: str = "unverified"
    confidence: float = 0.28


def analyze_crisis_patterns(text: str) -> CrisisPatternProfile:
    profile = CrisisPatternProfile()
    has_exam = bool(_EXAM.search(text))
    has_disaster = bool(_DISASTER.search(text))
    has_health = bool(_HEALTH.search(text))
    has_urgency = bool(_URGENCY.search(text))

    if has_exam:
        profile.tags.append("exam_rumor")
        profile.red_flags.append(
            "Claims an exam paper leak or postponement without citing an official board notice"
        )
        profile.red_flags.append(
            "Uses pressure to forward widely before the message is 'deleted'"
            if has_urgency
            else "Asks people to share before official confirmation"
        )
        profile.explanation = (
            "This reads like a common exam-leak or postponement forward. Boards like CBSE "
            "announce schedule changes on official websites — not through anonymous WhatsApp chains."
        )
        profile.recommended_action = (
            "Check the official board website (e.g. cbse.gov.in) for notices before believing or sharing. "
            "Do not forward the leak claim to classmates until an official statement exists. "
            "If your school shares guidance, follow that — not random coaching-center forwards."
        )
        profile.family_friendly_rewrite = (
            "This message claims an exam paper was leaked or the exam may be postponed. "
            "We couldn't verify it with official sources. Exam boards post real updates on their "
            "official website — it's best not to forward this until that's confirmed."
        )

    elif has_disaster:
        profile.tags.append("disaster_rumor")
        profile.red_flags.append(
            "Describes an emergency event that should be confirmed through government alerts"
        )
        if has_urgency:
            profile.red_flags.append("Uses urgent forward pressure typical of panic rumors")
        profile.explanation = (
            "The message describes a possible disaster or emergency. Real alerts come from "
            "district administration, NDMA, or verified news — not unverified forwards alone."
        )
        profile.recommended_action = (
            "If you are in immediate physical danger, call 112 or your local emergency number. "
            "Otherwise check your state disaster management or district collector office social media "
            "and local news before forwarding. Do not panic-share unverified evacuation claims."
        )
        profile.family_friendly_rewrite = (
            "This forward claims something serious is happening nearby. We couldn't verify it yet. "
            "Emergency updates should come from official government channels — please don't spread "
            "the message until it's confirmed."
        )

    elif has_health:
        profile.tags.append("health_rumor")
        profile.red_flags.append(
            "Makes public-health claims that need official health department confirmation"
        )
        profile.explanation = (
            "Health-related forwards often spread faster than facts. Ministry of Health and state "
            "health departments publish advisories on official channels."
        )
        profile.recommended_action = (
            "Verify with your state health department or MoHFW advisories before sharing. "
            "Do not change behaviour based on a single forwarded message."
        )
        profile.family_friendly_rewrite = (
            "This message makes a health-related claim we couldn't verify. Official health "
            "advisories come from government sources — safest not to forward until confirmed."
        )

    else:
        profile.tags.append("general_rumor")
        profile.red_flags.append("Unverified forward asking people to act or share widely")
        profile.explanation = (
            "We could not corroborate this claim from live fact-checks or official bulletins. "
            "It may be too recent, too local, or not yet covered by sources we queried."
        )
        profile.recommended_action = (
            "Treat the claim as unconfirmed. Check the relevant official organisation's website "
            "or verified news outlets before forwarding. Avoid adding to panic chains."
        )
        profile.family_friendly_rewrite = (
            "This forwarded message makes a claim we couldn't verify with official sources. "
            "It's best to wait for confirmation before sharing it with others."
        )

    if has_urgency and "forward" not in " ".join(profile.red_flags).lower():
        profile.red_flags.append("Uses urgency or mass-forward pressure")

    profile.status = "unverified"
    profile.confidence = 0.28 if not profile.tags else 0.32
    return profile


def merge_crisis_red_flags(primary: list[str], secondary: list[str], cap: int = 5) -> list[str]:
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
