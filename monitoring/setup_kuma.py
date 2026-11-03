"""Configuration automatique d'Uptime Kuma (compte, alertes ntfy, sondes, page de statut).

Usage : monitoring/.venv/bin/python monitoring/setup_kuma.py
Mot de passe admin : variable KUMA_PASSWORD, sinon ~/.exam1-secrets/atlas.env (UPTIME_KUMA_PASSWORD),
sinon saisi au clavier (getpass). Il n'est jamais affiché.
Relançable : les éléments déjà présents (même nom / même slug) ne sont pas recréés.
"""
import getpass
import os
from pathlib import Path

from uptime_kuma_api import MonitorType, NotificationType, UptimeKumaApi

KUMA_URL = "http://localhost:3001"
USERNAME = "admin"
SECRETS = Path.home() / ".exam1-secrets" / "atlas.env"

NTFY_SERVER = "https://ntfy.sh"
NTFY_TOPIC = "midou-exam1-alertes"
SERVICES = ["backend", "gateway", "notifications", "stock-management"]
# Prod sondée plus souvent que la préprod ; timeout long pour le cold start Render gratuit
ENVIRONMENTS = {"PREPROD": {"slug": "preprod", "interval": 300}, "PROD": {"slug": "prod", "interval": 120}}
TIMEOUT = 60
RETRIES = 2


def read_password():
    """Mot de passe admin : KUMA_PASSWORD, sinon ~/.exam1-secrets/atlas.env, sinon saisie masquée."""
    if os.environ.get("KUMA_PASSWORD"):
        return os.environ["KUMA_PASSWORD"]
    if SECRETS.exists():
        for line in SECRETS.read_text().splitlines():
            if line.startswith("UPTIME_KUMA_PASSWORD="):
                return line.split("=", 1)[1]
    return getpass.getpass("Mot de passe admin Uptime Kuma : ")


def main():
    password = read_password()
    api = UptimeKumaApi(KUMA_URL, timeout=30)
    try:
        if api.need_setup():
            api.setup(USERNAME, password)
        api.login(USERNAME, password)

        # Alerte d'expiration TLS 14 jours avant
        api.set_settings(password=password, tlsExpiryNotifyDays=[14])

        # Canal d'alerte ntfy, activé par défaut sur tous les monitors
        notifications = {n["name"]: n["id"] for n in api.get_notifications()}
        if "ntfy exam1" not in notifications:
            notifications["ntfy exam1"] = api.add_notification(
                name="ntfy exam1", type=NotificationType.NTFY, isDefault=True, applyExisting=True,
                ntfyserverurl=NTFY_SERVER, ntfytopic=NTFY_TOPIC, ntfyPriority=4,
            )["id"]
        notif_ids = [notifications["ntfy exam1"]]

        monitors = {m["name"]: m["id"] for m in api.get_monitors()}

        def ensure(name, **kwargs):
            if name not in monitors:
                monitors[name] = api.add_monitor(name=name, notificationIDList=notif_ids, **kwargs)["monitorID"]
            return monitors[name]

        public_groups = []
        for label, conf in ENVIRONMENTS.items():
            base = f"https://midou-exam1-{conf['slug']}"
            group_id = ensure(label, type=MonitorType.GROUP)
            common = dict(parent=group_id, interval=conf["interval"], retryInterval=60,
                          maxretries=RETRIES, timeout=TIMEOUT)
            ids = []
            for service in SERVICES:
                ids.append(ensure(
                    f"[{label}] {service}", type=MonitorType.KEYWORD,
                    url=f"{base}-{service}.onrender.com/health", keyword='"status":"ok"', **common,
                ))
            ids.append(ensure(
                f"[{label}] frontend", type=MonitorType.HTTP,
                url=f"{base}-frontend.onrender.com", expiryNotification=True, **common,
            ))
            public_groups.append({"name": label, "monitorList": [{"id": i} for i in ids]})

        # Page de statut publique
        if "exam1" not in {p["slug"] for p in api.get_status_pages()}:
            api.add_status_page("exam1", "exam1")
        api.save_status_page("exam1", title="exam1", publicGroupList=public_groups)

        print(f"{len(monitors)} monitors configurés (dont 2 groupes), page de statut /status/exam1")
    finally:
        api.disconnect()


if __name__ == "__main__":
    main()
