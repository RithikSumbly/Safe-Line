from __future__ import annotations

"""WhatsApp Cloud API interactive list / reply-button builders + id map."""

from typing import Any

# Inbound interactive reply ids (list_reply / button_reply).
MENU_CHECK_SCAM = "check_scam"
MENU_CHECK_JOB = "check_job"
MENU_CHECK_CRISIS = "check_crisis"
MENU_HELP = "menu_help"
MENU_OPEN = "menu_open"
MENU_RESET = "menu_reset"

MENU_IDS = frozenset(
    {
        MENU_CHECK_SCAM,
        MENU_CHECK_JOB,
        MENU_CHECK_CRISIS,
        MENU_HELP,
        MENU_OPEN,
        MENU_RESET,
    }
)

PROMPT_BY_CHECK = {
    MENU_CHECK_SCAM: (
        "Paste the suspicious SMS, email, or bank alert — or send a screenshot. "
        "I'll run a live scam check."
    ),
    MENU_CHECK_JOB: (
        "Paste the job offer or recruiter message (include email/domain if you have it), "
        "or send a screenshot. I'll check for fee / fake-hire scams."
    ),
    MENU_CHECK_CRISIS: (
        "Paste the forwarded rumor (flood, dam, exam leak, evacuation claim) "
        "or send a screenshot. Include the place name if it's in the message."
    ),
}


def build_main_menu_interactive(
    *,
    body: str = "What do you want to check? Or just paste a message / screenshot.",
) -> dict[str, Any]:
    """Interactive list — WhatsApp's selectable menu UI."""
    return {
        "type": "list",
        "header": {"type": "text", "text": "SafeLine"},
        "body": {"text": body[:1024]},
        "footer": {"text": "Live evidence · calm verdicts"},
        "action": {
            "button": "Choose",
            "sections": [
                {
                    "title": "Live checks",
                    "rows": [
                        {
                            "id": MENU_CHECK_SCAM,
                            "title": "Scam / phishing SMS",
                            "description": "Bank KYC, OTP, lottery, parcel",
                        },
                        {
                            "id": MENU_CHECK_JOB,
                            "title": "Fake job offer",
                            "description": "Fees, WFH deposits, fake HR",
                        },
                        {
                            "id": MENU_CHECK_CRISIS,
                            "title": "Crisis rumor",
                            "description": "Flood, dam, exam leak forwards",
                        },
                    ],
                },
                {
                    "title": "Account",
                    "rows": [
                        {
                            "id": MENU_HELP,
                            "title": "How it works",
                            "description": "What SafeLine checks",
                        },
                        {
                            "id": MENU_RESET,
                            "title": "Reset chat",
                            "description": "Wipe history so a new paste isn't mixed with old messages",
                        },
                    ],
                },
            ],
        },
    }


def build_after_verdict_buttons() -> dict[str, Any]:
    """Up to 3 quick reply buttons under a verdict."""
    return {
        "type": "button",
        "body": {
            "text": "Want to check something else?",
        },
        "action": {
            "buttons": [
                {
                    "type": "reply",
                    "reply": {"id": MENU_OPEN, "title": "Open menu"},
                },
                {
                    "type": "reply",
                    "reply": {"id": MENU_RESET, "title": "Reset chat"},
                },
            ]
        },
    }
