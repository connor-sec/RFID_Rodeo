/* Rebuild tests/vectors.json from a Proxmark packer binary.
   HARNESS=/path/to/harness node gen-vectors.js
   The harness is a small driver around RfidResearchGroup/proxmark3
   client/src/wiegand_formats.c HIDPack(..., preamble=false). */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

const HARNESS = process.env.HARNESS;
if (!HARNESS) {
  console.error('Set HARNESS to the packer binary');
  process.exit(1);
}
const PAGE = path.join(__dirname, '..', 'rfid-rodeo.html');

function pm(args) {
  try {
    return execFileSync(HARNESS, args, { encoding: 'utf8' });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function pack(name, fc, cn, il, oem) {
  const out = pm(['pack', name, String(fc), String(cn), String(il), String(oem)]).trim();
  const parts = out.split(' ');
  if (parts[0] !== 'OK') throw new Error(name + ' pack failed: ' + out);
  return parts[3];
}

(async () => {
  const html = fs.readFileSync(PAGE, 'utf8');
  const dom = await JSDOM.fromFile(PAGE, { runScripts: 'dangerously', url: 'file://' + PAGE });
  const w = dom.window;
  const PM3 = Function('return ' + html.match(/var PM3=(\{.*?\});/)[1])();
  Object.assign(PM3, {
    'Indala 27bit': 'ind27',
    'Indala 29bit': 'ind29',
    'Indala/Kantech KSF': 'Kantech',
    'Indala 34bit Optus': 'Optus34',
    'Indala ASC 27bit': 'indasc27',
    Tecom: 'Tecom27'
  });
  const info = {};
  pm(['list']).trim().split('\n').forEach((line) => {
    const [name, bits, flags, maxfc, maxcn, maxil, maxoem] = line.split('\t');
    info[name.toLowerCase()] = {
      name, bits: +bits, flags,
      maxfc: BigInt(maxfc), maxcn: BigInt(maxcn), maxil: BigInt(maxil), maxoem: BigInt(maxoem)
    };
  });
  const extra = ['HID ADT 31bit', 'HID 32bit Hewlett-Packard', 'HID 40bit Honeywell - (P10001)', 'Indala ASC 27bit', 'Tecom'];
  const targets = w.F.filter((f) => f.status === 'verified' || extra.includes(f.n));
  const salts = [
    { fc: 0xAAAAAAAAn, cn: 0x5555AAAAn, il: 0xAn, oem: 0xAn },
    { fc: 0x55555555n, cn: 0xAAAA5555n, il: 0x5n, oem: 0x5n }
  ];
  const cases = [];
  for (const f of targets) {
    const code = PM3[f.n];
    if (!code) throw new Error('no Proxmark name for ' + f.n);
    const inf = info[code.toLowerCase()];
    if (!inf) throw new Error('unknown packer ' + code);
    salts.forEach((salt, i) => {
      let fc = inf.flags[0] === '1' ? (inf.maxfc & salt.fc) : 0n;
      let cn = inf.flags[1] === '1' ? (inf.maxcn & salt.cn) : 0n;
      let il = inf.flags[2] === '1' ? (inf.maxil & salt.il) : 0n;
      let oem = inf.flags[3] === '1' ? (inf.maxoem & salt.oem) : 0n;
      if (code === 'S12906b') { fc = 217n; il = 0n; oem = 0n; }
      if (inf.flags[0] === '1' && fc === 0n) fc = 1n;
      if (inf.flags[1] === '1' && cn === 0n) cn = 1n;
      if (inf.flags[2] === '1' && il === 0n) il = 1n;
      if (inf.flags[3] === '1' && oem === 0n) oem = 1n;
      const bits = pack(inf.name, fc, cn, il, oem);
      cases.push({
        page: f.n, pm: inf.name, status: f.status, vector: i,
        fc: fc.toString(), cn: cn.toString(), il: il.toString(), oem: oem.toString(),
        bits
      });
    });
    if (code === 'C15001') {
      cases.push({
        page: f.n, pm: inf.name, status: f.status, vector: 2,
        fc: '10', cn: '20', il: '0', oem: '0',
        bits: pack(inf.name, 10, 20, 0, 0),
        substituteOem: true
      });
    }
  }
  const doc = {
    proxmarkCommit: '0bf02faa49649e51e07896e42943beaf0a38e334',
    proxmarkDate: '2026-11-16',
    source: 'HIDPack from RfidResearchGroup/proxmark3 client/src/wiegand_formats.c, preamble false',
    cases
  };
  fs.writeFileSync(path.join(__dirname, 'vectors.json'), JSON.stringify(doc, null, 2) + '\n');
  console.log('wrote', cases.length, 'frames');
  dom.window.close();
})().catch((e) => { console.error(e); process.exit(1); });
