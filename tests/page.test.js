/* Compare RFID-Rodeo-v1.3.html with Proxmark-packed frames in vectors.json,
   and exercise the calculator, parity tool, and identify paths. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const PAGE = path.join(__dirname, '..', 'RFID-Rodeo-v1.3.html');
const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'vectors.json'), 'utf8'));
const failures = [];
function check(name, cond, detail) {
  if (cond) { console.log('ok  ' + name); return; }
  failures.push(name + (detail ? ' — ' + detail : ''));
  console.log('FAIL ' + name + (detail ? ' — ' + detail : ''));
}

function valsFor(st, v) {
  const vals = {};
  st.fields.forEach((fd) => {
    if (fd.name === 'fc' || fd.name === 'site' || fd.name === 'co') vals[fd.name] = v.fc;
    else if (fd.name === 'card' || fd.name === 'cn' || fd.name === 'csn') vals[fd.name] = v.cn;
    else if (fd.name === 'issue') vals[fd.name] = v.il;
    else if (fd.name === 'oem') vals[fd.name] = v.oem;
    else vals[fd.name] = '0';
  });
  return vals;
}

(async () => {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errs.push(String(e.message || e).split('\n')[0]));
  const dom = await JSDOM.fromFile(PAGE, {
    runScripts: 'dangerously',
    url: 'file://' + PAGE,
    virtualConsole: vc
  });
  const w = dom.window;
  const { F, specType, encode, decode, constrainVals } = w;
  check('page loads without script errors', errs.length === 0, errs.join('; '));
  check('35 verified formats', F.filter((f) => f.status === 'verified').length === 35);
  check('footer is v1.3', w.document.body.textContent.includes('v1.3'));
  check('no 48-bit H10302/H10304 stubs', !F.some((f) => /37BIT|HUGHES ID/.test(f.n)));
  const h10320 = F.find((f) => f.n.includes('H10320'));
  check('H10320 is 37-bit reference', h10320 && h10320.b === 37 && h10320.status === 'reference');
  const awid = F.find((f) => f.n === 'AWID RS2 34bit');
  check('AWID RS2 is 34 bits', awid && awid.b === 34 && specType(awid).total === 34);
  check('N10002 label', F.some((f) => f.n === 'HID 34bit - (N10002)'));
  check('Grinnell note mentions 217', (F.find((f) => /Grinnell/.test(f.n)).note || '').includes('217'));
  check('Keyscan note mentions 900', (F.find((f) => /Keyscan/.test(f.n)).note || '').includes('900'));

  const seen = new Set();
  vectors.cases.forEach((v) => {
    const f = F.find((x) => x.n === v.page);
    const st = specType(f);
    const tag = v.pm + ' v' + v.vector;
    if (!f || !st) { check(tag + ' present', false, 'missing on page'); return; }
    seen.add(f.n);
    const rawVals = valsFor(st, v);
    const useVals = v.substituteOem ? constrainVals(f, rawVals).vals : rawVals;
    const bits = encode(st, useVals).join('');
    check(tag + ' encode', bits === v.bits, bits === v.bits ? '' : '\n  page ' + bits + '\n  pm   ' + v.bits);
    const frame = v.bits.split('').map(Number);
    const d = decode(st, frame);
    const want = v.substituteOem ? constrainVals(f, valsFor(st, v)).vals : valsFor(st, v);
    const fieldOk = Object.keys(want).every((k) => d[k] === String(BigInt(want[k])));
    check(tag + ' decode fields', fieldOk, fieldOk ? '' : JSON.stringify(d));
    const parOk = !d.__p.length || d.__p.every(Boolean);
    check(tag + ' parity', parOk, (d.__p || []).join(','));
    const fixOk = !d.__fixed.length || d.__fixed.every(Boolean);
    check(tag + ' fixed', fixOk);
    const xorOk = !d.__computed.length || d.__computed.every(Boolean);
    check(tag + ' xor', xorOk);
  });
  const verifiedMissing = F.filter((f) => f.status === 'verified' && !seen.has(f.n)).map((f) => f.n);
  check('every verified format has a vector', verifiedMissing.length === 0, verifiedMissing.join(', '));
  ['HID ADT 31bit', 'HID 32bit Hewlett-Packard', 'HID 40bit Honeywell - (P10001)', 'Indala ASC 27bit', 'Tecom'].forEach((n) => {
    check('documented ' + n + ' has a vector', seen.has(n));
  });

  const gr = constrainVals(F.find((f) => /Grinnell/.test(f.n)), { fc: '1', card: '100' });
  check('Grinnell rejects FC other than 217', !!gr.error && /217/.test(gr.error));

  const doc = w.document;
  const sel = doc.getElementById('fpx_fmt');
  function pick(part) {
    ['fpx_pay', 'fpx_paybin', 'fpx_full', 'fpx_fullbin'].forEach((id) => { doc.getElementById(id).value = ''; });
    const opt = [...sel.options].find((o) => o.textContent.includes(part));
    if (!opt) throw new Error('format not in parity tool: ' + part);
    sel.value = opt.value;
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    return F[+opt.value];
  }
  function add(part, fields) {
    const f = pick(part);
    const st = specType(f);
    st.fields.forEach((fd) => {
      const el = doc.getElementById('fpx_fld_' + fd.name);
      if (el) el.value = fields[fd.name] != null ? String(fields[fd.name]) : '';
    });
    doc.getElementById('fpx_add').click();
    return {
      out: doc.getElementById('fpx_addout').textContent,
      cmd: doc.getElementById('fpx_cmd').value,
      note: doc.getElementById('fpx_cmdnote').textContent
    };
  }
  function binOf(text) {
    const m = text.match(/Wiegand binary: ([01]+)/);
    return m ? m[1] : '';
  }

  const h10301 = vectors.cases.find((v) => v.pm === 'H10301' && v.vector === 0);
  const a1 = add('H10301', { fc: h10301.fc, cn: h10301.cn });
  check('UI add H10301 matches Proxmark', binOf(a1.out) === h10301.bits, a1.cmd);
  check('UI H10301 command', a1.cmd === 'lf hid clone -w H10301 --fc ' + h10301.fc + ' --cn ' + h10301.cn, a1.cmd);

  const d102 = vectors.cases.find((v) => v.pm === 'D10202' && v.vector === 0);
  const a2 = add('D10202', { fc: d102.fc, card: d102.cn });
  check('UI add D10202 cover parity matches Proxmark', binOf(a2.out) === d102.bits);
  pick('D10202');
  doc.getElementById('fpx_fullbin').value = d102.bits;
  doc.getElementById('fpx_strip').click();
  check('UI strip valid D10202 is OK', /Parity: P1 OK, P2 OK/.test(doc.getElementById('fpx_stripout').textContent));

  const kas = vectors.cases.find((v) => v.pm === 'Kastle' && v.vector === 0);
  const a3 = add('Kastle', { issue: kas.il, fc: kas.fc, card: kas.cn });
  check('UI add Kastle matches Proxmark', binOf(a3.out) === kas.bits);
  check('Kastle command uses -i', a3.cmd === 'lf hid clone -w Kastle --fc ' + kas.fc + ' --cn ' + kas.cn + ' -i ' + kas.il, a3.cmd);
  check('Kastle command has no --issue', !a3.cmd.includes('--issue'));

  const hg = vectors.cases.find((v) => v.pm === 'HGen37' && v.vector === 0);
  const a4 = add('generic 37bit', { card: hg.cn });
  check('UI add HGen37 matches Proxmark', binOf(a4.out) === hg.bits);
  check('HGen37 command name', a4.cmd.startsWith('lf hid clone -w HGen37 '), a4.cmd);

  const ind = add('Indala 26bit', { fc: '10', card: '100' });
  check('Indala 26 uses lf hid clone -w ind26', /^lf hid clone -w ind26 --fc 10 --cn 100$/.test(ind.cmd), ind.cmd);
  const sim = add('Simplex 36bit', { fc: '10', issue: '1', card: '100' });
  check('Simplex uses S12906', sim.cmd.startsWith('lf hid clone -w S12906 ') && !sim.cmd.includes('--bin'), sim.cmd);
  const iscs = add('ISCS 38bit', { fc: '10', card: '100', oem: '7' });
  check('ISCS command', iscs.cmd === 'lf hid clone -w ISCS --fc 10 --cn 100 --oem 7', iscs.cmd);
  const bundy = add('Bundy', { oem: '12', fc: '10', card: '100' });
  check('Bundy emits --oem', bundy.cmd === 'lf hid clone -w BC40 --fc 10 --cn 100 --oem 12', bundy.cmd);
  const key = add('Keyscan', { oem: '0', fc: '10', card: '20' });
  check('Keyscan zero OEM command', key.cmd === 'lf hid clone -w C15001 --fc 10 --cn 20 --oem 900', key.cmd);
  check('Keyscan zero OEM note', /900/.test(key.out));

  const before = errs.length;
  pick('H10301');
  doc.getElementById('fpx_fld_fc').value = '12abc';
  doc.getElementById('fpx_fld_cn').value = '1';
  doc.getElementById('fpx_addout').textContent = 'SENTINEL';
  doc.getElementById('fpx_add').click();
  const letterOut = doc.getElementById('fpx_addout').textContent;
  check('parity tool rejects letters', /digits 0-9 only/.test(letterOut) && letterOut !== 'SENTINEL', letterOut);
  check('letters do not throw', errs.length === before, errs.slice(before).join('; '));

  const over = add('H10301', { fc: '999', cn: '1' });
  check('parity tool rejects FC 999', /exceeds 8-bit max/.test(over.out) && !/Wiegand binary/.test(over.out), over.out);
  pick('H10301');
  doc.getElementById('fpx_pay').value = 'zz12G-hi!!';
  doc.getElementById('fpx_add').click();
  const junk = doc.getElementById('fpx_addout').textContent;
  check('parity tool rejects junk hex', /hex digits/.test(junk) && !/Card Number: 18/.test(junk), junk);

  const i26 = F.findIndex((f) => f.n.includes('H10301'));
  doc.getElementById('f' + i26 + '_fc').value = '';
  doc.getElementById('f' + i26 + '_cn').value = '';
  doc.getElementById('f' + i26 + '_hex').value = 'ABCDEF123456';
  doc.querySelector('button.go[data-i="' + i26 + '"]').click();
  const hexOut = doc.getElementById('f' + i26 + '_out').textContent;
  check('calculator rejects over-long hex', /does not fit in 26 bits/.test(hexOut) && !/Binary:/.test(hexOut), hexOut);

  doc.getElementById('f' + i26 + '_hex').value = '';
  doc.getElementById('f' + i26 + '_fc').value = '999';
  doc.getElementById('f' + i26 + '_cn').value = '1';
  doc.querySelector('button.go[data-i="' + i26 + '"]').click();
  const fcOut = doc.getElementById('f' + i26 + '_out').textContent;
  check('calculator refuses out-of-range FC', /exceeds 8-bit max/.test(fcOut) && /No frame was emitted/.test(fcOut) && !/^Hex:/m.test(fcOut), fcOut);

  const wide = encode(specType(F[i26]), { fc: '255', cn: '1' }).join('');
  const hex7 = BigInt('0b' + wide).toString(16);
  check('sample H10301 hex is 7 digits', hex7.length === 7, hex7);
  doc.getElementById('id_bits').value = '';
  doc.getElementById('id_hex').value = hex7;
  doc.getElementById('id_len').value = '';
  doc.getElementById('id_go').click();
  const idOut = doc.getElementById('id_out').textContent;
  check('identify without length says so', /No bit length given/.test(idOut), idOut.split('\n')[0]);
  check('identify without length still finds 26-bit H10301', /26-bit frame/.test(idOut) && /H10301/.test(idOut) && /parity OK/.test(idOut));
  check('identify without length is not only 28 bits', !/^28-bit frame/.test(idOut));
  doc.getElementById('id_len').value = '26';
  doc.getElementById('id_go').click();
  const id26 = doc.getElementById('id_out').textContent;
  check('identify with length 26', /^26-bit frame/.test(id26) && /parity OK/.test(id26), id26.split('\n')[0]);

  dom.window.close();
  console.log('\n' + vectors.cases.length + ' Proxmark frames, ' + (failures.length ? failures.length + ' failed' : 'all checks passed'));
  if (failures.length) {
    failures.forEach((f) => console.log(' - ' + f));
    process.exit(1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
