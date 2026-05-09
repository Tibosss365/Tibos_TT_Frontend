"""
AI-powered email features using Anthropic Claude API.
- Reply suggestions with tone control
- Thread summarization
- Sentiment analysis
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..models.email import EmailMessage, EmailThread
from ..schemas.email import AISuggestOut, AISummarizeOut

log = logging.getLogger(__name__)

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic()  # reads ANTHROPIC_API_KEY from env
    return _client


TONE_GUIDE = {
    "professional": "Clear, polite, and professional. Maintain formal business language.",
    "friendly":     "Warm, approachable, and conversational while still being helpful.",
    "formal":       "Strictly formal, respectful, and precise. Avoid contractions.",
    "empathetic":   "Empathetic and understanding, acknowledging the customer's situation.",
}


# ── Reply suggestion ──────────────────────────────────────────────────────────

async def suggest_reply(
    message_id: uuid.UUID,
    tone: str,
    language: str,
    max_length: int,
    db: AsyncSession,
) -> AISuggestOut:
    msg = await db.scalar(
        select(EmailMessage)
        .where(EmailMessage.id == message_id)
        .options(selectinload(EmailMessage.thread))
    )
    if not msg:
        raise ValueError("Message not found")

    # Build context from thread history (last 3 messages)
    thread_msgs = await db.execute(
        select(EmailMessage)
        .where(EmailMessage.thread_id == msg.thread_id)
        .order_by(EmailMessage.received_at.desc())
        .limit(3)
    )
    history = list(reversed(thread_msgs.scalars().all()))

    history_text = ""
    for m in history:
        direction = "Customer" if m.direction == "inbound" else "Agent"
        body = (m.body_stripped or m.body_text or "")[:500]
        history_text += f"\n{direction}: {body}\n"

    current_body = msg.body_stripped or msg.body_text or msg.body_html or ""
    tone_instruction = TONE_GUIDE.get(tone, TONE_GUIDE["professional"])

    prompt = f"""You are a helpful customer support agent drafting an email reply.

Thread context:
{history_text}

Latest customer message:
{current_body[:800]}

Instructions:
- Write a reply in {language} language
- Tone: {tone_instruction}
- Keep it under {max_length} words
- Do NOT include a greeting or sign-off
- Write only the body of the reply
- Address the customer's question or concern directly"""

    client = get_client()
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    suggestion = response.content[0].text.strip()

    # Cache on the message record
    msg.ai_suggested_reply = suggestion
    msg.ai_processed_at = datetime.now(timezone.utc)
    await db.commit()

    return AISuggestOut(suggestion=suggestion, tone=tone)


# ── Thread summary ────────────────────────────────────────────────────────────

async def summarize_thread(
    thread_id: uuid.UUID,
    max_length: int,
    db: AsyncSession,
) -> AISummarizeOut:
    result = await db.execute(
        select(EmailMessage)
        .where(EmailMessage.thread_id == thread_id)
        .order_by(EmailMessage.received_at)
    )
    messages = list(result.scalars().all())
    if not messages:
        raise ValueError("No messages in thread")

    conversation = ""
    for m in messages:
        role = "Customer" if m.direction == "inbound" else "Agent"
        body = (m.body_stripped or m.body_text or "")[:400]
        conversation += f"\n{role}: {body}\n"

    prompt = f"""Analyze this customer support email thread and provide:
1. A concise summary (under {max_length} words)
2. Overall sentiment: positive, neutral, or negative
3. 3-5 key bullet points

Thread:
{conversation[:3000]}

Respond in this exact JSON format:
{{
  "summary": "...",
  "sentiment": "positive|neutral|negative",
  "key_points": ["point 1", "point 2", "point 3"]
}}"""

    client = get_client()
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        data = json.loads(response.content[0].text.strip())
    except Exception:
        data = {
            "summary": response.content[0].text.strip()[:max_length],
            "sentiment": "neutral",
            "key_points": [],
        }

    # Cache summary on the latest message
    latest = messages[-1]
    latest.ai_summary = data.get("summary", "")
    latest.ai_sentiment = data.get("sentiment", "neutral")
    latest.ai_processed_at = datetime.now(timezone.utc)
    await db.commit()

    return AISummarizeOut(
        summary=data.get("summary", ""),
        sentiment=data.get("sentiment", "neutral"),
        key_points=data.get("key_points", []),
    )


# ── Sentiment analysis (batch) ────────────────────────────────────────────────

async def analyze_sentiment(message_id: uuid.UUID, db: AsyncSession) -> str:
    msg = await db.get(EmailMessage, message_id)
    if not msg:
        return "neutral"

    body = (msg.body_stripped or msg.body_text or "")[:800]
    prompt = f"""Classify the sentiment of this email as exactly one word: positive, neutral, or negative.

Email: {body}

Respond with only one word."""

    client = get_client()
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=5,
        messages=[{"role": "user", "content": prompt}],
    )
    sentiment = response.content[0].text.strip().lower()
    if sentiment not in ("positive", "neutral", "negative"):
        sentiment = "neutral"

    msg.ai_sentiment = sentiment
    msg.ai_processed_at = datetime.now(timezone.utc)
    await db.commit()
    return sentiment
