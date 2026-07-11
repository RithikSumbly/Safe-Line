from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response

from app.config import get_settings
from app.whatsapp.pipeline import InboundMessage, Messenger, handle_inbound

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


def _verify_signature(payload: bytes, signature: str | None) -> bool:
    secret = get_settings().meta_app_secret
    if not secret:
        return True
    if not signature:
        logger.warning("WhatsApp webhook missing X-Hub-Signature-256 header")
        return False
    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    ok = hmac.compare_digest(expected, signature)
    if not ok:
        logger.error(
            "WhatsApp webhook signature mismatch — check META_APP_SECRET matches "
            "Meta Developer Console → App Settings → Basic → App secret"
        )
    return ok


class MetaMessenger(Messenger):
    async def send_text(self, to: str, body: str) -> None:
        settings = get_settings()
        if not settings.meta_whatsapp_token or not settings.meta_phone_number_id:
            logger.warning(
                "WhatsApp credentials not configured — would send to %s: %s",
                to,
                body[:80],
            )
            return
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages",
                headers={"Authorization": f"Bearer {settings.meta_whatsapp_token}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "text",
                    "text": {"body": body},
                },
            )
            if res.status_code >= 400:
                logger.error(
                    "WhatsApp send failed (%s): %s",
                    res.status_code,
                    res.text[:300],
                )

    async def send_typing(self, to: str, message_id: str) -> None:
        settings = get_settings()
        if not settings.meta_whatsapp_token or not settings.meta_phone_number_id:
            return
        if not message_id:
            return
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(
                f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages",
                headers={"Authorization": f"Bearer {settings.meta_whatsapp_token}"},
                json={
                    "messaging_product": "whatsapp",
                    "status": "read",
                    "message_id": message_id,
                    "typing_indicator": {"type": "text"},
                },
            )


async def _send_whatsapp_text(to: str, body: str) -> None:
    settings = get_settings()
    if not settings.meta_whatsapp_token or not settings.meta_phone_number_id:
        logger.warning("WhatsApp credentials not configured — would send to %s: %s", to, body[:80])
        return
    async with httpx.AsyncClient(timeout=30.0) as client:
        await client.post(
            f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages",
            headers={"Authorization": f"Bearer {settings.meta_whatsapp_token}"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": body},
            },
        )


async def _download_media(media_id: str) -> bytes:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=60.0) as client:
        meta = await client.get(
            f"https://graph.facebook.com/v21.0/{media_id}",
            headers={"Authorization": f"Bearer {settings.meta_whatsapp_token}"},
        )
        meta.raise_for_status()
        url = meta.json()["url"]
        file_res = await client.get(
            url,
            headers={"Authorization": f"Bearer {settings.meta_whatsapp_token}"},
        )
        file_res.raise_for_status()
        return file_res.content


async def _process_message(phone: str, message_id: str, *, text: str = "", image_bytes: bytes | None = None, pdf_bytes: bytes | None = None) -> None:
    messenger = MetaMessenger()
    try:
        await handle_inbound(
            InboundMessage(
                phone=phone,
                message_id=message_id,
                text=text,
                image_bytes=image_bytes,
                document_bytes=pdf_bytes,
            ),
            messenger,
        )
    except Exception as exc:
        logger.exception("WhatsApp processing failed for %s: %s", phone[-4:], exc)
        await messenger.send_text(
            phone,
            "Sorry — I couldn't process that message. Please try again.",
        )


def _extract_messages(payload: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for msg in value.get("messages", []):
                out.append(msg)
    return out


@router.get("/status")
async def whatsapp_status():
    """Diagnostic: shows whether WhatsApp env vars are configured (no secrets exposed)."""
    settings = get_settings()
    return {
        "webhook_path": "/whatsapp/webhook",
        "token_configured": bool(settings.meta_whatsapp_token),
        "phone_number_id_configured": bool(settings.meta_phone_number_id),
        "verify_token_configured": bool(settings.meta_verify_token),
        "app_secret_configured": bool(settings.meta_app_secret),
        "ready": bool(
            settings.meta_whatsapp_token
            and settings.meta_phone_number_id
            and settings.meta_verify_token
        ),
    }


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
):
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_verify_token:
        return Response(content=hub_challenge or "", media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256")
    if not _verify_signature(body, sig):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    for msg in _extract_messages(payload):
        phone = msg.get("from", "")
        message_id = msg.get("id", "")
        msg_type = msg.get("type", "text")
        text = ""
        pdf_bytes = None
        image_bytes = None

        if msg_type == "text":
            text = msg.get("text", {}).get("body", "")
        elif msg_type == "interactive":
            interactive = msg.get("interactive", {}) or {}
            i_type = interactive.get("type")
            if i_type == "list_reply":
                text = (interactive.get("list_reply", {}) or {}).get("id", "")
            elif i_type == "button_reply":
                text = (interactive.get("button_reply", {}) or {}).get("id", "")
        elif msg_type == "document":
            doc = msg.get("document", {})
            text = doc.get("caption") or doc.get("filename", "Rental document")
            media_id = doc.get("id")
            if media_id:
                try:
                    pdf_bytes = await _download_media(media_id)
                except Exception as exc:
                    logger.error("Media download failed: %s", exc)
        elif msg_type == "image":
            img = msg.get("image", {}) or {}
            media_id = img.get("id")
            if media_id:
                try:
                    image_bytes = await _download_media(media_id)
                except Exception as exc:
                    logger.error("Image download failed: %s", exc)
            text = img.get("caption") or ""

        if phone and (text or pdf_bytes or image_bytes):
            logger.info("WhatsApp inbound from %s type=%s", phone[-4:], msg_type)
            # Await processing so HF Space does not drop background tasks before reply.
            await _process_message(
                phone,
                message_id,
                text=text,
                image_bytes=image_bytes,
                pdf_bytes=pdf_bytes,
            )

    return {"status": "ok"}
