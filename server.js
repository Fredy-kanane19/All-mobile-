
// Serveur de la boutique : valide et confirme les paiements Pi.
const express = require("express");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.PI_API_KEY;
const PI_PAR_EURO = 4;
const PORT = process.env.PORT || 3000;

const PRICES = {1:899,2:799,3:749,4:249,5:699,6:449,7:149,8:139,9:179,10:899,
                11:15,12:15,13:15,14:12,15:24,16:29,17:39,18:9,
                19:449,20:299,21:299,22:199,23:279,24:119,25:89,26:249};

const API = "https://api.minepi.com/v2/payments/";
const headers = { Authorization: "Key " + API_KEY, "Content-Type": "application/json" };

function attendu(items) {
  const euros = Object.entries(items || {}).reduce(
    (s, [id, q]) => s + (PRICES[id] || 0) * Math.max(0, Math.floor(Number(q) || 0)), 0);
  return Math.round(euros * PI_PAR_EURO);
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/approve", async (req, res) => {
  try {
    const id = req.body.paymentId;
    const p = await (await fetch(API + id, { headers })).json();
    const montant = attendu((p.metadata || {}).items);
    if (montant <= 0 || Number(p.amount) !== montant)
      return res.status(400).json({ error: "montant incorrect" });
    const r = await fetch(API + id + "/approve", { method: "POST", headers });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: "erreur serveur" }); }
});

app.post("/api/complete", async (req, res) => {
  try {
    const { paymentId, txid } = req.body;
    const r = await fetch(API + paymentId + "/complete", {
      method: "POST", headers, body: JSON.stringify({ txid })
    });
    const p = await r.json();
    if (r.ok) {
      fs.appendFileSync(path.join(__dirname, "commandes.jsonl"), JSON.stringify({
        date: new Date().toISOString(), paymentId, txid,
        montant: p.amount, commande: p.metadata
      }) + "\n");
    }
    res.status(r.status).json(p);
  } catch (e) { res.status(500).json({ error: "erreur serveur" }); }
});

app.listen(PORT, () => console.log("Boutique prête sur le port " + PORT));
