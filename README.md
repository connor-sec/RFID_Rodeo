# RFID Rodeo

An offline, single-file HTML reference and calculator for Wiegand and smart-card (HID / Indala / TWIC / and related) bit formats. Runs entirely in your browser — no network, no dependencies, nothing leaves the page.

Maintained by [@connor-sys](https://github.com/connor-sys).

## Usage

Open `RFID-Rodeo-v0.3.1.html` in any modern browser. That's it — no install, no server.

## ⚠️ Authorized use only — for security research and education

**Authorized use.** This is an offline reference and calculator. It transforms values you enter; it does not read, write, transmit, or clone any physical card by itself. Use it only within an expressly authorized and documented testing scope. Accessing, duplicating, or using access-control credentials without authorization may violate law, contract, or organizational policy — authorization can come from ownership or from explicit permission to test a credential owned by someone else, such as your employer.

**Accuracy and production safety.** Bit layouts and parity follow public specifications and, where a format's exact parity mask is not published, the standard leading-even / trailing-odd Wiegand convention. Some formats are approximations. Outputs may be incomplete or incorrect. Do not use calculated values for production access decisions, credential issuance, or system changes without independently verifying them against the relevant specification and real hardware.

**Warranty and trademarks.** Provided "as is", without warranty of any kind. This is not legal advice. Not affiliated with or endorsed by HID Global, Flipper Devices, the RFID Research Group / Proxmark3, or any other vendor or project; all product names and trademarks belong to their respective owners.

## Why this exists

I built this while working on-site with no internet access. I needed to check a few card formats, but with no connection I couldn't reach an archived copy of 0xFFFF's site, http://cardinfo.barkweb.com.au.

Stuck offline, I thought of Michael Bazzell's [local OSINT tools](https://inteltechniques.com/tools/index.html) — self-contained pages that run entirely on your own machine, not dependent on his website being up. His tools are normally online-only, but after his site was repeatedly hit by DDoS attacks, he took them offline and made downloadable copies available to anyone who purchased his book, OSINT Techniques — so customers would never have to depend on his site staying up. That's exactly the philosophy this project borrows.

I also didn't want to run into what's rumored to have happened to 0xFFFF. The rumor is that the site (http://cardinfo.barkweb.com.au) was taken offline because the expense of keeping it running became unsustainable. True or not, I choose to make this a self-contained, offline file means it can't suffer the same fate.

The goal is simple: one fully offline HTML file you can keep on a laptop, a USB stick, or an SD card and open anywhere, anytime — internet or not.

## Features

* **~78 card formats** with detailed bit-layout tables and a universal color key by field type.
* **Per-format verification status** — each format is badged **Verified** (field positions and parity checked against the Proxmark client reference), **Documented** (published layout with the standard parity convention), or **Reference** (shown for completeness, not computed).
* **Per-format calculator** — encode field values into a raw frame, or decode a raw hex frame (with parity checks). Invalid input is rejected with a clear message rather than silently altered.
* **Compare two formats** side by side.
* **Identify a captured frame** — paste raw Wiegand bits (or hex) and it lists every format matching that length, ranked parity-valid first, with decoded fields.
* **Value converter** — Hex / Dec / Bin (bidirectional) plus ASCII and Yubico modHex, with an optional zero-pad.
* **Flipper ↔ Proxmark tool** — add parity to go Flipper → Proxmark, or strip and verify parity to go Proxmark → Flipper (accepts hex or Wiegand binary in both directions). It also generates a copy-ready Proxmark clone command (e.g. `lf hid clone -w H10301 --fc 95 --cn 3405`) and exports a ready-to-use Flipper `.rfid` key file.

> **On "Proxmark" vs "Proxmark3":** the tool says "Proxmark" generically — the Proxmark5 is expected to share the same client commands, and the iCopy-XS (reverse-engineered by Lab401) already runs Proxmark under the hood, so the label isn't tied to one device.

## Acknowledgments & Credits

This project stands entirely on the shoulders of others.

### 🙏 0xFFFF — the original creator

The heart of this reference began with the extraordinary work of 0xFFFF on the now-deprecated site http://cardinfo.barkweb.com.au. That site was a genuine labor of love — painstakingly documenting card formats, bit layouts, field positions, and parity schemes that countless researchers, locksmiths, and hobbyists have relied on for years. 

This local, offline page would not be possible without 0xFFFF. Many format tables and layouts here trace back to that foundational effort. Thank you, 0xFFFF, for the countless hours, the attention to detail, and the generosity of sharing it all freely all credit for the groundwork belongs to you. 🫡

### ⚡ Iceman

A major shout-out to Iceman. Without his tireless work, research, and stewardship of the Proxmark / RFID Research Group ecosystem, RFID hacking simply would not be where it is today. The tools, the firmware, the documentation, the relentless reverse-engineering — the entire field owes him an enormous debt. 

This project leans on that work directly: every format marked **Verified** has its field positions and parity transcribed and checked against the RFID Research Group (Iceman fork) Proxmark client, [`client/src/wiegand_formats.c`](https://github.com/RfidResearchGroup/proxmark3/blob/master/client/src/wiegand_formats.c).

### 🎤 Langston Clements & Dan Goga

A huge shout-out to Langston Clements & Dan Goga for their excellent DEF CON talk, [Flipping Locks — Remote Badge Cloning with the Flipper Zero and More](https://www.youtube.com/watch?v=ro-EkKjj_wc). Their research into how the Flipper Zero handles (and drops) Wiegand parity directly inspired and informed the Flipper ↔ Proxmark parity tool built into this page. Thank you both for sharing your work with the community.

## License

Released under the [GNU Affero General Public License v3.0](https://github.com/connor-sys/Access-Control-Bit-Format-Reference/blob/main/LICENSE) (AGPL-3.0).

This is a strong copyleft license: anyone who distributes this code or runs a modified version as a network/hosted service must make their complete source available under the same AGPL-3.0 terms. Copyright and license notices must be preserved.
