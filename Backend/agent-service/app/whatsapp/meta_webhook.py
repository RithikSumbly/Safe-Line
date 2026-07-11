from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import ssl
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Callable

import certifi
import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response

from app.config import get_settings
from app.whatsapp.pipeline import InboundMessage, Messenger, handle_inbound

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Keep background tasks alive on HF Spaces.
_background_tasks: set[asyncio.Task[None]] = set()

_META_TIMEOUT = httpx.Timeout(connect=60.0, read=60.0, write=30.0, pool=60.0)
_RELAY_TIMEOUT = httpx.Timeout(connect=20.0, read=60.0, write=30.0, pool=20.0)
_meta_client: httpx.AsyncClient | None = None


def _get_meta_client() -> httpx.AsyncClient:
    global _meta_client
    if _meta_client is None or _meta_client.is_closed:
        _meta_client = httpx.AsyncClient(
            timeout=_META_TIMEOUT,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        )
    return _meta_client


def _format_exc(exc: BaseException) -> str:
    msg = str(exc).strip()
    if msg:
        return f"{type(exc).__name__}: {msg}"
    return f"{type(exc).__name__}"


def _running_on_hf() -> bool:
    # HF Spaces set SPACE_ID; Python SSL to graph.facebook.com is unreliable there.
    return bool(os.environ.get("SPACE_ID"))


def _ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())


def _curl_post(
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
) -> tuple[int, str]:
    args = [
        "curl",
        "-sS",
        "--max-time",
        "90",
        "-w",
        "\n__HTTP_STATUS__%{http_code}",
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json",
    ]
    for key, value in headers.items():
        args.extend(["-H", f"{key}: {value}"])
    args.extend(["--data-binary", json.dumps(payload)])

    try:
        proc = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=95,
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("curl not installed") from exc
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError("curl timed out") from exc

    stdout = proc.stdout or ""
    if "__HTTP_STATUS__" in stdout:
        body, _, status_part = stdout.rpartition("\n__HTTP_STATUS__")
        status = int(status_part.strip())
    else:
        body = stdout
        status = 0

    if proc.returncode != 0 and status == 0:
        detail = (proc.stderr or proc.stdout or "curl failed").strip()
        raise RuntimeError(detail)

    return status, body


