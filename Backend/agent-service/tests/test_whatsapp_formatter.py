from app.core.schemas import AnnotatedVerdict, ChatMessageResponse, EvidenceItem
from app.whatsapp.formatter import format_chat_response_for_whatsapp, format_verdict_message


def _ev(name: str, snippet: str) -> EvidenceItem:
    return EvidenceItem(
        source_name=name,
        source_url="https://example.com",
        supports_claim=True,
        snippet=snippet,
    )


def _sample_verdict(**kwargs) -> AnnotatedVerdict:
    base = dict(
        agent="scam",
        status="high_risk",
        confidence=0.9,
        risk_score=85,
        red_flags=[
            "Uses a suspicious non-official URL",
            "Creates artificial urgency",
            "Demands immediate payment via a link",
            "Pretends to be a courier/customs notice",
        ],
        evidence=[
            _ev(
                "India Post official parcel tracking",
                "Official India Post tracking uses indiapost.gov.in domains.",
            ),
            _ev(
                "Web search",
                "Scammers commonly impersonate India Post with fake customs fee links.",
            ),
            _ev(
                "Web search",
                "Do not pay duty through random shortened or lookalike domains.",
            ),
            _ev(
                "Safe Browsing",
                "Lookalike parcel-duty domains often appear in phishing reports.",
            ),
        ],
        explanation="This is a classic customs fee scam.",
        recommended_action=(
            "Do not click the link. Block the sender and track only on the official India Post site."
        ),
        family_friendly_rewrite=(
            "This is a common trap. Official post offices don't ask for payments on random websites."
        ),
        needs_human_review=False,
        disclaimer="Not legal advice.",
        input_text="India Post parcel…",
        flagged_spans=[],
    )
    base.update(kwargs)
    return AnnotatedVerdict(**base)


def test_verdict_message_includes_sources_not_hard_capped_at_1500():
    long_flags = [f"Flag number {i} with enough text to pad the body" for i in range(5)]
    long_evidence = [
        _ev(
            f"Source {i}",
            ("Long evidence snippet about parcel scams and fake duty pages. " * 4),
        )
        for i in range(5)
    ]
    text = format_verdict_message(
        _sample_verdict(red_flags=long_flags, evidence=long_evidence)
    )
    assert "Sources checked:" in text
    assert "Source 4:" in text
    assert len(text) > 800


def test_chat_format_skips_boilerplate_intro_when_verdict_present():
    body = format_chat_response_for_whatsapp(
        ChatMessageResponse(
            type="verdict",
            session_id="wa",
            assistant_text="Running a live check on that message now.",
            verdict=_sample_verdict(),
        )
    )
    assert "Running a live check" not in body
    assert "HIGH RISK" in body
    assert "Sources checked:" in body
    assert "Web search:" in body
    assert len(body) <= 4000


def test_fit_cuts_on_newline_not_mid_word_when_over_limit():
    huge = format_chat_response_for_whatsapp(
        ChatMessageResponse(
            type="verdict",
            session_id="wa",
            assistant_text="x" * 3800,
            verdict=_sample_verdict(
                recommended_action="Do not click. " * 80,
                family_friendly_rewrite="Family note. " * 80,
            ),
        )
    )
    assert len(huge) <= 4000
    assert huge.endswith("…")
