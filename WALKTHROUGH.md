# RFID Rodeo — Walkthrough

A step-by-step walkthrough of a common workflow in **[RFID Rodeo](https://github.com/connor-sec/RFID_Rodeo)**: comparing card formats, converting an HID Prox (H10301) credential, exporting a Flipper Zero `.rfid` file, and generating a Proxmark clone command.

RFID Rodeo is a single, offline HTML file — open `RFID-Rodeo-v0.3.1.html` in any modern browser. No install, no server, nothing leaves the page.

> **⚠️ Authorized use only.** RFID Rodeo transforms values you enter; it does not read, write, transmit, or clone any physical card by itself. Use it only within an expressly authorized and documented testing scope. Outputs may be incomplete or incorrect — independently verify any calculated value against the relevant specification and real hardware before relying on it.

---

## Workflow at a Glance

1. Compare two formats to confirm which one your credential uses.
2. Use the per-format calculator to encode a facility/site number and card number into a raw frame.
3. Strip parity (Proxmark → Flipper) and export a Flipper Zero `.rfid` file.
4. Add parity (Flipper → Proxmark) and generate a copy-ready Proxmark clone command.

---

## Step 1 — Compare Two Formats

Use the **Compare** tool to view two card formats side by side. Pick a format in each dropdown (for example, `(26) Standard 26bit - (H10301)` vs `(26) Indala 26bit`) and RFID Rodeo generates a bit-layout table for each, with a universal color key by field type: even parity, facility / site number, card number, and odd parity, along with each field's bit position and width.

This helps you confirm which format your credential uses before converting anything.

## Step 2 — Encode a Standard H10301 Credential

`(26) Standard 26bit - (H10301)` is the most common card type — used by essentially all HID Prox / Prox II cards, the most widely deployed LF format in the world. It carries a **Verified** badge, meaning its field positions and parity were checked against the Proxmark client reference (`client/src/wiegand_formats.c`, Iceman fork).

The 26-bit layout is:

| Field                  | Bit(s) | Width |
|------------------------|--------|-------|
| Even Parity            | 1      | 1     |
| Facility / Site Number | 2-9    | 8     |
| Card Number            | 10-25  | 16    |
| Odd Parity             | 26     | 1     |

In the per-format calculator, enter the **Facility / Site Number** and **Card Number**, then click **Convert**. RFID Rodeo outputs the raw frame as Hex, Binary, and Decimal. Copy the Hex output for the next step.

## Step 3 — Strip Parity and Export a Flipper File

Open the **Flipper ↔ Proxmark** tool and use the **Strip parity (Proxmark → Flipper)** direction. Paste the full-frame hex (or Wiegand binary with parity), then run it.

RFID Rodeo decodes the Proxmark input (facility/site number, card number, Wiegand binary) and verifies parity (P1 OK, P2 OK), converts it to the Flipper representation, and lets you **Save .rfid** — e.g. `standard-26bit-h10301.rfid` — ready to load onto a Flipper Zero.

## Step 4 — Add Parity and Generate a Proxmark Clone Command

Still in the **Flipper ↔ Proxmark** tool, use the **Add parity (Flipper → Proxmark)** direction. A Flipper Zero stores a credential's *data bits* (facility code + card number) and drops the Wiegand parity bits; a Proxmark raw frame needs those parity bits present, so this restores them.

Enter the format and either the facility/site number and card number, or the payload hex, then add parity. RFID Rodeo outputs both the Flipper and Proxmark representations (including the Wiegand binary with parity) and a copy-ready clone command, for example:

```
lf hid clone -w H10301 --fc 167 --cn 34052
```

> Verify the command before running it on your Proxmark.

---

## Quick Reference

| Direction           | Tool                          | Output                          |
|---------------------|-------------------------------|---------------------------------|
| Number → raw frame  | Per-format calculator (H10301)| Hex / Binary / Decimal          |
| Proxmark → Flipper  | Flipper ↔ Proxmark (strip)    | `.rfid` file for Flipper Zero   |
| Flipper → Proxmark  | Flipper ↔ Proxmark (add)      | `lf hid clone` command          |

---

*RFID Rodeo is released under the GNU Affero General Public License v3.0 (AGPL-3.0). Not affiliated with or endorsed by HID Global, Flipper Devices, or the RFID Research Group / Proxmark3.*
