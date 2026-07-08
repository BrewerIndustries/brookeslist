#!/usr/bin/env python3
"""
Brooke's List -> Jarvis feedback bridge.

Polls the Brooke's List API for new support/feedback submissions and emails each
one to Dan FROM Jarvis's email account, then acks them so they're never sent
twice. Runs on the Jarvis server via cron — no changes to Jarvis's process, no
restart required. Pure stdlib (urllib + smtplib), no dependencies.

Config via environment (see deploy/feedback-poller.env.example):
  BROOKESLIST_API      https://brookeslist-api-dev.dabrewer.dev  (dev) / no -dev (prod)
  JARVIS_INGEST_TOKEN  bearer token — must match the Worker's JARVIS_INGEST_TOKEN secret
  SMTP_USER            serveremail.jarvis@gmail.com  (Jarvis's address = the "From")
  SMTP_PASS            Gmail app password
  NOTIFY_TO            myemailisdanmail@gmail.com
  SMTP_HOST            optional, default smtp.gmail.com
  SMTP_PORT            optional, default 465
  FROM_NAME            optional, default "Jarvis"

Run:  python3 jarvis-feedback-poller.py            # poll, email, ack
      python3 jarvis-feedback-poller.py --dry-run  # print pending, no email/ack
"""
import json
import os
import smtplib
import ssl
import sys
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr

API = os.environ.get("BROOKESLIST_API", "").rstrip("/")
TOKEN = os.environ.get("JARVIS_INGEST_TOKEN", "")
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
NOTIFY_TO = os.environ.get("NOTIFY_TO", "")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
FROM_NAME = os.environ.get("FROM_NAME", "Jarvis")
DRY_RUN = "--dry-run" in sys.argv


def api(path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def send_email(item):
    cat = item.get("category") or "Feedback"
    subj = item.get("subject") or "(no subject)"
    msg = EmailMessage()
    msg["Subject"] = f"[Brooke's List] {cat}: {subj}"
    msg["From"] = formataddr((FROM_NAME, SMTP_USER))
    msg["To"] = NOTIFY_TO
    if item.get("user_email"):
        msg["Reply-To"] = item["user_email"]
    msg.set_content(
        f"New {cat} from Brooke's List\n"
        f"From: {item.get('user_email', '?')}\n"
        f"Page: {item.get('page_url', '')}\n\n"
        f"Subject: {subj}\n\n"
        f"{item.get('message', '')}\n"
    )
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as s:
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)


def main():
    required = ["BROOKESLIST_API", "JARVIS_INGEST_TOKEN"]
    if not DRY_RUN:
        required += ["SMTP_USER", "SMTP_PASS", "NOTIFY_TO"]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        print("missing env:", ", ".join(missing))
        sys.exit(1)

    items = api("/feedback/pending").get("feedback", [])
    if not items:
        return
    if DRY_RUN:
        print(f"{len(items)} pending:")
        for it in items:
            print(f"  - [{it.get('category')}] {it.get('subject')} — from {it.get('user_email')}")
        return

    sent = []
    for it in items:
        try:
            send_email(it)
            sent.append(it["id"])
        except Exception as e:  # noqa: BLE001
            print("email failed for", it.get("id"), "-", e)
    if sent:
        api("/feedback/ack", method="POST", body={"ids": sent})
        print(f"sent + acked {len(sent)} feedback item(s)")


if __name__ == "__main__":
    main()