def _urllib_post(
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={**headers, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90, context=_ssl_context()) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as http_exc:
        body = http_exc.read().decode("utf-8", errors="replace")
        return http_exc.code, body


async def _try_transports(
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
    transports: list[tuple[str, Callable[..., tuple[int, str]]]],
) -> tuple[int, str, str]:
    errors: list[str] = []
    for name, fn in transports:
        try:
            status, body = await asyncio.to_thread(fn, url, headers, payload)
            return status, body, name
        except Exception as exc:
            msg = _format_exc(exc)
            errors.append(f"{name}: {msg}")
            logger.warning("Graph API transport %s failed: %s", name, msg)
    raise RuntimeError("; ".join(errors))


async def _post_via_relay(payload: dict[str, Any]) -> tuple[int, str, str]:
    settings = get_settings()
    relay_url = settings.whatsapp_send_relay_url
    relay_secret = settings.whatsapp_relay_secret
    if not relay_url or not relay_secret:
        raise RuntimeError("WhatsApp relay is not configured")

    relay_body = {
        "to": payload["to"],
        "body": payload["text"]["body"],
    }
    async with httpx.AsyncClient(timeout=_RELAY_TIMEOUT) as client:
        res = await client.post(
            relay_url,
            headers={
                "Content-Type": "application/json",
                "X-Relay-Secret": relay_secret,
            },
            json=relay_body,
        )
    return res.status_code, res.text, "vercel-relay"


async def _post_graph_api(
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
) -> tuple[int, str, str]:
    """POST to Graph API. Returns (status_code, body, transport)."""
    settings = get_settings()
    if _running_on_hf() and settings.whatsapp_send_relay_url and settings.whatsapp_relay_secret:
        return await _post_via_relay(payload)

    if _running_on_hf():
        return await _try_transports(
            url,
            headers,
            payload,
            [("curl", _curl_post), ("urllib", _urllib_post)],
        )

    client = _get_meta_client()
    try:
        res = await client.post(url, headers=headers, json=payload)
        return res.status_code, res.text, "httpx"
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
        logger.warning(
            "httpx Graph API POST failed (%s), trying urllib fallback",
            _format_exc(exc),
        )

    status, body = await asyncio.to_thread(_urllib_post, url, headers, payload)
    return status, body, "urllib"


# In-memory debug counters (resets on redeploy) — confirms Meta is hitting the server.
_last_webhook_at: str | None = None
_last_webhook_from: str | None = None
_last_send_error: str | None = None


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
        global _last_send_error
        settings = get_settings()
        if not settings.meta_whatsapp_token or not settings.meta_phone_number_id:
            _last_send_error = "credentials missing"
            logger.warning(
                "WhatsApp credentials not configured — would send to %s: %s",
                to,
                body[:80],
            )
            return

        url = f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body},
        }
        headers = {"Authorization": f"Bearer {settings.meta_whatsapp_token}"}

        last_error = ""
        for attempt in range(3):
            try:
                status, text, transport = await _post_graph_api(url, headers, payload)
                if status >= 400:
                    last_error = f"{status}: {text[:200]}"
                    _last_send_error = last_error
                    logger.error(
                        "WhatsApp send failed (%s via %s): %s",
                        status,
                        transport,
                        text[:300],
                    )
                    if attempt < 2 and status >= 500:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise RuntimeError(last_error)
                _last_send_error = None
                logger.info(
                    "WhatsApp sent reply to %s (%d chars via %s)",
                    to[-4:],
                    len(body),
                    transport,
                )
                return
            except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
                last_error = _format_exc(exc)
                _last_send_error = last_error
                logger.warning(
                    "WhatsApp send attempt %d/3 failed for %s: %s",
                    attempt + 1,
                    to[-4:],
                    last_error,
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
            except RuntimeError:
                raise
            except Exception as exc:
                last_error = _format_exc(exc)
                _last_send_error = last_error
                logger.warning(
                    "WhatsApp send attempt %d/3 failed for %s: %s",
                    attempt + 1,
                    to[-4:],
                    last_error,
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)

        raise RuntimeError(f"WhatsApp send failed after retries: {last_error}")

    async def send_typing(self, to: str, message_id: str) -> None:
        # Best-effort only — never block replies on typing indicator.
        settings = get_settings()
        if not settings.meta_whatsapp_token or not settings.meta_phone_number_id or not message_id:
            return
        try:
            async with httpx.AsyncClient(timeout=_META_TIMEOUT) as client:
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
        except Exception as exc:
            logger.debug("Typing indicator skipped: %s", exc)


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
        try:
            await messenger.send_text(
                phone,
                "Sorry — I couldn't process that message. Please try again.",
            )
        except Exception as send_exc:
            logger.error("Could not send error reply to %s: %s", phone[-4:], send_exc)


def _spawn_message_task(
    phone: str,
    message_id: str,
    *,
    text: str = "",
    image_bytes: bytes | None = None,
    pdf_bytes: bytes | None = None,
) -> None:
    task = asyncio.create_task(
        _process_message(
            phone,
            message_id,
            text=text,
            image_bytes=image_bytes,
            pdf_bytes=pdf_bytes,
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


def _extract_messages(payload: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for msg in value.get("messages", []):
                out.append(msg)
    return out


@router.get("/probe")
async def whatsapp_probe():
    """Test outbound HTTPS to graph.facebook.com from this container."""
    settings = get_settings()
    if not settings.meta_whatsapp_token:
        return {"ok": False, "error": "META_WHATSAPP_TOKEN not configured"}

    url = f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}"
    headers = {"Authorization": f"Bearer {settings.meta_whatsapp_token}"}
    results: dict[str, Any] = {}

    started = time.monotonic()
    try:
        client = _get_meta_client()
        res = await client.get(url, headers=headers)
        results["httpx_get"] = {
            "ok": True,
            "status": res.status_code,
            "ms": int((time.monotonic() - started) * 1000),
        }
    except Exception as exc:
        results["httpx_get"] = {
            "ok": False,
            "error": _format_exc(exc),
            "ms": int((time.monotonic() - started) * 1000),
        }

    post_url = f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages"
    probe_payload = {
        "messaging_product": "whatsapp",
        "to": "00000000000",
        "type": "text",
        "text": {"body": "probe"},
    }

    for name, fn in [("curl", _curl_post), ("urllib", _urllib_post)]:
        started = time.monotonic()
        try:
            status, _ = await asyncio.to_thread(fn, post_url, headers, probe_payload)
            results[f"{name}_post"] = {
                "ok": status < 500,
                "status": status,
                "ms": int((time.monotonic() - started) * 1000),
            }
        except Exception as exc:
            results[f"{name}_post"] = {
                "ok": False,
                "error": _format_exc(exc),
                "ms": int((time.monotonic() - started) * 1000),
            }

    started = time.monotonic()
    try:
        status, _, transport = await _post_graph_api(post_url, headers, probe_payload)
        results["combined_post"] = {
            "ok": status < 500,
            "status": status,
            "transport": transport,
            "ms": int((time.monotonic() - started) * 1000),
        }
    except Exception as exc:
        results["combined_post"] = {
            "ok": False,
            "error": _format_exc(exc),
            "ms": int((time.monotonic() - started) * 1000),
        }

    return {
        "ok": results.get("combined_post", {}).get("ok", False),
        "running_on_hf": _running_on_hf(),
        "results": results,
        "hint": "combined_post ok with 4xx means outbound to Meta works; all transports failing means HF cannot reach graph.facebook.com.",
    }


@router.get("/status")
async def whatsapp_status():
    """Diagnostic: shows whether WhatsApp env vars are configured (no secrets exposed)."""
    settings = get_settings()
    return {
        "webhook_path": "/whatsapp/webhook",
        "callback_url": "https://celestiallord-safe-line.hf.space/whatsapp/webhook",
        "token_configured": bool(settings.meta_whatsapp_token),
        "phone_number_id_configured": bool(settings.meta_phone_number_id),
        "verify_token_configured": bool(settings.meta_verify_token),
        "app_secret_configured": bool(settings.meta_app_secret),
        "ready": bool(
            settings.meta_whatsapp_token
            and settings.meta_phone_number_id
            and settings.meta_verify_token
        ),
        "last_webhook_at": _last_webhook_at,
        "last_webhook_from": _last_webhook_from,
        "last_send_error": _last_send_error,
        "relay_configured": bool(
            settings.whatsapp_send_relay_url and settings.whatsapp_relay_secret
        ),
        "running_on_hf": _running_on_hf(),
        "hint": (
            "HF Spaces cannot reach graph.facebook.com directly. Set "
            "WHATSAPP_SEND_RELAY_URL + WHATSAPP_RELAY_SECRET on HF and matching "
            "secrets on Vercel (/api/whatsapp/send)."
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
    global _last_webhook_at, _last_webhook_from
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256")
    if not _verify_signature(body, sig):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    for msg in _extract_messages(payload):
        phone = msg.get("from", "")
        _last_webhook_at = datetime.now(timezone.utc).isoformat()
        _last_webhook_from = phone or None
        logger.info("Webhook received from %s", phone[-4:] if phone else "?")
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
            # Ack Meta immediately; process + send reply in a tracked background task.
            _spawn_message_task(
                phone,
                message_id,
                text=text,
                image_bytes=image_bytes,
                pdf_bytes=pdf_bytes,
            )

    return {"status": "ok"}
