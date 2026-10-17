/* Rudra Studio — colouring page catalogue + procedural generators.
   Everything is generated locally and deterministically from a seed, so the
   site ships 10,000 unique pages without any image files. */
(function (root) {
  'use strict';

  var INK = '#243447';
  var PAPER = '#ffffff';
  var SW = 3.5;

  /* ---------------- seeded random ---------------- */
  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^ (h >>> 16)) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFor(key) { return mulberry32(xmur3(String(key))()); }
  function F(n) { return Math.round(n * 100) / 100; }
  function rr(rand, a, b) { return a + rand() * (b - a); }
  function ri(rand, a, b) { return a + Math.floor(rand() * (b - a + 1)); }
  function pol(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }

  /* ---------------- shape builders (strings) ---------------- */
  function circle(cx, cy, r) { return '<circle cx="' + F(cx) + '" cy="' + F(cy) + '" r="' + F(r) + '"/>'; }
  function ellipse(cx, cy, rx, ry, rot) {
    return '<ellipse cx="' + F(cx) + '" cy="' + F(cy) + '" rx="' + F(rx) + '" ry="' + F(ry) + '"' +
      (rot ? ' transform="rotate(' + F(rot) + ' ' + F(cx) + ' ' + F(cy) + ')"' : '') + '/>';
  }
  function rect(x, y, w, h, rx) {
    return '<rect x="' + F(x) + '" y="' + F(y) + '" width="' + F(w) + '" height="' + F(h) + '"' +
      (rx ? ' rx="' + F(rx) + '"' : '') + '/>';
  }
  function rectR(x, y, w, h, rot, cxr, cyr) {
    return '<rect x="' + F(x) + '" y="' + F(y) + '" width="' + F(w) + '" height="' + F(h) + '"' +
      ' transform="rotate(' + F(rot) + ' ' + F(cxr) + ' ' + F(cyr) + ')"/>';
  }
  function poly(pts) { return '<polygon points="' + pts.map(function (p) { return F(p[0]) + ',' + F(p[1]); }).join(' ') + '"/>'; }
  function pd(d) { return '<path d="' + d + '"/>'; }
  function ink(d) { return '<path data-ink="1" d="' + d + '"/>'; }

  function petal(cx, cy, r0, r1, deg, wd) {
    var b = pol(cx, cy, r0, deg), t = pol(cx, cy, r1, deg);
    var rc = (r0 + r1) / 2;
    var c1 = pol(cx, cy, rc, deg - wd / 2), c2 = pol(cx, cy, rc, deg + wd / 2);
    return pd('M ' + F(b[0]) + ' ' + F(b[1]) + ' Q ' + F(c1[0]) + ' ' + F(c1[1]) + ' ' + F(t[0]) + ' ' + F(t[1]) +
      ' Q ' + F(c2[0]) + ' ' + F(c2[1]) + ' ' + F(b[0]) + ' ' + F(b[1]) + ' Z');
  }
  function wedge(cx, cy, r0, r1, a0, a1) {
    var o0 = pol(cx, cy, r1, a0), o1 = pol(cx, cy, r1, a1), i1 = pol(cx, cy, r0, a1), i0 = pol(cx, cy, r0, a0);
    var la = (a1 - a0) > 180 ? 1 : 0;
    if (r0 <= 0.01) {
      return pd('M ' + F(cx) + ' ' + F(cy) + ' L ' + F(o0[0]) + ' ' + F(o0[1]) +
        ' A ' + F(r1) + ' ' + F(r1) + ' 0 ' + la + ' 1 ' + F(o1[0]) + ' ' + F(o1[1]) + ' Z');
    }
    return pd('M ' + F(o0[0]) + ' ' + F(o0[1]) +
      ' A ' + F(r1) + ' ' + F(r1) + ' 0 ' + la + ' 1 ' + F(o1[0]) + ' ' + F(o1[1]) +
      ' L ' + F(i1[0]) + ' ' + F(i1[1]) +
      ' A ' + F(r0) + ' ' + F(r0) + ' 0 ' + la + ' 0 ' + F(i0[0]) + ' ' + F(i0[1]) + ' Z');
  }
  function star(cx, cy, rO, rI, n, rot) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) pts.push(pol(cx, cy, i % 2 ? rI : rO, (rot || 0) + i * 180 / n));
    return poly(pts);
  }
  function heart(cx, cy, s) {
    var P = function (x, y) { return F(x) + ' ' + F(y); };
    return pd('M ' + P(cx, cy + s) +
      ' C ' + P(cx - s * 0.55, cy + s * 0.45) + ' ' + P(cx - s * 1.08, cy + s * 0.6) + ' ' + P(cx - s * 1.08, cy + s * 0.02) +
      ' C ' + P(cx - s * 1.08, cy - s * 0.5) + ' ' + P(cx - s * 0.44, cy - s * 0.72) + ' ' + P(cx, cy - s * 0.22) +
      ' C ' + P(cx + s * 0.44, cy - s * 0.72) + ' ' + P(cx + s * 1.08, cy - s * 0.5) + ' ' + P(cx + s * 1.08, cy + s * 0.02) +
      ' C ' + P(cx + s * 1.08, cy + s * 0.6) + ' ' + P(cx + s * 0.55, cy + s * 0.45) + ' ' + P(cx, cy + s) + ' Z');
  }
  function cloud(cx, cy, s) {
    return circle(cx - 0.95 * s, cy, 0.52 * s) + circle(cx, cy, 0.74 * s) + circle(cx + 0.98 * s, cy, 0.5 * s) +
      rect(cx - 1.25 * s, cy, 2.5 * s, 0.58 * s, 0.28 * s);
  }
  function sunShape(cx, cy, r, rays, face) {
    var b = circle(cx, cy, r);
    for (var i = 0; i < rays; i++) b += petal(cx, cy, r + 8, r + 46, i * 360 / rays, 26);
    if (face) b += eyePair(cx, cy - r * 0.1, r * 0.36, r * 0.12, r * 0.055) + smile(cx, cy + r * 0.22, r * 0.34, r * 0.3) + circle(cx - r * 0.62, cy + r * 0.22, r * 0.11) + circle(cx + r * 0.62, cy + r * 0.22, r * 0.11);
    return b;
  }
  function smile(cx, cy, w, d) {
    return pd('M ' + F(cx - w) + ' ' + F(cy) + ' Q ' + F(cx) + ' ' + F(cy + d) + ' ' + F(cx + w) + ' ' + F(cy) +
      ' Q ' + F(cx) + ' ' + F(cy + d * 0.35) + ' ' + F(cx - w) + ' ' + F(cy) + ' Z');
  }
  function eyePair(cx, cy, gap, r, pr) {
    return circle(cx - gap, cy, r) + circle(cx + gap, cy, r) +
      circle(cx - gap, cy + r * 0.08, pr) + circle(cx + gap, cy + r * 0.08, pr);
  }
  function waveBand(y, amp, waves, bottomY) {
    var N = 24, pts = [];
    for (var i = 0; i <= N; i++) {
      var x = i * 800 / N;
      pts.push([x, y + amp * Math.sin(i / N * Math.PI * 2 * waves)]);
    }
    pts.push([800, bottomY], [0, bottomY]);
    return poly(pts);
  }
  function eband(cx, cy, rx, ry, x, w) {
    var dx = (x + w / 2 - cx) / rx;
    var k = Math.sqrt(Math.max(0.04, 1 - dx * dx));
    var h = ry * k;
    return rect(x, cy - h, w, 2 * h);
  }

  /* ---------------- decorative sprinkles ---------------- */
  function decor(rand, kind) {
    var b = '', i, n;
    if (!kind || kind === 'none') return '';
    if (kind === 'dots') {
      n = ri(rand, 10, 16);
      for (i = 0; i < n; i++) {
        var x = rr(rand, 40, 760), y = rr(rand, 30, 290);
        if (x > 300 && x < 500 && y > 200) y = rr(rand, 30, 180);
        b += circle(x, y, rr(rand, 10, 22));
      }
    } else if (kind === 'stars') {
      n = ri(rand, 6, 10);
      for (i = 0; i < n; i++) b += star(rr(rand, 60, 740), rr(rand, 40, 250), rr(rand, 18, 32), rr(rand, 7, 13), 5, -90);
    } else if (kind === 'clouds') {
      n = ri(rand, 2, 3);
      for (i = 0; i < n; i++) b += cloud(rr(rand, 130, 670), rr(rand, 70, 210), rr(rand, 42, 66));
    } else if (kind === 'sprinkles') {
      n = ri(rand, 12, 18);
      for (i = 0; i < n; i++) {
        var sx = rr(rand, 50, 750), sy = rr(rand, 40, 250), sa = rr(rand, 0, 180);
        b += rectR(sx, sy, 34, 11, sa, sx + 17, sy + 5);
      }
    } else if (kind === 'hearts') {
      n = ri(rand, 6, 10);
      for (i = 0; i < n; i++) b += heart(rr(rand, 70, 730), rr(rand, 60, 240), rr(rand, 20, 36));
    } else if (kind === 'bubbles') {
      n = ri(rand, 8, 12);
      for (i = 0; i < n; i++) {
        var bx = rr(rand, 60, 740), by = rr(rand, 40, 220), br = rr(rand, 12, 30);
        b += circle(bx, by, br) + circle(bx + br * 0.4, by - br * 0.4, br * 0.4);
      }
    } else if (kind === 'flowers') {
      n = ri(rand, 3, 5);
      for (i = 0; i < n; i++) {
        var fx = rr(rand, 90, 710), fy = rr(rand, 70, 240), fr = rr(rand, 22, 38);
        for (var k = 0; k < 5; k++) b += circle(pol(fx, fy, fr, k * 72)[0], pol(fx, fy, fr, k * 72)[1], fr * 0.55);
        b += circle(fx, fy, fr * 0.4);
      }
    } else if (kind === 'leaves') {
      n = ri(rand, 5, 8);
      for (i = 0; i < n; i++) {
        var lx = rr(rand, 60, 740), ly = rr(rand, 40, 260), la = rr(rand, 0, 360);
        b += petal(lx, ly, 0, rr(rand, 28, 48), la, 48);
      }
    } else if (kind === 'sparkles') {
      n = ri(rand, 8, 14);
      for (i = 0; i < n; i++) {
        b += star(rr(rand, 60, 740), rr(rand, 40, 260), rr(rand, 16, 26), rr(rand, 4, 8), 4, 0);
      }
    }
    return b;
  }

  /* ---------------- zentangle motifs ---------------- */
  var ZM = [
    function (x, y, s, rand) { var o = ''; for (var i = 0; i < 3; i++) o += circle(x + s / 2, y + s / 2, s * (0.42 - i * 0.13)); return o; },
    function (x, y, s, rand) {
      var o = '';
      [[0, 0, 0], [1, 0, 90], [1, 1, 180], [0, 1, 270]].forEach(function (c) {
        o += wedge(x + c[0] * s, y + c[1] * s, 0, s * 0.92, c[2], c[2] + 88);
      });
      return o;
    },
    function (x, y, s, rand) {
      var o = '';
      for (var i = 0; i < 3; i++) o += rect(x + s * 0.12, y + s * 0.14 + i * (s * 0.72 / 3), s * 0.76, s * 0.72 / 3 - s * 0.05, s * 0.03);
      return o;
    },
    function (x, y, s, rand) {
      var o = '';
      for (var i = 0; i < 3; i++) o += rect(x + s * 0.12 + i * (s * 0.76 / 3), y + s * 0.12, s * 0.76 / 3 - s * 0.05, s * 0.76, s * 0.03);
      return o;
    },
    function (x, y, s, rand) {
      var o = '';
      for (var i = 0; i < 4; i++) o += wedge(x + s / 2, y + s, 0, s * 0.88, 200 + i * 35, 200 + (i + 1) * 35 - 4);
      return o;
    },
    function (x, y, s, rand) {
      var o = '', k = s / 3;
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) if ((i + j) % 2 === 0) o += rect(x + j * k + s * 0.02, y + i * k + s * 0.02, k - s * 0.04, k - s * 0.04, s * 0.02);
      return o;
    },
    function (x, y, s, rand) {
      var o = '';
      for (var i = 0; i < 5; i++) o += petal(x + s / 2, y + s / 2, s * 0.12, s * 0.46, i * 72, 46);
      o += circle(x + s / 2, y + s / 2, s * 0.11);
      return o;
    },
    function (x, y, s, rand) {
      var o = '';
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) o += circle(x + s * 0.2 + j * s * 0.3, y + s * 0.2 + i * s * 0.3, s * 0.07);
      return o;
    },
    function (x, y, s, rand) {
      var o = '';
      for (var i = 0; i < 3; i++) {
        var yy = y + s * 0.22 + i * s * 0.29;
        o += circle(x + s * 0.22, yy, s * 0.14) + circle(x + s * 0.5, yy, s * 0.14) + circle(x + s * 0.78, yy, s * 0.14);
      }
      return o;
    }
  ];

  /* ---------------- pixel-art masks ---------------- */
  function pip(x, y, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function normPoly(pts) {
    var mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    pts.forEach(function (p) { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); });
    return pts.map(function (p) {
      return [0.05 + (p[0] - mnx) / (mxx - mnx || 1) * 0.9, 0.05 + (p[1] - mny) / (mxy - mny || 1) * 0.9];
    });
  }
  var HEART_POLY = (function () {
    var pts = [];
    for (var i = 0; i < 72; i++) {
      var t = i / 72 * Math.PI * 2;
      var hx = 16 * Math.pow(Math.sin(t), 3);
      var hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push([hx, -hy]);
    }
    return normPoly(pts);
  })();
  var STAR_POLY = (function () {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = (-90 + i * 36) * Math.PI / 180;
      var r = i % 2 ? 0.22 : 0.5;
      pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]);
    }
    return pts;
  })();
  function inTri(x, y, p1, p2, p3) { return pip(x, y, [p1, p2, p3]); }
  var MASKS = [
    { name: 'heart', f: function (x, y) { return pip(x, y, HEART_POLY); } },
    { name: 'star', f: function (x, y) { return pip(x, y, STAR_POLY); } },
    { name: 'circle', f: function (x, y) { return Math.hypot(x - 0.5, y - 0.5) <= 0.46; } },
    { name: 'ring', f: function (x, y) { var d = Math.hypot(x - 0.5, y - 0.5); return d >= 0.26 && d <= 0.46; } },
    {
      name: 'smiley', f: function (x, y) {
        var d = Math.hypot(x - 0.5, y - 0.5);
        if (d > 0.46) return false;
        if (Math.hypot(x - 0.36, y - 0.38) <= 0.055 || Math.hypot(x - 0.64, y - 0.38) <= 0.055) return false;
        if (y > 0.5 && d >= 0.26 && d <= 0.38) return false;
        return true;
      }
    },
    {
      name: 'tree', f: function (x, y) {
        if (inTri(x, y, [0.5, 0.04], [0.32, 0.34], [0.68, 0.34])) return true;
        if (inTri(x, y, [0.5, 0.2], [0.24, 0.54], [0.76, 0.54])) return true;
        if (inTri(x, y, [0.5, 0.38], [0.14, 0.74], [0.86, 0.74])) return true;
        if (x >= 0.42 && x <= 0.58 && y >= 0.74 && y <= 0.94) return true;
        return false;
      }
    },
    {
      name: 'mushroom', f: function (x, y) {
        var cap = (Math.pow((x - 0.5) / 0.42, 2) + Math.pow((y - 0.4) / 0.3, 2) <= 1) && y <= 0.4;
        var stem = x >= 0.38 && x <= 0.62 && y >= 0.4 && y <= 0.86;
        var on = cap || stem;
        if (!on) return false;
        if (Math.hypot(x - 0.35, y - 0.3) <= 0.055 || Math.hypot(x - 0.6, y - 0.25) <= 0.055 || Math.hypot(x - 0.5, y - 0.38) <= 0.05) return false;
        return true;
      }
    },
    {
      name: 'butterfly', f: function (x, y) {
        var w1 = Math.pow((x - 0.33) / 0.21, 2) + Math.pow((y - 0.42) / 0.27, 2) <= 1;
        var w2 = Math.pow((x - 0.67) / 0.21, 2) + Math.pow((y - 0.42) / 0.27, 2) <= 1;
        var w3 = Math.pow((x - 0.35) / 0.15, 2) + Math.pow((y - 0.68) / 0.17, 2) <= 1;
        var w4 = Math.pow((x - 0.65) / 0.15, 2) + Math.pow((y - 0.68) / 0.17, 2) <= 1;
        var body = Math.pow((x - 0.5) / 0.05, 2) + Math.pow((y - 0.5) / 0.34, 2) <= 1;
        return w1 || w2 || w3 || w4 || body;
      }
    },
    {
      name: 'flower', f: function (x, y) {
        if (Math.hypot(x - 0.5, y - 0.5) <= 0.15) return true;
        for (var i = 0; i < 6; i++) {
          var a = i * 60 * Math.PI / 180;
          if (Math.hypot(x - (0.5 + 0.27 * Math.cos(a)), y - (0.5 + 0.27 * Math.sin(a))) <= 0.14) return true;
        }
        return false;
      }
    },
    {
      name: 'house', f: function (x, y) {
        var body = x >= 0.2 && x <= 0.8 && y >= 0.45 && y <= 0.9;
        var roof = inTri(x, y, [0.5, 0.1], [0.12, 0.48], [0.88, 0.48]);
        var chim = x >= 0.62 && x <= 0.72 && y >= 0.18 && y <= 0.34;
        if (!(body || roof || chim)) return false;
        if (x >= 0.42 && x <= 0.58 && y >= 0.62 && y <= 0.9) return false;
        if (x >= 0.24 && x <= 0.38 && y >= 0.52 && y <= 0.66) return false;
        return true;
      }
    },
    {
      name: 'cat', f: function (x, y) {
        var head = Math.hypot(x - 0.5, y - 0.55) <= 0.4;
        var earL = inTri(x, y, [0.3, 0.3], [0.18, 0.05], [0.44, 0.16]);
        var earR = inTri(x, y, [0.7, 0.3], [0.82, 0.05], [0.56, 0.16]);
        if (!(head || earL || earR)) return false;
        if (Math.hypot(x - 0.4, y - 0.47) <= 0.045 || Math.hypot(x - 0.6, y - 0.47) <= 0.045) return false;
        return true;
      }
    },
    {
      name: 'fish', f: function (x, y) {
        var body = Math.pow((x - 0.46) / 0.3, 2) + Math.pow((y - 0.5) / 0.22, 2) <= 1;
        var tail = inTri(x, y, [0.72, 0.5], [0.95, 0.28], [0.95, 0.72]);
        if (!(body || tail)) return false;
        if (Math.hypot(x - 0.32, y - 0.44) <= 0.04) return false;
        return true;
      }
    },
    {
      name: 'rocket', f: function (x, y) {
        var body = x >= 0.42 && x <= 0.58 && y >= 0.24 && y <= 0.78;
        var nose = inTri(x, y, [0.5, 0.04], [0.41, 0.26], [0.59, 0.26]);
        var finL = inTri(x, y, [0.42, 0.52], [0.28, 0.78], [0.42, 0.78]);
        var finR = inTri(x, y, [0.58, 0.52], [0.72, 0.78], [0.58, 0.78]);
        var fl = inTri(x, y, [0.5, 1.02], [0.42, 0.76], [0.58, 0.76]);
        if (!(body || nose || finL || finR || fl)) return false;
        if (Math.hypot(x - 0.5, y - 0.4) <= 0.07) return false;
        return true;
      }
    },
    {
      name: 'invader', f: null, rows: ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000']
    },
    {
      name: 'ghost', f: null, rows: ['00111111100', '01111111110', '11011111011', '11111111111', '11111111111', '11111111111', '11111111111', '11011011011']
    }
  ];
  MASKS.forEach(function (m) {
    if (!m.f && m.rows) {
      m.f = function (x, y) {
        var cols = m.rows[0].length, rows = m.rows.length;
        var c = Math.min(cols - 1, Math.floor(x * cols));
        var r = Math.min(rows - 1, Math.floor(y * rows));
        return m.rows[r].charAt(c) === '1';
      };
    }
  });

  /* ================= PROCEDURAL GENERATORS ================= */

  function genMandala(tpl, rand) {
    var n = tpl.n, cx = 400, cy = 400;
    var sym = 8 + ((n * 5) % 8);
    var rings = 4 + (n % 4);
    var style = n % 5;
    var r0 = 44 + ((n * 13) % 36);
    var avail = 330 - r0 - 20;
    var bw = avail / rings;
    var b = circle(cx, cy, r0);
    var r = r0;
    for (var i = 0; i < rings; i++) {
      var rr0 = r + 6, rr1 = rr0 + bw * 0.9;
      var type = (style + i) % 5;
      var k, a;
      if (type === 0) {
        for (k = 0; k < sym; k++) b += petal(cx, cy, rr0, rr1, k * 360 / sym, 360 / sym * 0.72);
      } else if (type === 1) {
        var mid = (rr0 + rr1) / 2, q = 360 / sym * 0.36;
        for (k = 0; k < sym; k++) {
          a = k * 360 / sym;
          b += poly([pol(cx, cy, rr0, a), pol(cx, cy, mid, a - q), pol(cx, cy, rr1, a), pol(cx, cy, mid, a + q)]);
        }
      } else if (type === 2) {
        for (k = 0; k < sym; k++) {
          a = k * 360 / sym + 360 / sym / 2;
          var pc = pol(cx, cy, (rr0 + rr1) / 2, a);
          b += circle(pc[0], pc[1], Math.min(bw, 360 / sym) * 0.32);
        }
      } else if (type === 3) {
        for (k = 0; k < sym; k++) b += wedge(cx, cy, rr0, rr1, k * 360 / sym + 4, (k + 1) * 360 / sym - 4);
      } else {
        var half = Math.round(sym / 2);
        var off = i % 2 ? 180 / half : 0;
        for (k = 0; k < half; k++) b += petal(cx, cy, rr0, rr1, k * 360 / half + off, 360 / half * 0.6);
        for (k = 0; k < half; k++) {
          var pc2 = pol(cx, cy, rr1, k * 360 / half + 360 / half / 2 + off);
          b += circle(pc2[0], pc2[1], Math.min(bw, 360 / half) * 0.2);
        }
      }
      r = rr1 + bw * 0.08;
    }
    var brim = r + 14;
    if (brim < 384) {
      var sc = Math.max(12, Math.min(30, 392 - brim));
      var kc = sym + (style % 3);
      for (k = 0; k < kc; k++) {
        var pt = pol(cx, cy, brim, k * 360 / kc);
        b += circle(pt[0], pt[1], sc);
      }
    }
    return b;
  }

  function genSnowflake(tpl, rand) {
    var n = tpl.n, cx = 400, cy = 400;
    var layers = 2 + (n % 3);
    var b = poly([pol(cx, cy, 62, 30), pol(cx, cy, 62, 90), pol(cx, cy, 62, 150), pol(cx, cy, 62, 210), pol(cx, cy, 62, 270), pol(cx, cy, 62, 330)]);
    for (var k = 0; k < 6; k++) {
      var a = k * 60;
      for (var j = 0; j < layers; j++) {
        var r = 104 + j * 62;
        b += poly([pol(cx, cy, r - 24, a), pol(cx, cy, r + 2, a - 11), pol(cx, cy, r + 34, a), pol(cx, cy, r + 2, a + 11)]);
        b += circle(pol(cx, cy, r + 4, a - 26)[0], pol(cx, cy, r + 4, a - 26)[1], 11);
        b += circle(pol(cx, cy, r + 4, a + 26)[0], pol(cx, cy, r + 4, a + 26)[1], 11);
        b += poly([pol(cx, cy, r - 34, a + 40), pol(cx, cy, r - 6, a + 20), pol(cx, cy, r - 34, a + 2)]);
        b += poly([pol(cx, cy, r - 34, a - 40), pol(cx, cy, r - 6, a - 20), pol(cx, cy, r - 34, a - 2)]);
        if (j === layers - 1) {
          b += circle(pol(cx, cy, r + 48, a)[0], pol(cx, cy, r + 48, a)[1], 14);
          b += poly([pol(cx, cy, r + 34, a - 8), pol(cx, cy, r + 58, a), pol(cx, cy, r + 34, a + 8)]);
        }
      }
    }
    for (k = 0; k < 6; k++) {
      var pc = pol(cx, cy, 88, k * 60 + 30);
      b += circle(pc[0], pc[1], 15);
    }
    return b;
  }

  function genPatterns(tpl, rand) {
    var n = tpl.n, cx = 400, cy = 400, v = n % 4, b = '', k, i;
    if (v === 0) {
      b += circle(cx, cy, 84);
      k = 14 + (n % 14);
      for (i = 0; i < k; i++) {
        b += wedge(cx, cy, 96, i % 2 ? 322 : 262, i * 360 / k + 4, (i + 1) * 360 / k - 4);
        if (i % 2 === 1) {
          var pd1 = pol(cx, cy, 344, (i + 0.5) * 360 / k);
          b += circle(pd1[0], pd1[1], 14);
        }
      }
    } else if (v === 1) {
      var arms = 8 + (n % 6), steps = 5 + (n % 3);
      b += circle(cx, cy, 40);
      for (k = 0; k < arms; k++) {
        for (i = 0; i < steps; i++) {
          var rr1 = 84 + i * 44, ang = 90 + k * 360 / arms + i * 16;
          var pc = pol(cx, cy, rr1, ang);
          b += circle(pc[0], pc[1], 26 - i * 3);
        }
      }
    } else if (v === 2) {
      var petals = 8 + (n % 4);
      var layers = 2 + (n % 2);
      for (var l = 0; l < layers; l++) {
        var R = 300 - l * 105;
        for (i = 0; i < petals; i++) b += petal(cx, cy, R * 0.24, R, i * 360 / petals + l * (180 / petals), 360 / petals * 0.8);
      }
      b += circle(cx, cy, 58);
      var kd = Math.round(petals / 2);
      for (i = 0; i < kd; i++) {
        var po = pol(cx, cy, 330, i * 360 / kd + 180 / kd);
        b += circle(po[0], po[1], 20);
      }
    } else {
      b += circle(cx, cy, 74);
      k = 12 + (n % 6);
      for (i = 0; i < k; i++) b += petal(cx, cy, 86, 296, i * 360 / k, 360 / k * 0.72);
      for (i = 0; i < k; i++) {
        b += wedge(cx, cy, 306, i % 2 ? 352 : 324, i * 360 / k + 3, (i + 1) * 360 / k - 3);
      }
    }
    return b;
  }

  function genStained(tpl, rand) {
    var n = tpl.n, b = '';
    if (n % 3 === 0) {
      var spokes = 12 + (n % 6);
      var ringR = [90, 150, 210, 270, 330];
      var rings = 3 + (n % 3);
      b += circle(400, 400, 58);
      for (var ri2 = 0; ri2 < rings; ri2++) {
        var r0 = ringR[ri2] - 60, r1 = ringR[ri2];
        for (var s = 0; s < spokes; s++) {
          var a0 = s * 360 / spokes + 2, a1 = (s + 1) * 360 / spokes - 2;
          b += wedge(400, 400, r0, r1 - 6, a0, a1);
        }
      }
    } else {
      var cols = 5 + (n % 5), rows2 = 5 + Math.floor(n / 3) % 5;
      var M = 36, W = 728, cell = W / cols;
      var verts = [];
      for (var jj = 0; jj <= rows2; jj++) {
        var row = [];
        for (var ii = 0; ii <= cols; ii++) {
          var jx = (ii > 0 && ii < cols) ? rr(rand, -0.3, 0.3) * cell : 0;
          var jy = (jj > 0 && jj < rows2) ? rr(rand, -0.3, 0.3) * cell : 0;
          row.push([M + ii * cell + jx, M + jj * cell + jy]);
        }
        verts.push(row);
      }
      for (jj = 0; jj < rows2; jj++) {
        for (ii = 0; ii < cols; ii++) {
          var a = verts[jj][ii], bb = verts[jj][ii + 1], c = verts[jj + 1][ii + 1], d = verts[jj + 1][ii];
          if (rand() < 0.24) {
            b += poly([a, bb, c]) + poly([a, c, d]);
          } else {
            b += poly([a, bb, c, d]);
            if (rand() < 0.3) {
              var cx = (a[0] + bb[0] + c[0] + d[0]) / 4, cy = (a[1] + bb[1] + c[1] + d[1]) / 4;
              b += circle(cx, cy, cell * 0.22);
            }
          }
        }
      }
    }
    return b;
  }

  function genMosaics(tpl, rand) {
    var n = tpl.n, b = '';
    var cols = 6 + (n % 4), margin = 46, W = 800 - margin * 2, cell = W / cols;
    var ell = n % 3 === 2;
    for (var r = 0; r < cols; r++) {
      for (var c = 0; c < cols; c++) {
        if (rand() < 0.12) continue;
        var cx = margin + c * cell + cell / 2 + rr(rand, -0.16, 0.16) * cell;
        var cy = margin + r * cell + cell / 2 + rr(rand, -0.16, 0.16) * cell;
        var rad = cell * rr(rand, 0.3, 0.46);
        var rot = rr(rand, 0, 180);
        if (ell) b += ellipse(cx, cy, rad, rad * rr(rand, 0.72, 1.28), rot);
        else b += circle(cx, cy, rad);
        if (rand() < 0.3) b += circle(cx, cy, rad * 0.52);
      }
    }
    return b;
  }

  function genZentangle(tpl, rand) {
    var n = tpl.n, b = '';
    var cols = n % 2 === 0 ? 4 : 5;
    var M = 40, W = 720, cell = W / cols, pad = 8;
    var offset = n % ZM.length;
    for (var r = 0; r < cols; r++) {
      for (var c = 0; c < cols; c++) {
        var x = M + c * cell + pad / 2, y = M + r * cell + pad / 2, size = cell - pad;
        var motif = ZM[(offset + r * cols + c) % ZM.length];
        b += motif(x, y, size, rand);
      }
    }
    return b;
  }

  function genPixel(tpl, rand) {
    var n = tpl.n;
    var sizes = [9, 10, 11, 12, 13, 14, 15, 16];
    var size = sizes[n % sizes.length];
    var kind = n % 4;
    var M = 50, W = 700, cell = W / size;
    var grid = [];
    for (var r = 0; r < size; r++) { grid.push([]); for (var c = 0; c < size; c++) grid[r].push(false); }
    if (kind < 3) {
      var mask = MASKS[n % MASKS.length];
      for (r = 0; r < size; r++) for (c = 0; c < size; c++) {
        grid[r][c] = mask.f((c + 0.5) / size, (r + 0.5) / size);
      }
    } else {
      var mode = Math.floor(n / MASKS.length) % 3;
      var density = 0.3 + (n % 3) * 0.08;
      var half = Math.ceil(size / 2);
      if (mode === 2) {
        for (r = 0; r < size; r++) for (c = 0; c < size; c++) {
          if (r === 0 || r === size - 1 || c === 0 || c === size - 1) grid[r][c] = true;
          else if (rand() < density * 0.6) grid[r][c] = true;
        }
      } else if (mode === 1) {
        for (r = 0; r < half; r++) for (c = 0; c < half; c++) {
          if (rand() < density) { grid[r][c] = true; grid[size - 1 - r][c] = true; grid[r][size - 1 - c] = true; grid[size - 1 - r][size - 1 - c] = true; }
        }
      } else {
        for (r = 0; r < size; r++) for (c = 0; c < half; c++) {
          if (rand() < density) { grid[r][c] = true; grid[r][size - 1 - c] = true; }
        }
      }
    }
    var b = '';
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) {
      if (grid[r][c]) b += rect(M + c * cell + 1.2, M + r * cell + 1.2, cell - 2.4, cell - 2.4);
    }
    return b;
  }

  function bloom(cx, cy, R, petals, layers, rot) {
    var b = '';
    for (var l = 0; l < layers; l++) {
      var r = R * (1 - l * 0.32);
      var nn = Math.max(4, petals - l);
      for (var i = 0; i < nn; i++) b += petal(cx, cy, r * 0.3, r, rot + 360 / nn * i + l * (180 / nn), 360 / nn * 0.78);
    }
    b += circle(cx, cy, R * 0.18);
    return b;
  }

  function genFlowers(tpl, rand) {
    var n = tpl.n, scene = n % 3, b = '';
    if (scene === 0) {
      var R = 170 + (n % 5) * 12;
      b += sunShape(660, 130, 62, 8, n % 2 === 0);
      b += cloud(150, 130, 46);
      b += bloom(400, 330, R, 6 + (n % 4), 2 + (n % 2), n * 23);
      b += rect(386, 330 + R * 0.6, 28, 300, 12);
      b += petal(400, 560, 10, 130, 210, 66);
      b += petal(400, 590, 10, 130, 330, 66);
      b += poly([[300, 700], [340, 620], [420, 700], [360, 700], [405, 640], [470, 700]]);
      b += poly([[430, 700], [470, 640], [540, 700]]);
    } else if (scene === 1) {
      b += poly([[300, 620], [500, 620], [472, 752], [328, 752]]);
      b += rect(352, 570, 96, 56, 8);
      b += rect(344, 356, 16, 230) ; b += rect(394, 306, 16, 280); b += rect(444, 356, 16, 230);
      b += bloom(310, 330, 105, 6 + (n % 3), 2, 10 + n);
      b += bloom(402, 268, 118, 6 + (n % 3), 2, 30 + n);
      b += bloom(494, 330, 105, 6 + (n % 3), 2, 55 + n);
      b += petal(352, 470, 10, 90, 205, 58) + petal(452, 470, 10, 90, 335, 58);
      b += decor(rand, 'dots');
    } else {
      b += sunShape(140, 120, 66, 10, true);
      b += cloud(620, 120, 52);
      b += waveBand(650, 16, 3, 800);
      var xs = [130, 250, 370, 490, 610, 700];
      for (var i = 0; i < xs.length; i++) {
        var h = 150 + (i % 4) * 30 + ((n * (i + 3)) % 40);
        b += rect(xs[i] - 9, 520 - h, 18, h + 190, 9);
        b += bloom(xs[i], 470 - h, 58 + (i % 3) * 12, 5 + ((n + i) % 4), 1 + ((n + i) % 2), i * 40);
        if (i % 2 === 0) b += petal(xs[i] + 8, 470, 8, 80, 20, 52);
        else b += petal(xs[i] - 8, 470, 8, 80, 160, 52);
      }
      var bx = 600, by = 260;
      b += ellipse(bx, by, 36, 26);
      b += rect(bx - 14, by - 26, 10, 52) + rect(bx + 6, by - 26, 10, 52);
      b += circle(bx - 6, by - 34, 16) + circle(bx + 12, by - 30, 14);
    }
    return b;
  }

  function genButterflies(tpl, rand) {
    var n = tpl.n, wing = n % 3, bg = Math.floor(n / 3) % 2, flow = n % 5 === 0;
    var b = '';
    if (bg === 1) b += decor(rand, 'dots');
    if (flow) b += decor(rand, 'flowers');
    var rw = '';
    if (wing === 0) {
      rw += pd('M 415 330 C 480 200 660 190 700 270 C 728 330 610 430 500 420 C 455 415 425 395 415 385 Z');
      rw += pd('M 425 420 C 520 430 640 470 630 560 C 615 650 480 640 435 555 C 420 520 418 460 425 420 Z');
      rw += circle(560, 290, 30) + circle(625, 322, 22) + circle(520, 352, 26);
      rw += circle(540, 540, 24) + circle(492, 502, 20);
    } else if (wing === 1) {
      rw += pd('M 415 330 C 480 175 700 160 722 300 C 736 420 560 452 415 392 Z');
      rw += pd('M 430 420 C 560 432 662 482 642 572 C 620 662 468 632 430 542 Z');
      rw += petal(585, 300, 14, 44, -60, 44) + petal(640, 330, 12, 36, -20, 44) + petal(560, 560, 12, 36, 60, 44);
    } else {
      rw += pd('M 415 330 C 470 205 620 180 668 246 C 700 292 640 330 600 336 C 668 352 700 420 630 452 C 560 482 440 430 415 388 Z');
      rw += pd('M 430 440 C 540 448 650 490 630 580 C 610 662 470 640 432 552 Z');
      rw += star(575, 285, 26, 10, 5, -90) + star(560, 555, 20, 8, 5, -90) + circle(635, 380, 16);
    }
    var leftGroup = '<g transform="translate(800 0) scale(-1 1)">' + rw + '</g>';
    var body = ellipse(400, 445, 36, 142) + circle(400, 292, 46);
    body += ink('M 382 258 C 362 210 336 196 318 168') + ink('M 418 258 C 438 210 464 196 482 168');
    body += circle(314, 162, 15) + circle(486, 162, 15);
    body += eyePair(400, 288, 17, 9, 4) + smile(400, 314, 16, 12);
    return b + leftGroup + rw + body;
  }

  /* ---------------- builder library: cute animals ---------------- */
  function faceHead(b, cx, cy, r) { return b + circle(cx, cy, r); }

  var ANIMALS = [
    {
      k: 'cat', title: 'Cuddly Cat', draw: function (rand) {
        var b = faceHead('', 400, 430, 236);
        b += poly([[262, 310], [212, 66], [426, 186]]) + poly([[538, 310], [588, 66], [374, 186]]);
        b += poly([[272, 282], [246, 130], [372, 202]]) + poly([[528, 282], [554, 130], [428, 202]]);
        b += eyePair(400, 394, 92, 34, 15);
        b += poly([[400, 486], [374, 450], [426, 450]]);
        b += smile(400, 512, 66, 56) + circle(268, 486, 30) + circle(532, 486, 30);
        b += ink('M 218 430 L 128 408') + ink('M 218 462 L 128 470') + ink('M 582 430 L 672 408') + ink('M 582 462 L 672 470');
        return b;
      }
    },
    {
      k: 'dog', title: 'Happy Dog', draw: function (rand) {
        var b = faceHead('', 400, 430, 226);
        b += ellipse(196, 356, 62, 128, -22) + ellipse(604, 356, 62, 128, 22);
        b += ellipse(400, 508, 118, 86);
        b += ellipse(400, 486, 42, 30);
        b += ellipse(400, 566, 42, 26);
        b += eyePair(400, 380, 86, 32, 14);
        b += circle(320, 350, 58);
        b += smile(400, 596, 30, 22);
        return b;
      }
    },
    {
      k: 'bear', title: 'Sweet Bear', draw: function (rand) {
        var b = circle(400, 438, 242) + circle(216, 262, 92) + circle(584, 262, 92);
        b += circle(216, 262, 50) + circle(584, 262, 50);
        b += eyePair(400, 392, 88, 30, 13);
        b += ellipse(400, 516, 112, 80) + ellipse(400, 490, 38, 26);
        b += smile(400, 556, 58, 44);
        return b;
      }
    },
    {
      k: 'panda', title: 'Panda Pal', draw: function (rand) {
        var b = circle(400, 438, 242) + circle(216, 262, 92) + circle(584, 262, 92);
        b += circle(216, 262, 50) + circle(584, 262, 50);
        b += ellipse(322, 400, 82, 96, -14) + ellipse(478, 400, 82, 96, 14);
        b += circle(322, 400, 34) + circle(478, 400, 34) + circle(322, 404, 14) + circle(478, 404, 14);
        b += ellipse(400, 486, 36, 26);
        b += smile(400, 540, 56, 42);
        return b;
      }
    },
    {
      k: 'koala', title: 'Koala Cuddles', draw: function (rand) {
        var b = circle(400, 448, 232) + circle(190, 268, 118) + circle(610, 268, 118);
        b += circle(190, 268, 66) + circle(610, 268, 66);
        b += eyePair(400, 398, 86, 27, 12);
        b += ellipse(400, 512, 66, 88);
        b += smile(400, 610, 52, 40);
        return b;
      }
    },
    {
      k: 'bunny', title: 'Bouncy Bunny', draw: function (rand) {
        var b = circle(400, 470, 220);
        b += ellipse(316, 130, 68, 190, -10) + ellipse(484, 130, 68, 190, 10);
        b += ellipse(316, 130, 38, 140, -10) + ellipse(484, 130, 38, 140, 10);
        b += eyePair(400, 428, 84, 31, 13);
        b += poly([[400, 506], [378, 478], [422, 478]]);
        b += smile(400, 528, 52, 40) + rect(382, 566, 16, 30, 6) + rect(402, 566, 16, 30, 6);
        b += circle(288, 512, 30) + circle(512, 512, 30);
        return b;
      }
    },
    {
      k: 'fox', title: 'Little Fox', draw: function (rand) {
        var b = circle(400, 440, 220);
        b += poly([[280, 302], [168, 40], [446, 176]]) + poly([[520, 302], [632, 40], [354, 176]]);
        b += poly([[288, 278], [214, 110], [390, 190]]) + poly([[512, 278], [586, 110], [410, 190]]);
        b += ellipse(340, 534, 84, 62) + ellipse(460, 534, 84, 62);
        b += eyePair(400, 408, 84, 30, 13);
        b += ellipse(400, 500, 34, 24);
        b += smile(400, 560, 52, 40);
        return b;
      }
    },
    {
      k: 'mouse', title: 'Tiny Mouse', draw: function (rand) {
        var b = circle(400, 460, 210);
        b += circle(212, 288, 118) + circle(588, 288, 118);
        b += circle(212, 288, 66) + circle(588, 288, 66);
        b += eyePair(400, 434, 76, 26, 11);
        b += circle(400, 522, 30);
        b += smile(400, 574, 44, 34) + rect(388, 606, 24, 26, 6);
        b += ink('M 300 540 L 200 512') + ink('M 300 566 L 200 570') + ink('M 500 540 L 600 512') + ink('M 500 566 L 600 570');
        return b;
      }
    },
    {
      k: 'pig', title: 'Cheeky Pig', draw: function (rand) {
        var b = circle(400, 440, 226);
        b += poly([[320, 280], [252, 118], [392, 196]]) + poly([[480, 280], [548, 118], [408, 196]]);
        b += eyePair(400, 388, 88, 30, 13);
        b += ellipse(400, 512, 108, 80);
        b += ellipse(362, 512, 17, 26) + ellipse(438, 512, 17, 26);
        b += smile(400, 610, 44, 32);
        return b;
      }
    },
    {
      k: 'frog', title: 'Jumping Frog', draw: function (rand) {
        var b = circle(280, 250, 84) + circle(520, 250, 84);
        b += circle(280, 250, 40) + circle(520, 250, 40);
        b += ellipse(400, 468, 262, 205);
        b += smile(400, 520, 130, 86);
        b += circle(250, 520, 34) + circle(550, 520, 34);
        b += ellipse(400, 380, 160, 60);
        return b;
      }
    },
    {
      k: 'owl', title: 'Wise Owl', draw: function (rand) {
        var b = ellipse(400, 452, 208, 248);
        b += poly([[240, 320], [200, 160], [330, 230]]) + poly([[560, 320], [600, 160], [470, 230]]);
        b += ellipse(400, 520, 132, 152);
        b += circle(305, 360, 86) + circle(495, 360, 86);
        b += circle(305, 360, 38) + circle(495, 360, 38);
        b += poly([[400, 470], [362, 408], [438, 408]]);
        b += ellipse(238, 470, 56, 150, -12) + ellipse(562, 470, 56, 150, 12);
        b += rect(180, 692, 440, 28, 14);
        b += petal(240, 692, 12, 90, 150, 48) + petal(560, 692, 12, 90, 30, 48);
        return b;
      }
    },
    {
      k: 'penguin', title: 'Waddling Penguin', draw: function (rand) {
        var b = ellipse(400, 452, 208, 258);
        b += ellipse(400, 512, 128, 188);
        b += circle(330, 316, 30) + circle(470, 316, 30) + circle(330, 320, 12) + circle(470, 320, 12);
        b += poly([[400, 400], [356, 360], [444, 360]]);
        b += ellipse(240, 470, 52, 140, -16) + ellipse(560, 470, 52, 140, 16);
        b += ellipse(330, 700, 62, 30) + ellipse(470, 700, 62, 30);
        b += waveBand(686, 8, 2, 800);
        return b;
      }
    },
    {
      k: 'bird', title: 'Song Bird', draw: function (rand) {
        var b = circle(420, 470, 182) + circle(400, 300, 118);
        b += ellipse(420, 520, 96, 92);
        b += poly([[286, 500], [152, 556], [286, 596]]);
        b += ellipse(492, 460, 64, 108, 22);
        b += poly([[486, 288], [572, 300], [486, 330]]);
        b += eyePair(408, 288, 34, 18, 8);
        b += circle(408, 300, 8);
        b += rect(158, 640, 480, 26, 13);
        b += petal(200, 640, 12, 80, 150, 46) + petal(600, 640, 12, 80, 30, 46);
        var n1 = circle(392, 510, 10) + circle(432, 520, 10) + circle(410, 545, 10);
        b += circle(624, 262, 22) + n1;
        return b;
      }
    },
    {
      k: 'duck', title: 'Rubber Duck', draw: function (rand) {
        var b = ellipse(400, 500, 218, 158) + circle(400, 310, 126);
        b += ellipse(516, 322, 74, 34);
        b += ellipse(348, 482, 120, 78, -14);
        b += eyePair(366, 296, 30, 16, 7);
        b += waveBand(600, 10, 2, 800);
        b += ink('M 200 636 Q 240 616 280 636') + ink('M 480 644 Q 520 624 560 644');
        return b;
      }
    },
    {
      k: 'turtle', title: 'Slow Turtle', draw: function (rand) {
        var b = wedge(400, 520, 0, 250, 180, 360);
        b += circle(656, 540, 62);
        b += eyePair(676, 522, 17, 11, 5);
        b += smile(656, 566, 22, 16);
        b += ellipse(300, 690, 72, 40) + ellipse(500, 690, 72, 40);
        b += poly([[150, 560], [70, 520], [86, 590]]);
        b += poly([[400, 388], [336, 424], [400, 460], [464, 424]]);
        b += poly([[400, 440], [330, 478], [400, 514], [470, 478]]);
        b += poly([[254, 470], [206, 424], [270, 428], [316, 458]]);
        b += poly([[546, 470], [594, 424], [530, 428], [484, 458]]);
        b += circle(400, 300, 34);
        b += circle(350, 270, 22) + circle(450, 270, 22);
        return b;
      }
    },
    {
      k: 'hamster', title: 'Chubby Hamster', names: ['Chubby Hamster', 'Little Hamster', 'Cheeky Hamster', 'Fluffy Hamster'],
      draw: function (rand) {
        var b = circle(400, 470, 210);
        b += circle(250, 310, 65) + circle(550, 310, 65) + circle(250, 310, 30) + circle(550, 310, 30);
        b += circle(290, 510, 70) + circle(510, 510, 70);
        b += eyePair(400, 420, 80, 26, 11);
        b += poly([[400, 480], [380, 455], [420, 455]]);
        b += smile(400, 505, 40, 28) + rect(390, 532, 20, 24, 6);
        b += ellipse(400, 610, 45, 65);
        return b;
      }
    },
    {
      k: 'hedgehog', title: 'Spiky Hedgehog', names: ['Spiky Hedgehog', 'Prickly Buddy', 'Little Hedgehog', 'Autumn Hedgehog'],
      draw: function (rand) {
        var b = '';
        for (var i = 0; i < 18; i++) {
          var pt = pol(400, 450, 230, 160 + i * 14);
          b += poly([[pt[0] - 25, pt[1]], [pt[0], pt[1] - 50], [pt[0] + 25, pt[1]]]);
        }
        b += ellipse(400, 470, 200, 170);
        b += circle(260, 500, 75);
        b += eyePair(300, 475, 25, 18, 8);
        b += circle(205, 500, 18);
        b += smile(275, 535, 26, 18);
        b += rect(330, 630, 40, 60, 16) + rect(470, 630, 40, 60, 16);
        return b;
      }
    },
    {
      k: 'squirrel', title: 'Bushy Squirrel', names: ['Bushy Squirrel', 'Acorn Squirrel', 'Nutty Squirrel', 'Tree Squirrel'],
      draw: function (rand) {
        var b = pd('M 480 620 C 650 630 730 420 680 290 C 630 170 480 180 500 320 C 510 400 580 440 540 530 C 510 590 460 590 440 600 Z');
        b += ellipse(370, 500, 120, 150);
        b += circle(340, 310, 95);
        b += poly([[280, 240], [250, 160], [315, 220]]) + poly([[365, 220], [420, 160], [395, 240]]);
        b += eyePair(320, 305, 25, 18, 8);
        b += poly([[260, 330], [240, 315], [260, 300]]);
        b += smile(290, 345, 25, 18);
        b += ellipse(320, 520, 35, 45);
        b += circle(305, 545, 22) + poly([[290, 545], [305, 580], [320, 545]]);
        return b;
      }
    },
    {
      k: 'snail', title: 'Speedy Snail', draw: function (rand) {
        var b = rect(120, 580, 470, 92, 46);
        b += circle(210, 540, 82);
        b += ink('M 178 498 C 168 440 156 416 148 396') + ink('M 242 498 C 252 440 264 416 272 396');
        b += circle(146, 386, 26) + circle(274, 386, 26);
        b += circle(146, 386, 11) + circle(274, 386, 11);
        b += smile(210, 578, 34, 26);
        b += circle(410, 512, 150) + circle(396, 494, 104) + circle(382, 478, 62) + circle(370, 468, 26);
        b += circle(620, 560, 40);
        return b;
      }
    }
  ];

  /* ---------------- builder library: fresh vegetables ---------------- */
  var VEGETABLES = [
    {
      k: 'carrot', title: 'Crunchy Carrot', names: ['Crunchy Carrot', 'Garden Carrot', 'Sweet Carrot', 'Baby Carrot', 'Big Carrot'],
      draw: function (rand) {
        var b = poly([[340, 280], [460, 280], [410, 680], [390, 680]]);
        b += petal(400, 270, 10, 150, -90, 48) + petal(380, 270, 10, 140, -120, 42) + petal(420, 270, 10, 140, -60, 42);
        b += petal(360, 280, 10, 100, -145, 38) + petal(440, 280, 10, 100, -35, 38);
        b += ink('M 360 360 L 410 360') + ink('M 380 440 L 435 440') + ink('M 370 520 L 420 520') + ink('M 388 600 L 415 600');
        b += circle(400, 280, 22);
        b += waveBand(710, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'broccoli', title: 'Fluffy Broccoli', names: ['Fluffy Broccoli', 'Super Broccoli', 'Garden Tree Broccoli', 'Happy Broccoli'],
      draw: function (rand) {
        var b = rect(360, 440, 80, 240, 24);
        b += petal(340, 520, 10, 80, 210, 50) + petal(460, 520, 10, 80, 330, 50);
        b += circle(310, 340, 86) + circle(490, 340, 86);
        b += circle(350, 240, 84) + circle(450, 240, 84);
        b += circle(400, 180, 80) + circle(400, 330, 92);
        b += circle(240, 390, 64) + circle(560, 390, 64);
        b += circle(320, 310, 26) + circle(480, 310, 26) + circle(400, 260, 28);
        b += waveBand(730, 6, 2, 800);
        return b;
      }
    },
    {
      k: 'tomato', title: 'Juicy Tomato', names: ['Juicy Tomato', 'Cherry Tomato', 'Plump Tomato', 'Sunny Tomato'],
      draw: function (rand) {
        var b = circle(350, 480, 170) + circle(450, 480, 170);
        b += rect(390, 210, 20, 100, 8);
        b += star(400, 310, 78, 26, 5, -90);
        b += circle(400, 310, 24);
        b += petal(410, 240, 10, 90, 30, 56);
        b += circle(330, 420, 34) + circle(470, 420, 34);
        return b;
      }
    },
    {
      k: 'corn', title: 'Sweet Corn', names: ['Sweet Corn', 'Golden Cob', 'Crunchy Corn', 'Popcorn Plant'],
      draw: function (rand) {
        var b = rect(330, 260, 140, 380, 70);
        for (var r = 0; r < 7; r++) {
          for (var c = 0; c < 4; c++) {
            b += rect(345 + c * 28, 290 + r * 44, 24, 38, 8);
          }
        }
        b += petal(330, 640, 20, 250, 220, 52) + petal(470, 640, 20, 250, 320, 52);
        b += petal(360, 640, 20, 220, 200, 44) + petal(440, 640, 20, 220, 340, 44);
        b += rect(388, 640, 24, 80, 10);
        return b;
      }
    },
    {
      k: 'pepper', title: 'Bell Pepper', names: ['Sweet Bell Pepper', 'Crispy Capsicum', 'Red Pepper', 'Sunny Pepper'],
      draw: function (rand) {
        var b = ellipse(330, 480, 76, 170) + ellipse(400, 490, 76, 180) + ellipse(470, 480, 76, 170);
        b += rect(388, 220, 24, 100, 10);
        b += ellipse(400, 315, 68, 24);
        b += petal(404, 250, 8, 80, 35, 50);
        return b;
      }
    },
    {
      k: 'eggplant', title: 'Purple Eggplant', names: ['Purple Eggplant', 'Aubergine Buddy', 'Shiny Eggplant'],
      draw: function (rand) {
        var b = pd('M 370 290 C 460 300 520 440 500 570 C 480 670 320 690 280 590 C 250 490 300 300 370 290 Z');
        b += rectR(380, 190, 22, 105, -16, 390, 240);
        b += star(385, 305, 74, 28, 5, -90);
        b += circle(385, 305, 24);
        b += petal(370, 220, 8, 80, 200, 48);
        return b;
      }
    },
    {
      k: 'peapod', title: 'Pea Pod', names: ['Sweet Pea Pod', 'Three Little Peas', 'Green Peas in a Pod', 'Garden Peapod'],
      draw: function (rand) {
        var b = pd('M 170 480 Q 400 310 630 450 Q 430 630 170 480 Z');
        b += circle(280, 465, 42) + circle(360, 455, 46) + circle(440, 460, 46) + circle(520, 475, 42);
        b += circle(280, 465, 12) + circle(360, 455, 14) + circle(440, 460, 14) + circle(520, 475, 12);
        b += petal(160, 480, 0, 70, 220, 50) + petal(160, 480, 0, 60, 170, 45);
        return b;
      }
    },
    {
      k: 'pumpkin', title: 'Garden Pumpkin', names: ['Round Pumpkin', 'Harvest Pumpkin', 'Big Orange Pumpkin', 'Autumn Pumpkin'],
      draw: function (rand) {
        var b = ellipse(400, 490, 96, 176);
        b += ellipse(330, 490, 88, 166) + ellipse(470, 490, 88, 166);
        b += ellipse(268, 490, 64, 142) + ellipse(532, 490, 64, 142);
        b += rect(376, 290, 48, 70, 10);
        b += petal(420, 310, 10, 90, -30, 56);
        b += circle(400, 330, 16);
        b += waveBand(710, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'mushroom', title: 'Spotty Mushroom', names: ['Spotty Mushroom', 'Forest Mushroom', 'Fairy Mushroom', 'Little Toadstool'],
      draw: function (rand) {
        var b = wedge(400, 440, 0, 240, 180, 360);
        b += rect(350, 440, 100, 220, 28);
        b += circle(270, 370, 38) + circle(360, 290, 44) + circle(450, 320, 42) + circle(520, 390, 34) + circle(400, 400, 30);
        b += circle(310, 430, 24) + circle(490, 430, 24);
        b += poly([[280, 660], [330, 590], [380, 660]]) + poly([[420, 660], [470, 590], [520, 660]]);
        b += waveBand(710, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'onion', title: 'Red Onion', names: ['Sweet Red Onion', 'Layered Onion', 'Kitchen Onion', 'Spring Onion'],
      draw: function (rand) {
        var b = pd('M 400 240 C 490 310 540 450 510 560 C 470 660 330 660 290 560 C 260 450 310 310 400 240 Z');
        b += pd('M 400 270 C 460 330 490 440 470 540 C 440 620 360 620 330 540 C 310 440 340 330 400 270 Z');
        b += pd('M 400 310 C 430 360 450 430 435 500 C 420 560 380 560 365 500 C 350 430 370 360 400 310 Z');
        b += rect(390, 150, 20, 95, 8);
        b += petal(390, 170, 10, 80, -135, 40) + petal(410, 170, 10, 80, -45, 40);
        b += ink('M 370 650 L 350 710') + ink('M 390 655 L 390 720') + ink('M 410 655 L 410 720') + ink('M 430 650 L 450 710');
        return b;
      }
    },
    {
      k: 'radish', title: 'Pink Radish', names: ['Pink Radish', 'Spicy Radish', 'Crisp Radish', 'Garden Radish'],
      draw: function (rand) {
        var b = circle(400, 480, 160);
        b += poly([[385, 620], [400, 730], [415, 620]]);
        b += petal(400, 320, 10, 170, -90, 52);
        b += petal(380, 320, 10, 150, -125, 48) + petal(420, 320, 10, 150, -55, 48);
        b += circle(360, 440, 28) + circle(440, 440, 28);
        b += waveBand(720, 6, 2, 800);
        return b;
      }
    },
    {
      k: 'cucumber', title: 'Cool Cucumber', names: ['Cool Cucumber', 'Crispy Cucumber', 'Garden Zucchini', 'Green Gherkin'],
      draw: function (rand) {
        var b = ellipse(380, 460, 110, 230, 25);
        for (var i = 0; i < 6; i++) {
          b += circle(330 + (i % 2) * 50, 330 + i * 50, 16);
        }
        b += circle(570, 560, 75);
        b += circle(570, 560, 55);
        for (var k = 0; k < 6; k++) {
          var pt = pol(570, 560, 32, k * 60);
          b += ellipse(pt[0], pt[1], 8, 14, k * 60);
        }
        return b;
      }
    },
    {
      k: 'potato', title: 'Happy Potato', names: ['Happy Potato', 'Golden Potato', 'Little Spud', 'Mashed Potato Pal'],
      draw: function (rand) {
        var b = ellipse(400, 470, 215, 155);
        b += eyePair(400, 430, 66, 26, 11);
        b += smile(400, 490, 46, 32);
        b += circle(310, 490, 22) + circle(490, 490, 22);
        b += circle(260, 390, 14) + circle(530, 380, 14) + circle(350, 570, 14) + circle(460, 560, 14);
        b += petal(400, 320, 10, 80, -90, 44);
        b += waveBand(710, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'avocado', title: 'Creamy Avocado', names: ['Creamy Avocado', 'Avocado Half', 'Guacamole Pal', 'Nutty Avocado'],
      draw: function (rand) {
        var b = pd('M 400 170 C 470 170 510 280 540 440 C 560 550 490 670 400 670 C 310 670 240 550 260 440 C 290 280 330 170 400 170 Z');
        b += pd('M 400 210 C 455 210 485 300 510 435 C 525 530 470 635 400 635 C 330 635 275 530 290 435 C 315 300 345 210 400 210 Z');
        b += circle(400, 490, 85);
        b += circle(420, 470, 24);
        b += petal(400, 170, 5, 60, -90, 40);
        return b;
      }
    }
  ];

  /* ---------------- builder library: sweet fruits ---------------- */
  var FRUITS = [
    {
      k: 'apple', title: 'Crisp Apple', names: ['Crisp Apple', 'Red Apple', 'Sweet Apple', 'Apple Orchard', 'Juicy Apple'],
      draw: function (rand) {
        var b = circle(355, 470, 175) + circle(445, 470, 175);
        b += rect(392, 230, 18, 95, 8);
        b += petal(404, 250, 10, 110, -30, 60);
        b += circle(330, 430, 34);
        b += petal(360, 480, 8, 50, 210, 40) + petal(440, 480, 8, 50, 330, 40);
        return b;
      }
    },
    {
      k: 'banana', title: 'Sunny Banana', names: ['Sunny Banana', 'Banana Bunch', 'Sweet Banana', 'Monkey Banana'],
      draw: function (rand) {
        var b = pd('M 260 270 C 380 230 550 320 570 520 C 580 620 500 680 430 680 C 490 620 510 520 440 400 C 370 280 260 270 260 270 Z');
        b += pd('M 230 330 C 340 300 480 380 500 550 C 510 630 440 685 380 685 C 430 630 450 540 390 440 C 330 340 230 330 230 330 Z');
        b += rect(240, 250, 40, 40, 8);
        b += circle(430, 680, 14) + circle(380, 685, 12);
        b += star(640, 200, 26, 11, 5, -90) + circle(160, 600, 16);
        return b;
      }
    },
    {
      k: 'strawberry', title: 'Sweet Strawberry', names: ['Sweet Strawberry', 'Berry Delicious', 'Summer Strawberry', 'Wild Strawberry'],
      draw: function (rand) {
        var b = pd('M 400 680 C 260 560 230 360 400 340 C 570 360 540 560 400 680 Z');
        b += star(400, 330, 88, 30, 5, -90);
        b += rect(392, 220, 16, 75, 7);
        var seeds = [[350, 420], [450, 420], [400, 460], [330, 490], [470, 490], [370, 530], [430, 530], [400, 580], [360, 610], [440, 610]];
        for (var i = 0; i < seeds.length; i++) b += ellipse(seeds[i][0], seeds[i][1], 10, 16, 10);
        return b;
      }
    },
    {
      k: 'orange', title: 'Juicy Orange', names: ['Juicy Orange', 'Sweet Citrus', 'Sunny Orange', 'Orange Slice'],
      draw: function (rand) {
        var b = circle(310, 460, 160);
        b += petal(310, 300, 10, 95, -60, 55);
        b += circle(540, 510, 150);
        b += circle(540, 510, 130);
        b += circle(540, 510, 36);
        for (var i = 0; i < 8; i++) {
          b += wedge(540, 510, 44, 120, i * 45 + 5, (i + 1) * 45 - 5);
        }
        return b;
      }
    },
    {
      k: 'grapes', title: 'Juicy Grapes', names: ['Juicy Grapes', 'Grape Bunch', 'Purple Grapes', 'Sweet Vineyard'],
      draw: function (rand) {
        var b = '';
        var g = [
          [340, 330], [400, 330], [460, 330],
          [310, 385], [370, 385], [430, 385], [490, 385],
          [340, 440], [400, 440], [460, 440],
          [370, 495], [430, 495],
          [400, 550], [400, 605]
        ];
        for (var i = 0; i < g.length; i++) b += circle(g[i][0], g[i][1], 36);
        b += rect(392, 190, 16, 110, 7);
        b += petal(390, 240, 10, 130, -140, 64) + petal(410, 240, 10, 130, -35, 64);
        b += ink('M 430 210 Q 520 180 510 240 Q 500 280 470 270');
        return b;
      }
    },
    {
      k: 'watermelon', title: 'Watermelon Slice', names: ['Watermelon Slice', 'Summer Watermelon', 'Sweet Melon', 'Picnic Slice'],
      draw: function (rand) {
        var b = wedge(400, 370, 0, 290, 15, 165);
        b += wedge(400, 370, 255, 290, 15, 165);
        var seeds = [[290, 450], [360, 470], [440, 470], [510, 450], [330, 530], [400, 550], [470, 530], [370, 600], [430, 600]];
        for (var i = 0; i < seeds.length; i++) b += ellipse(seeds[i][0], seeds[i][1], 12, 20, 8 - i * 4);
        return b;
      }
    },
    {
      k: 'pineapple', title: 'Tropical Pineapple', names: ['Tropical Pineapple', 'Sweet Pineapple', 'Crown Pineapple', 'Island Fruit'],
      draw: function (rand) {
        var b = ellipse(400, 490, 160, 210);
        for (var r = 0; r < 5; r++) {
          for (var c = 0; c < 4; c++) {
            b += star(290 + c * 75, 340 + r * 70, 24, 12, 4, 0);
          }
        }
        b += petal(400, 290, 10, 210, -90, 44);
        b += petal(380, 290, 10, 190, -120, 40) + petal(420, 290, 10, 190, -60, 40);
        b += petal(360, 300, 10, 160, -145, 36) + petal(440, 300, 10, 160, -35, 36);
        return b;
      }
    },
    {
      k: 'cherries', title: 'Sweet Cherries', names: ['Sweet Cherries', 'Cherry Twins', 'Ruby Cherries', 'Cherry Tree'],
      draw: function (rand) {
        var b = circle(310, 560, 95) + circle(490, 560, 95);
        b += circle(290, 520, 26) + circle(470, 520, 26);
        b += ink('M 310 470 C 320 330 380 260 400 240') + ink('M 490 470 C 480 330 420 260 400 240');
        b += circle(400, 240, 16);
        b += petal(400, 240, 10, 110, -45, 54);
        b += star(660, 180, 26, 11, 5, -90) + circle(140, 220, 18);
        return b;
      }
    },
    {
      k: 'pear', title: 'Golden Pear', names: ['Golden Pear', 'Sweet Pear', 'Orchard Pear', 'Juicy Pear'],
      draw: function (rand) {
        var b = pd('M 400 230 C 460 230 480 330 520 450 C 550 560 490 670 400 670 C 310 670 250 560 280 450 C 320 330 340 230 400 230 Z');
        b += rect(392, 140, 16, 95, 8);
        b += petal(400, 180, 10, 100, -35, 54);
        b += circle(340, 480, 32);
        return b;
      }
    },
    {
      k: 'lemon', title: 'Zesty Lemon', names: ['Zesty Lemon', 'Yellow Lemon', 'Sour Lemon', 'Lemon Drop'],
      draw: function (rand) {
        var b = pd('M 210 460 C 240 330 370 290 480 340 C 580 390 620 510 570 590 C 470 650 310 610 240 550 Z');
        b += petal(210, 460, 0, 40, 205, 50) + petal(570, 590, 0, 40, 25, 50);
        b += petal(360, 300, 10, 100, -85, 52);
        b += circle(380, 470, 120);
        b += circle(380, 470, 95);
        for (var i = 0; i < 6; i++) {
          b += wedge(380, 470, 24, 85, i * 60 + 6, (i + 1) * 60 - 6);
        }
        return b;
      }
    },
    {
      k: 'peach', title: 'Fuzzy Peach', names: ['Fuzzy Peach', 'Sweet Peach', 'Georgia Peach', 'Sunny Peach'],
      draw: function (rand) {
        var b = circle(360, 470, 175) + circle(440, 470, 175);
        b += ink('M 400 300 C 410 400 410 540 400 645');
        b += rect(392, 210, 16, 95, 8);
        b += petal(404, 240, 10, 120, -35, 58);
        b += circle(320, 440, 30) + circle(480, 440, 30);
        return b;
      }
    },
    {
      k: 'mango', title: 'Tropical Mango', names: ['Tropical Mango', 'King Mango', 'Golden Mango', 'Sweet Mango'],
      draw: function (rand) {
        var b = pd('M 370 250 C 480 250 560 380 540 520 C 510 660 370 680 290 610 C 230 530 270 370 340 280 Z');
        b += rect(366, 170, 18, 90, 8);
        b += petal(370, 210, 10, 110, -135, 54) + petal(390, 210, 10, 110, -40, 54);
        b += circle(350, 430, 32);
        return b;
      }
    },
    {
      k: 'kiwi', title: 'Kiwi Fruit', names: ['Kiwi Fruit', 'Green Kiwi', 'Kiwi Slice', 'Fuzzy Kiwi'],
      draw: function (rand) {
        var b = circle(400, 450, 220);
        b += circle(400, 450, 185);
        b += ellipse(400, 450, 55, 40);
        for (var i = 0; i < 16; i++) {
          var pt = pol(400, 450, 105, i * 22.5);
          b += ellipse(pt[0], pt[1], 7, 14, i * 22.5 + 90);
        }
        b += circle(400, 450, 18);
        return b;
      }
    },
    {
      k: 'berries', title: 'Berry Mix', names: ['Berry Mix', 'Blueberry Friends', 'Raspberry Bunch', 'Sweet Berries'],
      draw: function (rand) {
        var b = circle(310, 520, 110) + circle(490, 520, 110) + circle(400, 360, 105);
        b += star(400, 280, 32, 12, 5, -90) + star(250, 470, 30, 12, 5, -90) + star(550, 470, 30, 12, 5, -90);
        b += circle(400, 360, 22) + circle(310, 520, 22) + circle(490, 520, 22);
        b += petal(400, 250, 8, 80, -90, 44);
        return b;
      }
    }
  ];

  /* ---------------- builder library: under the sea ---------------- */
  var SEA = [
    {
      k: 'dolphin', title: 'Playful Dolphin', names: ['Playful Dolphin', 'Jumping Dolphin', 'Ocean Dolphin', 'Dolphin Splash'],
      draw: function (rand) {
        var b = pd('M 180 500 C 240 310 470 290 620 420 C 670 470 730 480 770 460 C 740 500 700 520 620 500 C 470 540 320 580 180 500 Z');
        b += poly([[740, 460], [790, 410], [775, 475]]) + poly([[740, 500], [790, 550], [775, 485]]);
        b += poly([[410, 325], [440, 210], [480, 320]]);
        b += ellipse(450, 490, 70, 30, -35);
        b += eyePair(280, 440, 20, 16, 7);
        b += smile(270, 475, 30, 18);
        b += waveBand(630, 14, 3, 800);
        b += circle(660, 200, 18) + circle(700, 160, 12);
        return b;
      }
    },
    {
      k: 'shark', title: 'Friendly Shark', names: ['Friendly Shark', 'Baby Shark', 'Hammerhead Shark', 'Great White Shark'],
      draw: function (rand) {
        var b = pd('M 150 450 C 230 330 460 320 640 430 C 690 460 740 460 770 440 C 740 480 700 510 630 500 C 480 550 320 550 150 450 Z');
        b += poly([[420, 335], [460, 195], [510, 330]]);
        b += poly([[730, 440], [790, 370], [770, 450]]) + poly([[730, 490], [790, 560], [770, 480]]);
        b += ellipse(450, 495, 80, 32, -30);
        b += eyePair(260, 420, 20, 16, 7);
        b += smile(280, 470, 45, 24);
        b += ink('M 360 430 L 360 480 M 380 430 L 380 480 M 400 430 L 400 480');
        b += waveBand(660, 12, 3, 800);
        return b;
      }
    },
    {
      k: 'seaturtle', title: 'Sea Turtle', names: ['Sea Turtle', 'Honu Turtle', 'Baby Sea Turtle', 'Reef Turtle'],
      draw: function (rand) {
        var b = ellipse(400, 460, 170, 210);
        b += ellipse(400, 460, 120, 150);
        b += circle(400, 210, 60);
        b += eyePair(400, 195, 26, 14, 6) + smile(400, 235, 24, 16);
        b += ellipse(250, 340, 110, 45, -45) + ellipse(550, 340, 110, 45, 45);
        b += ellipse(280, 610, 75, 38, -30) + ellipse(520, 610, 75, 38, 30);
        b += poly([[390, 660], [400, 710], [410, 660]]);
        b += circle(400, 370, 34) + circle(400, 460, 38) + circle(400, 550, 34);
        b += waveBand(720, 8, 2, 800);
        return b;
      }
    },
    {
      k: 'seahorse', title: 'Shy Seahorse', names: ['Shy Seahorse', 'Coral Seahorse', 'Dancing Seahorse', 'Golden Seahorse'],
      draw: function (rand) {
        var b = circle(410, 270, 85);
        b += rect(270, 275, 95, 34, 16);
        b += star(450, 205, 38, 14, 5, -30);
        b += ellipse(420, 440, 95, 130);
        b += ellipse(390, 450, 65, 100);
        b += pd('M 420 560 C 430 660 340 730 280 670 C 240 620 290 560 340 580 C 370 600 360 630 330 630');
        b += poly([[495, 390], [565, 440], [495, 480]]);
        b += eyePair(385, 260, 20, 16, 7);
        b += circle(640, 180, 18) + circle(670, 130, 12) + circle(630, 300, 14);
        b += waveBand(730, 8, 2, 800);
        return b;
      }
    },
    {
      k: 'clam', title: 'Pearl Clam', names: ['Pearl Clam', 'Shining Pearl', 'Treasure Clam', 'Deep Sea Shell'],
      draw: function (rand) {
        var b = '';
        for (var i = 0; i < 7; i++) {
          var a0 = 190 + i * 23, a1 = a0 + 20;
          b += wedge(400, 630, 0, 280, a0, a1);
        }
        b += ellipse(400, 610, 240, 80);
        b += circle(400, 560, 60);
        b += circle(420, 545, 18);
        b += waveBand(720, 8, 2, 800);
        return b;
      }
    },
    {
      k: 'fish', title: 'Rainbow Fish', draw: function (rand) {
        var b = ellipse(380, 440, 232, 152);
        b += poly([[588, 440], [726, 330], [726, 550]]);
        b += poly([[352, 300], [436, 300], [394, 352]]) + poly([[348, 580], [432, 580], [390, 628]]);
        b += eyePair(302, 398, 20, 26, 11);
        b += smile(330, 496, 44, 34);
        b += circle(430, 400, 24) + circle(500, 470, 24) + circle(430, 540, 24);
        b += circle(620, 170, 18) + circle(670, 130, 12) + circle(575, 120, 14);
        return b;
      }
    },
    {
      k: 'whale', title: 'Big Whale', draw: function (rand) {
        var b = pd('M 120 480 C 140 356 300 320 470 330 C 620 340 706 408 696 466 C 686 522 500 566 300 556 C 214 551 140 522 120 480 Z');
        b += poly([[688, 462], [784, 386], [744, 468]]) + poly([[692, 490], [784, 552], [744, 476]]);
        b += ellipse(410, 540, 84, 40, -10);
        b += eyePair(252, 432, 22, 20, 9);
        b += smile(300, 500, 56, 40);
        b += petal(300, 306, 10, 120, 250, 46) + petal(300, 306, 10, 130, 290, 46);
        b += circle(330, 200, 20) + circle(290, 160, 14) + circle(364, 152, 16);
        b += waveBand(620, 12, 3, 800);
        return b;
      }
    },
    {
      k: 'octopus', title: 'Friendly Octopus', draw: function (rand) {
        var b = wedge(400, 470, 0, 258, 180, 360);
        b += eyePair(400, 352, 80, 40, 18);
        b += smile(400, 452, 60, 44);
        var xs = [212, 276, 340, 404, 468, 532, 596];
        for (var i = 0; i < xs.length; i++) {
          for (var k = 0; k < 4; k++) {
            var wx = xs[i] + Math.sin((k + 1) * 1.4 + i) * 22;
            b += circle(wx, 520 + k * 52, 42 - k * 7);
          }
        }
        b += waveBand(740, 8, 2, 800);
        b += circle(660, 180, 16) + circle(700, 140, 10);
        return b;
      }
    },
    {
      k: 'crab', title: 'Happy Crab', draw: function (rand) {
        var b = ellipse(400, 470, 212, 152);
        b += ink('M 320 348 C 310 300 306 284 300 262') + ink('M 480 348 C 490 300 494 284 500 262');
        b += circle(300, 252, 36) + circle(500, 252, 36);
        b += circle(300, 252, 15) + circle(500, 252, 15);
        b += smile(400, 470, 92, 66);
        b += wedge(190, 300, 0, 78, -30, 70) + wedge(190, 300, 0, 78, 110, 210);
        b += wedge(610, 300, 0, 78, 110, 210) + wedge(610, 300, 0, 78, 330, 430);
        var lg = [[258, 590], [322, 600], [386, 606]];
        for (var i = 0; i < 3; i++) {
          b += rectR(lg[i][0] - 9, lg[i][1], 18, 96, 18 - i * 18, lg[i][0], lg[i][1]);
          b += rectR(800 - lg[i][0] - 9, lg[i][1], 18, 96, -18 + i * 18, 800 - lg[i][0], lg[i][1]);
        }
        b += waveBand(730, 8, 2, 800);
        return b;
      }
    },
    {
      k: 'starfish', title: 'Sea Star', draw: function (rand) {
        var b = star(400, 420, 258, 112, 5, -90);
        b += eyePair(400, 420, 52, 22, 10);
        b += smile(400, 470, 38, 28);
        var tips = [[400, 178], [646, 356], [552, 648], [248, 648], [154, 356]];
        for (var i = 0; i < tips.length; i++) b += circle(tips[i][0], tips[i][1], 22);
        b += circle(400, 560, 14) + circle(400, 300, 12);
        b += waveBand(730, 8, 2, 800);
        return b;
      }
    },
    {
      k: 'jellyfish', title: 'Jelly Jellyfish', draw: function (rand) {
        var b = wedge(400, 400, 0, 236, 180, 360);
        b += eyePair(400, 330, 74, 36, 16);
        b += smile(400, 402, 52, 38);
        for (var i = 0; i < 5; i++) b += circle(196 + i * 102, 404, 36);
        for (i = 0; i < 5; i++) {
          for (var k = 0; k < 4; k++) {
            var wx = 214 + i * 96 + Math.sin(k * 1.4 + i * 1.7) * 26;
            b += circle(wx, 470 + k * 56, 34 - k * 6);
          }
        }
        b += circle(660, 170, 16) + circle(700, 130, 10) + circle(620, 110, 12);
        return b;
      }
    },
    {
      k: 'shell', title: 'Pretty Shell', draw: function (rand) {
        var b = '';
        for (var i = 0; i < 6; i++) {
          var a0 = -144 + i * 18, a1 = a0 + 15;
          b += wedge(400, 660, 0, i % 2 ? 330 : 306, a0, a1);
        }
        b += wedge(400, 660, 0, 70, 0, 360);
        b += waveBand(736, 6, 2, 800);
        b += circle(150, 180, 20) + circle(200, 140, 12) + circle(650, 160, 16);
        return b;
      }
    }
  ];

  /* ---------------- builder library: space ---------------- */
  var SPACE = [
    {
      k: 'rocket', title: 'Rocket Ship', draw: function (rand) {
        var b = rect(340, 238, 120, 306, 58);
        b += poly([[340, 246], [460, 246], [400, 116]]);
        b += circle(400, 330, 46);
        b += poly([[340, 430], [268, 560], [340, 560]]) + poly([[460, 430], [532, 560], [460, 560]]);
        b += poly([[352, 544], [448, 544], [400, 662]]);
        b += poly([[368, 556], [432, 556], [400, 630]]);
        b += star(150, 130, 30, 12, 5, -90) + star(668, 200, 24, 10, 5, -90);
        b += circle(660, 620, 14) + circle(120, 500, 12);
        return b;
      }
    },
    {
      k: 'planet', title: 'Ringed Planet', draw: function (rand) {
        var b = ellipse(400, 420, 330, 92, -14);
        b += circle(400, 420, 216);
        b += circle(330, 360, 44) + circle(462, 448, 56) + circle(378, 496, 34) + circle(500, 350, 26);
        b += circle(668, 140, 60) + circle(668, 140, 22);
        b += star(140, 160, 30, 12, 5, -90) + star(220, 640, 24, 10, 5, -90) + star(690, 640, 26, 11, 5, -90);
        return b;
      }
    },
    {
      k: 'astronaut', title: 'Space Kid', draw: function (rand) {
        var b = circle(400, 300, 152);
        b += circle(400, 312, 106);
        b += ellipse(400, 318, 78, 44);
        b += rect(330, 428, 140, 148, 42);
        b += ellipse(292, 452, 32, 64, 20) + ellipse(508, 452, 32, 64, -20);
        b += ellipse(358, 610, 38, 74) + ellipse(442, 610, 38, 74);
        b += ellipse(358, 690, 48, 26) + ellipse(442, 690, 48, 26);
        b += rect(474, 430, 74, 110, 14);
        b += rect(268, 456, 20, 120) + poly([[268, 456], [188, 462], [268, 486]]);
        b += waveBand(700, 12, 2, 800);
        b += star(660, 160, 26, 11, 5, -90) + circle(140, 200, 16);
        return b;
      }
    },
    {
      k: 'ufo', title: 'Flying Saucer', draw: function (rand) {
        var b = wedge(400, 330, 0, 122, 180, 360);
        b += ellipse(400, 358, 244, 72);
        for (var i = 0; i < 5; i++) b += circle(206 + i * 97, 396, 21);
        b += rectR(300, 420, 18, 74, -16, 300, 420) + rectR(482, 420, 18, 74, 16, 500, 420);
        b += rectR(390, 424, 20, 62, 0, 400, 424);
        b += poly([[330, 440], [470, 440], [568, 740], [232, 740]]);
        b += star(140, 150, 30, 12, 5, -90) + star(668, 130, 24, 10, 5, -90) + circle(690, 260, 10);
        return b;
      }
    },
    {
      k: 'moon', title: 'Happy Moon', draw: function (rand) {
        var b = circle(400, 400, 214);
        b += circle(320, 330, 46) + circle(470, 460, 56) + circle(360, 520, 32) + circle(496, 296, 24);
        b += eyePair(400, 380, 74, 34, 15);
        b += smile(400, 450, 56, 42);
        b += star(150, 160, 30, 12, 5, -90) + star(660, 180, 26, 11, 5, -90) + star(680, 620, 22, 9, 5, -90);
        return b;
      }
    },
    {
      k: 'comet', title: 'Comet', draw: function (rand) {
        var b = poly([[510, 260], [70, 320], [104, 386], [510, 372]]);
        b += poly([[500, 380], [140, 460], [180, 510], [505, 450]]);
        b += circle(540, 360, 96);
        b += circle(516, 336, 26) + circle(566, 386, 20);
        b += eyePair(540, 356, 30, 15, 7);
        b += smile(540, 396, 24, 18);
        b += star(680, 160, 30, 12, 5, -90) + star(160, 620, 24, 10, 5, -90) + circle(700, 580, 12);
        return b;
      }
    },
    {
      k: 'satellite', title: 'Satellite', draw: function (rand) {
        var b = rect(370, 360, 120, 120, 18);
        b += rect(150, 380, 180, 84, 10) + rect(530, 380, 180, 84, 10);
        b += rect(180, 402, 120, 40) + rect(560, 402, 120, 40);
        b += circle(400, 330, 58) + rect(390, 250, 20, 34);
        b += circle(400, 240, 26);
        b += ink('M 300 220 A 60 60 0 0 1 500 220');
        b += star(140, 200, 26, 11, 5, -90) + star(680, 620, 26, 11, 5, -90) + circle(120, 560, 12);
        return b;
      }
    },
    {
      k: 'alien', title: 'Friendly Alien', draw: function (rand) {
        var b = ellipse(400, 330, 170, 190);
        b += ellipse(340, 310, 46, 62) + ellipse(460, 310, 46, 62);
        b += ellipse(340, 322, 20, 28) + ellipse(460, 322, 20, 28);
        b += smile(400, 420, 52, 40);
        b += ink('M 344 160 C 330 116 322 96 312 74') + ink('M 456 160 C 470 116 478 96 488 74');
        b += circle(306, 64, 20) + circle(494, 64, 20);
        b += rect(340, 500, 120, 130, 54);
        b += ellipse(300, 530, 30, 62, 24) + ellipse(500, 530, 30, 62, -24);
        b += ellipse(360, 650, 34, 56) + ellipse(440, 650, 34, 56);
        b += star(150, 180, 28, 12, 5, -90) + circle(668, 210, 14);
        return b;
      }
    },
    {
      k: 'star', title: 'Star Buddy', draw: function (rand) {
        var b = star(400, 400, 258, 116, 5, -90);
        b += eyePair(400, 390, 56, 26, 11);
        b += smile(400, 452, 44, 34);
        b += circle(306, 462, 22) + circle(494, 462, 22);
        b += star(150, 156, 26, 11, 5, -90) + star(668, 170, 22, 9, 5, -90) + star(680, 640, 26, 11, 5, -90);
        return b;
      }
    }
  ];

  /* ---------------- builder library: yummy food ---------------- */
  var FOOD = [
    {
      k: 'burger', title: 'Juicy Burger', names: ['Juicy Burger', 'Cheeseburger Pal', 'Giant Hamburger', 'Snack Burger'],
      draw: function (rand) {
        var b = wedge(400, 340, 0, 190, 180, 360);
        for (var i = 0; i < 7; i++) {
          var pt = pol(400, 310, 110, -150 + i * 25);
          b += ellipse(pt[0], pt[1], 8, 14, 25);
        }
        b += pd('M 200 360 Q 250 400 300 360 Q 350 400 400 360 Q 450 400 500 360 Q 550 400 600 360 L 600 390 L 200 390 Z');
        b += poly([[260, 390], [540, 390], [400, 460]]);
        b += rect(210, 440, 380, 60, 20);
        b += rect(220, 510, 360, 75, 24);
        return b;
      }
    },
    {
      k: 'fries', title: 'Crispy Fries', names: ['Crispy Fries', 'Golden French Fries', 'Party Fries', 'Super Fries'],
      draw: function (rand) {
        var b = poly([[270, 420], [530, 420], [490, 690], [310, 690]]);
        var xs = [290, 325, 360, 395, 430, 465, 500];
        for (var i = 0; i < xs.length; i++) {
          var h = 180 + (i % 3) * 35;
          b += rect(xs[i] - 12, 420 - h, 24, h + 20, 8);
        }
        b += circle(400, 540, 45);
        b += star(400, 540, 36, 15, 5, -90);
        return b;
      }
    },
    {
      k: 'taco', title: 'Crunchy Taco', names: ['Crunchy Taco', 'Tasty Taco', 'Fiesta Taco', 'Taco Tuesday'],
      draw: function (rand) {
        var b = wedge(400, 520, 0, 250, 180, 360);
        b += pd('M 210 510 Q 280 430 350 510 Q 420 430 490 510 Q 550 440 600 510 Z');
        b += rect(310, 430, 35, 35, 6) + rect(440, 420, 35, 35, 6);
        b += circle(360, 490, 22) + circle(460, 480, 22) + circle(260, 480, 20);
        return b;
      }
    },
    {
      k: 'waffle', title: 'Golden Waffle', names: ['Golden Waffle', 'Belgian Waffle', 'Butter Waffle', 'Breakfast Waffle'],
      draw: function (rand) {
        var b = circle(400, 440, 230);
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 4; c++) {
            b += rect(270 + c * 70, 310 + r * 70, 50, 50, 10);
          }
        }
        b += rect(370, 410, 60, 60, 10);
        b += petal(410, 450, 10, 80, 45, 45);
        return b;
      }
    },
    {
      k: 'popcorn', title: 'Cinema Popcorn', names: ['Cinema Popcorn', 'Movie Popcorn', 'Butter Popcorn', 'Party Popcorn'],
      draw: function (rand) {
        var b = poly([[270, 430], [530, 430], [490, 710], [310, 710]]);
        for (var i = 0; i < 4; i++) {
          b += poly([[270 + i * 65, 430], [305 + i * 65, 430], [335 + i * 50, 710], [310 + i * 50, 710]]);
        }
        var pps = [[310, 390], [370, 360], [430, 360], [490, 390], [340, 310], [400, 280], [460, 310], [400, 220]];
        for (i = 0; i < pps.length; i++) b += circle(pps[i][0], pps[i][1], 46);
        return b;
      }
    },
    {
      k: 'icecream', title: 'Ice Cream Cone', draw: function (rand) {
        var b = poly([[354, 430], [446, 430], [400, 700]]);
        b += ink('M 372 470 L 420 560') + ink('M 400 490 L 436 560') + ink('M 380 540 L 408 600');
        b += circle(400, 360, 78) + circle(330, 430, 62) + circle(468, 430, 62);
        b += circle(400, 268, 30);
        b += ink('M 400 240 C 396 216 404 200 416 186');
        return b;
      }
    },
    {
      k: 'cupcake', title: 'Cupcake', draw: function (rand) {
        var b = poly([[330, 500], [470, 500], [500, 690], [300, 690]]);
        for (var i = 0; i < 4; i++) b += poly([[342 + i * 32, 500], [368 + i * 32, 500], [372 + i * 28, 690], [346 + i * 28, 690]]);
        b += ellipse(400, 462, 128, 62) + ellipse(400, 402, 102, 56) + ellipse(400, 350, 74, 46);
        b += circle(400, 306, 26);
        var sp = [[340, 430], [452, 442], [390, 380], [430, 340], [352, 356], [468, 392]];
        for (i = 0; i < sp.length; i++) b += rectR(sp[i][0], sp[i][1], 26, 9, i * 37, sp[i][0], sp[i][1]);
        return b;
      }
    },
    {
      k: 'donut', title: 'Donut', draw: function (rand) {
        var b = circle(400, 440, 232);
        var pts = [];
        for (var i = 0; i <= 26; i++) {
          var a = i / 26 * Math.PI * 2, r = 196 + Math.sin(i * 2.4) * 15;
          pts.push([400 + r * Math.cos(a), 440 + r * Math.sin(a)]);
        }
        b += poly(pts);
        b += circle(400, 440, 84);
        var sp = [[300, 320], [470, 300], [540, 400], [500, 540], [360, 580], [260, 500], [400, 358], [330, 430]];
        for (i = 0; i < sp.length; i++) b += rectR(sp[i][0], sp[i][1], 34, 11, i * 41, sp[i][0], sp[i][1]);
        return b;
      }
    },
    {
      k: 'cake', title: 'Party Cake', draw: function (rand) {
        var b = ellipse(400, 700, 300, 34);
        b += rect(240, 470, 320, 220, 22);
        b += rect(260, 420, 280, 62, 16);
        b += rect(280, 380, 240, 44, 12);
        var cxs = [320, 400, 480];
        for (var i = 0; i < 3; i++) {
          b += rect(cxs[i] - 11, 300, 22, 84, 8);
          b += petal(cxs[i], 274, 0, 46, 270, 60);
        }
        return b;
      }
    },
    {
      k: 'slice', title: 'Cake Slice', draw: function (rand) {
        var b = ellipse(400, 700, 300, 30);
        b += poly([[260, 660], [540, 660], [540, 595], [330, 595]]);
        b += poly([[330, 595], [540, 595], [540, 530], [400, 530]]);
        b += poly([[400, 530], [540, 530], [540, 465], [470, 465]]);
        b += poly([[470, 465], [540, 465], [540, 400]]);
        b += circle(510, 378, 26);
        b += ink('M 510 354 C 516 338 524 330 534 324');
        b += circle(300, 690, 14) + circle(340, 700, 12) + circle(372, 688, 10);
        return b;
      }
    },
    {
      k: 'pizza', title: 'Pizza Slice', draw: function (rand) {
        var b = poly([[400, 210], [240, 640], [560, 640]]);
        b += poly([[262, 610], [538, 610], [560, 640], [240, 640]]);
        var pep = [[400, 320], [340, 460], [462, 470], [400, 560], [318, 580], [482, 570]];
        for (var i = 0; i < pep.length; i++) b += circle(pep[i][0], pep[i][1], 36);
        b += petal(300, 400, 12, 46, 200, 46) + petal(500, 400, 12, 46, 340, 46) + petal(400, 660, 12, 40, 90, 46);
        return b;
      }
    },
    {
      k: 'candy', title: 'Candy', draw: function (rand) {
        var b = ellipse(400, 440, 152, 112);
        b += poly([[260, 440], [158, 340], [206, 440]]) + poly([[260, 440], [158, 540], [206, 440]]);
        b += poly([[540, 440], [642, 340], [594, 440]]) + poly([[540, 440], [642, 540], [594, 440]]);
        b += circle(368, 408, 22) + circle(432, 408, 22) + circle(368, 472, 22) + circle(432, 472, 22);
        return b;
      }
    },
    {
      k: 'lollipop', title: 'Lollipop', draw: function (rand) {
        var b = circle(400, 350, 172);
        b += circle(400, 350, 108) + circle(400, 350, 52);
        b += rect(388, 522, 24, 190, 10);
        b += petal(400, 138, 8, 74, 270, 40);
        return b;
      }
    },
    {
      k: 'cookie', title: 'Cookie', draw: function (rand) {
        var b = circle(400, 440, 214);
        var ch = [[320, 340], [470, 330], [540, 460], [440, 540], [300, 520], [400, 430], [360, 610]];
        for (var i = 0; i < ch.length; i++) b += circle(ch[i][0], ch[i][1], 30);
        return b;
      }
    },
    {
      k: 'lolly', title: 'Ice Lolly', draw: function (rand) {
        var b = rect(356, 220, 88, 330, 42);
        b += rect(390, 548, 20, 120, 8);
        b += rect(356, 300, 88, 40) + rect(356, 400, 88, 40);
        b += circle(360, 214, 26) + circle(400, 206, 28) + circle(440, 214, 26);
        return b;
      }
    }
  ];

  /* ---------------- builder library: things that go ---------------- */
  var VEHICLES = [
    {
      k: 'car', title: 'Little Car', draw: function (rand) {
        var b = rect(230, 420, 340, 120, 34);
        b += rect(296, 330, 208, 96, 30);
        b += rect(320, 356, 74, 52, 10) + rect(410, 356, 74, 52, 10);
        b += circle(310, 566, 58) + circle(490, 566, 58) + circle(310, 566, 26) + circle(490, 566, 26);
        b += circle(212, 480, 20) + circle(590, 480, 20);
        b += waveBand(676, 4, 2, 800);
        return b;
      }
    },
    {
      k: 'bus', title: 'School Bus', draw: function (rand) {
        var b = rect(210, 320, 380, 258, 26);
        b += rect(240, 356, 92, 74, 12) + rect(354, 356, 92, 74, 12) + rect(468, 356, 92, 74, 12);
        b += rect(468, 456, 92, 122, 12);
        b += rect(210, 430, 380, 26);
        b += circle(290, 602, 54) + circle(510, 602, 54) + circle(290, 602, 24) + circle(510, 602, 24);
        return b;
      }
    },
    {
      k: 'train', title: 'Steam Train', draw: function (rand) {
        var b = rect(300, 400, 260, 150, 20);
        b += rect(466, 316, 96, 96, 14);
        b += rect(326, 330, 64, 70, 8);
        b += ellipse(358, 322, 42, 16);
        b += circle(300, 240, 32) + circle(252, 196, 24) + circle(320, 170, 18);
        b += circle(340, 570, 44) + circle(430, 570, 44) + circle(520, 570, 44);
        b += circle(340, 570, 18) + circle(430, 570, 18) + circle(520, 570, 18);
        b += poly([[300, 550], [262, 620], [300, 620]]);
        b += waveBand(676, 4, 2, 800);
        return b;
      }
    },
    {
      k: 'plane', title: 'Airplane', draw: function (rand) {
        var b = ellipse(400, 420, 264, 92);
        b += poly([[420, 420], [230, 560], [420, 540]]);
        b += poly([[400, 420], [560, 520], [420, 520]]);
        b += poly([[600, 380], [694, 300], [660, 420]]) ;
        b += ellipse(320, 400, 46, 26);
        for (var i = 0; i < 4; i++) b += circle(380 + i * 56, 420, 13);
        b += cloud(160, 160, 54) + cloud(640, 620, 46);
        return b;
      }
    },
    {
      k: 'helicopter', title: 'Helicopter', names: ['Rescue Helicopter', 'Sky Copter', 'Flying Helicopter', 'Police Chopper'],
      draw: function (rand) {
        var b = ellipse(370, 420, 170, 120);
        b += wedge(310, 420, 0, 110, 120, 240);
        b += rect(360, 270, 20, 45, 6);
        b += rect(170, 255, 400, 22, 10);
        b += rect(510, 400, 210, 40, 12);
        b += rect(700, 350, 22, 140, 10);
        b += poly([[510, 390], [560, 350], [560, 430]]);
        b += rect(270, 530, 18, 70, 6) + rect(450, 530, 18, 70, 6);
        b += rect(210, 590, 320, 20, 10);
        b += cloud(150, 160, 50) + cloud(660, 180, 44);
        return b;
      }
    },
    {
      k: 'submarine', title: 'Yellow Submarine', names: ['Yellow Submarine', 'Deep Ocean Sub', 'Explorer Submarine', 'Aqua Sub'],
      draw: function (rand) {
        var b = ellipse(400, 460, 260, 140);
        b += rect(340, 270, 120, 65, 16);
        b += rect(385, 200, 20, 80, 8);
        b += rect(385, 190, 55, 20, 8);
        b += circle(290, 460, 42) + circle(400, 460, 42) + circle(510, 460, 42);
        b += circle(290, 460, 20) + circle(400, 460, 20) + circle(510, 460, 20);
        b += rect(110, 430, 50, 60, 10);
        b += poly([[120, 400], [80, 460], [120, 520]]);
        b += circle(660, 280, 22) + circle(690, 220, 16) + circle(640, 170, 14);
        b += waveBand(670, 10, 2, 800);
        return b;
      }
    },
    {
      k: 'scooter', title: 'Motor Scooter', names: ['Motor Scooter', 'Retro Moped', 'Speedy Scooter', 'Vespa Cruise'],
      draw: function (rand) {
        var b = circle(240, 570, 85) + circle(240, 570, 30);
        b += circle(560, 570, 85) + circle(560, 570, 30);
        b += pd('M 260 570 L 400 570 L 480 430 L 540 430 C 580 430 600 470 600 520 L 560 570 Z');
        b += rect(410, 390, 130, 34, 14);
        b += rectR(270, 310, 24, 250, 22, 280, 430);
        b += rect(210, 290, 110, 22, 10);
        b += circle(230, 330, 28);
        b += waveBand(690, 4, 2, 800);
        return b;
      }
    },
    {
      k: 'firetruck', title: 'Fire Truck', names: ['Big Fire Engine', 'Rescue Fire Truck', 'Brave Firefighters', 'Siren Fire Truck'],
      draw: function (rand) {
        var b = rect(170, 340, 350, 220, 20);
        b += rect(480, 380, 160, 180, 16);
        b += rect(510, 405, 105, 75, 10);
        b += circle(260, 590, 60) + circle(440, 590, 60) + circle(570, 590, 60);
        b += circle(260, 590, 26) + circle(440, 590, 26) + circle(570, 590, 26);
        b += rect(200, 280, 280, 26, 8);
        for (var i = 0; i < 7; i++) b += rect(230 + i * 35, 275, 10, 36, 4);
        b += circle(560, 355, 24);
        b += waveBand(680, 4, 2, 800);
        return b;
      }
    },
    {
      k: 'boat', title: 'Sail Boat', draw: function (rand) {
        var b = poly([[232, 520], [568, 520], [516, 624], [284, 624]]);
        b += rect(394, 292, 14, 232);
        b += poly([[410, 310], [410, 500], [270, 500]]);
        b += poly([[424, 336], [424, 500], [556, 500]]);
        b += poly([[388, 292], [424, 292], [406, 258]]);
        b += waveBand(640, 12, 3, 800);
        b += sunShape(660, 130, 54, 8, false);
        return b;
      }
    },
    {
      k: 'truck', title: 'Big Truck', draw: function (rand) {
        var b = rect(196, 356, 262, 186, 14);
        b += rect(458, 396, 148, 146, 16);
        b += rect(486, 420, 90, 56, 10);
        b += circle(262, 578, 52) + circle(420, 578, 52) + circle(548, 578, 52);
        b += circle(262, 578, 22) + circle(420, 578, 22) + circle(548, 578, 22);
        b += waveBand(668, 4, 2, 800);
        return b;
      }
    },
    {
      k: 'bicycle', title: 'Bicycle', draw: function (rand) {
        var b = circle(260, 540, 96) + circle(260, 540, 16) + circle(540, 540, 96) + circle(540, 540, 16);
        b += ink('M 260 540 L 380 540') + ink('M 380 540 L 330 420') + ink('M 330 420 L 470 420') + ink('M 470 420 L 540 540') + ink('M 380 540 L 470 420');
        b += rect(300, 396, 96, 20, 10);
        b += rect(452, 396, 88, 18, 9);
        b += circle(340, 540, 30);
        b += star(660, 180, 26, 11, 5, -90) + circle(150, 200, 16);
        return b;
      }
    },
    {
      k: 'balloon', title: 'Hot Air Balloon', draw: function (rand) {
        var b = wedge(400, 320, 0, 172, 180, 360) + wedge(400, 320, 0, 172, -30, 30);
        b += wedge(400, 320, 0, 172, 148, 212) + wedge(400, 320, 0, 172, 4, 72) + wedge(400, 320, 0, 172, 108, 176);
        b += ink('M 300 470 L 348 566') + ink('M 500 470 L 452 566');
        b += poly([[344, 566], [456, 566], [436, 640], [364, 640]]);
        b += cloud(170, 200, 50) + cloud(640, 180, 44) + cloud(620, 620, 46);
        return b;
      }
    },
    {
      k: 'robot', title: 'Robot Friend', draw: function (rand) {
        var b = rect(320, 240, 160, 132, 22);
        b += rect(390, 196, 20, 46, 8) + circle(400, 178, 24);
        b += circle(366, 300, 26) + circle(434, 300, 26) + circle(366, 304, 11) + circle(434, 304, 11);
        b += rect(356, 340, 88, 18, 9);
        b += rect(300, 390, 200, 198, 26);
        b += circle(348, 440, 16) + circle(400, 440, 16) + circle(452, 440, 16);
        b += rect(324, 500, 152, 54, 14);
        b += rect(238, 396, 48, 152, 22) + rect(514, 396, 48, 152, 22);
        b += circle(262, 572, 34) + circle(538, 572, 34);
        b += rect(330, 606, 52, 112, 18) + rect(418, 606, 52, 112, 18);
        b += ellipse(356, 730, 56, 28) + ellipse(444, 730, 56, 28);
        return b;
      }
    }
  ];

  /* ---------------- builder library: holidays & seasons ---------------- */
  var HOLIDAYS = [
    {
      k: 'snowman', title: 'Snowman', draw: function (rand) {
        var b = circle(400, 560, 152) + circle(400, 380, 110) + circle(400, 248, 76);
        b += rect(330, 158, 140, 26, 6) + rect(354, 96, 92, 64, 8);
        b += rect(332, 292, 136, 34, 12);
        b += circle(400, 300, 14) + circle(400, 366, 14) + circle(400, 432, 14);
        b += ink('M 296 380 L 168 320') + ink('M 504 380 L 632 320');
        b += eyePair(400, 232, 28, 13, 6);
        b += poly([[400, 258], [464, 274], [400, 292]]);
        b += waveBand(700, 10, 3, 800);
        return b;
      }
    },
    {
      k: 'tree', title: 'Christmas Tree', draw: function (rand) {
        var b = poly([[400, 130], [250, 320], [550, 320]]);
        b += poly([[400, 240], [214, 470], [586, 470]]);
        b += poly([[400, 360], [178, 630], [622, 630]]);
        b += rect(366, 630, 68, 76, 10);
        b += star(400, 96, 44, 19, 5, -90);
        var orn = [[330, 300], [470, 300], [280, 440], [520, 440], [350, 560], [452, 560], [400, 400]];
        for (var i = 0; i < orn.length; i++) b += circle(orn[i][0], orn[i][1], 24);
        return b;
      }
    },
    {
      k: 'gift', title: 'Gift Box', draw: function (rand) {
        var b = rect(258, 400, 284, 232, 16);
        b += rect(238, 350, 324, 62, 12);
        b += rect(368, 350, 64, 282) + rect(238, 470, 324, 48);
        b += petal(400, 332, 8, 74, 210, 60) + petal(400, 332, 8, 74, 330, 60);
        b += circle(400, 330, 26);
        b += star(160, 150, 30, 12, 5, -90) + star(640, 150, 26, 11, 5, -90) + circle(680, 620, 12);
        return b;
      }
    },
    {
      k: 'heart', title: 'Love Heart', draw: function (rand) {
        var b = heart(400, 420, 236);
        b += heart(180, 180, 54) + heart(630, 150, 44) + heart(660, 620, 58) + heart(140, 600, 48);
        b += star(240, 300, 26, 11, 5, -90) + star(560, 280, 22, 9, 5, -90);
        return b;
      }
    },
    {
      k: 'egg', title: 'Easter Egg', draw: function (rand) {
        var b = ellipse(400, 430, 190, 242);
        b += circle(350, 320, 26) + circle(452, 350, 22) + circle(390, 470, 26) + circle(320, 540, 22) + circle(470, 540, 26);
        b += star(400, 250, 34, 14, 5, -90) + star(340, 410, 26, 11, 5, -90) + star(460, 440, 24, 10, 5, -90);
        b += heart(400, 560, 44) + heart(300, 420, 30);
        return b;
      }
    },
    {
      k: 'pumpkin', title: 'Jack-o-Lantern', draw: function (rand) {
        var b = ellipse(400, 470, 110, 172);
        b += ellipse(330, 470, 92, 162) + ellipse(470, 470, 92, 162);
        b += ellipse(268, 470, 62, 138) + ellipse(532, 470, 62, 138);
        b += rect(374, 286, 52, 62, 10);
        b += poly([[340, 420], [310, 380], [370, 400]]) + poly([[460, 420], [490, 380], [430, 400]]);
        b += poly([[330, 530], [470, 530], [455, 580], [430, 550], [400, 585], [370, 550], [345, 580]]);
        return b;
      }
    }
  ];

  /* ---------------- builder library: mythical creatures ---------------- */
  var MYTHICAL = [
    {
      k: 'unicorn', title: 'Sparkle Unicorn', draw: function (rand) {
        var b = circle(400, 470, 218);
        b += ellipse(400, 592, 118, 88);
        b += poly([[372, 320], [428, 320], [400, 96]]);
        b += poly([[320, 310], [288, 208], [372, 272]]) + poly([[480, 310], [512, 208], [428, 272]]);
        b += circle(556, 388, 68) + circle(600, 474, 64) + circle(610, 562, 58);
        b += eyePair(400, 462, 86, 31, 13);
        b += smile(400, 626, 40, 30);
        return b;
      }
    },
    {
      k: 'dragon', title: 'Baby Dragon', draw: function (rand) {
        var b = ellipse(400, 560, 192, 152);
        b += circle(400, 328, 138);
        b += poly([[300, 436], [148, 300], [186, 480], [252, 502]]) + poly([[500, 436], [652, 300], [614, 480], [548, 502]]);
        b += eyePair(400, 312, 52, 21, 9);
        b += smile(400, 436, 44, 32);
        b += ellipse(330, 706, 52, 30) + ellipse(470, 706, 52, 30);
        return b;
      }
    },
    {
      k: 'mermaid', title: 'Little Mermaid', draw: function (rand) {
        var b = circle(400, 268, 118);
        b += eyePair(400, 274, 44, 18, 8) + smile(400, 318, 30, 22);
        b += rect(346, 396, 108, 122, 40);
        b += petal(420, 640, 46, 170, 52, 72) + petal(672, 690, 0, 86, -42, 62);
        b += waveBand(700, 10, 3, 800);
        return b;
      }
    },
    {
      k: 'fairy', title: 'Tiny Fairy', draw: function (rand) {
        var b = circle(400, 290, 112);
        b += eyePair(400, 296, 42, 17, 7) + smile(400, 338, 28, 20);
        b += poly([[400, 402], [330, 560], [470, 560]]);
        b += petal(262, 400, 20, 170, 158, 56) + petal(538, 400, 20, 170, 22, 56);
        b += star(590, 236, 36, 15, 5, -90);
        return b;
      }
    }
  ];

  /* ---------------- builder library: dinosaurs ---------------- */
  var DINOS = [
    {
      k: 'bronto', title: 'Long-Neck Dino', draw: function (rand) {
        var b = ellipse(390, 566, 208, 128);
        b += rectR(444, 272, 64, 232, -16, 476, 388);
        b += circle(508, 262, 60);
        b += rect(268, 648, 56, 116, 22) + rect(350, 656, 56, 116, 22) + rect(432, 656, 56, 116, 22) + rect(514, 648, 56, 116, 22);
        b += eyePair(490, 252, 22, 12, 5);
        b += smile(520, 292, 26, 18);
        b += waveBand(736, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'trex', title: 'T-Rex Roar', draw: function (rand) {
        var b = ellipse(400, 548, 168, 150);
        b += ellipse(520, 350, 150, 118);
        b += circle(548, 336, 26) + circle(548, 342, 11);
        b += rect(324, 624, 72, 140, 24) + rect(452, 632, 72, 140, 24);
        b += waveBand(764, 5, 3, 800);
        return b;
      }
    },
    {
      k: 'stego', title: 'Stego Smile', draw: function (rand) {
        var b = ellipse(420, 566, 240, 126);
        b += poly([[236, 470], [276, 332], [316, 470]]) + poly([[306, 452], [350, 300], [394, 452]]) + poly([[384, 442], [428, 286], [472, 442]]) + poly([[462, 448], [506, 310], [550, 448]]);
        b += circle(204, 540, 72);
        b += eyePair(204, 524, 24, 13, 6) + smile(204, 566, 28, 20);
        b += rect(286, 656, 58, 108, 22) + rect(380, 664, 58, 108, 22) + rect(474, 664, 58, 108, 22);
        b += waveBand(736, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'tricera', title: 'Triceratops', draw: function (rand) {
        var b = ellipse(452, 560, 188, 128);
        b += circle(322, 464, 112);
        b += poly([[234, 420], [196, 296], [268, 404]]) + poly([[288, 408], [318, 288], [330, 408]]);
        b += eyePair(252, 440, 22, 12, 5) + smile(228, 492, 26, 18);
        b += rect(360, 656, 55, 108, 22) + rect(448, 664, 55, 108, 22) + rect(534, 664, 55, 108, 22);
        b += waveBand(736, 8, 3, 800);
        return b;
      }
    }
  ];

  /* ---------------- builder library: weather ---------------- */
  var WEATHER = [
    {
      k: 'sunny', title: 'Sunny Day', draw: function (rand) {
        var b = sunShape(400, 330, 150, 12, true);
        b += cloud(170, 590, 58) + cloud(640, 620, 50);
        b += waveBand(716, 12, 2, 800);
        return b;
      }
    },
    {
      k: 'rain', title: 'Rainy Cloud', draw: function (rand) {
        var b = cloud(400, 250, 120);
        b += petal(264, 390, 0, 66, 90, 46) + petal(340, 420, 0, 74, 90, 46) + petal(420, 392, 0, 62, 90, 46) + petal(500, 424, 0, 72, 90, 46);
        b += ellipse(400, 706, 190, 30);
        return b;
      }
    },
    {
      k: 'rainbow', title: 'Rainbow Wonders', draw: function (rand) {
        var b = '';
        for (var i = 0; i < 4; i++) b += wedge(400, 600, 120 + i * 62, 120 + (i + 1) * 62 - 10, 180, 360);
        b += cloud(150, 600, 62) + cloud(650, 600, 62);
        b += sunShape(120, 150, 54, 8, true);
        return b;
      }
    }
  ];

  /* ---------------- builder library: music ---------------- */
  var MUSIC = [
    {
      k: 'guitar', title: 'Guitar', draw: function (rand) {
        var b = circle(400, 560, 158) + circle(400, 392, 112);
        b += circle(400, 545, 58) + circle(400, 545, 28);
        b += rect(380, 96, 40, 260, 12);
        b += rect(362, 48, 76, 60, 14);
        b += star(640, 660, 42, 18, 5, -90);
        return b;
      }
    },
    {
      k: 'drum', title: 'Big Drum', draw: function (rand) {
        var b = rect(270, 380, 260, 200, 26);
        b += ellipse(400, 380, 130, 48);
        b += rect(300, 630, 30, 70, 12) + rect(470, 630, 30, 70, 12);
        b += star(160, 180, 34, 14, 5, -90);
        return b;
      }
    },
    {
      k: 'xylo', title: 'Xylophone', draw: function (rand) {
        var b = '';
        for (var i = 0; i < 7; i++) {
          var w = 360 - i * 36;
          b += rect(400 - w / 2, 260 + i * 54, w, 42, 18);
        }
        b += circle(210, 660, 34) + circle(600, 640, 34);
        return b;
      }
    }
  ];

  /* ---------------- builder library: farm friends ---------------- */
  var FARM = [
    {
      k: 'sheep', title: 'Fluffy Sheep', draw: function (rand) {
        var b = circle(360, 440, 92) + circle(470, 420, 96) + circle(540, 490, 78) + circle(300, 520, 80) + circle(410, 520, 88);
        b += ellipse(220, 560, 88, 70);
        b += eyePair(220, 548, 30, 14, 6) + smile(220, 598, 26, 18);
        b += rect(320, 640, 40, 84, 16) + rect(410, 648, 40, 84, 16) + rect(500, 640, 40, 84, 16);
        b += waveBand(714, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'cow', title: 'Moo Cow', draw: function (rand) {
        var b = ellipse(430, 520, 225, 152);
        b += circle(220, 400, 96);
        b += ellipse(190, 448, 72, 54);
        b += eyePair(220, 396, 34, 15, 6);
        b += rect(330, 640, 44, 96, 18) + rect(420, 648, 44, 96, 18) + rect(510, 648, 44, 96, 18);
        b += waveBand(730, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'hen', title: 'Mother Hen', draw: function (rand) {
        var b = circle(380, 500, 142);
        b += ellipse(330, 512, 88, 68, -16);
        b += circle(360, 340, 26) + circle(400, 318, 28) + circle(440, 340, 26);
        b += poly([[472, 486], [540, 498], [472, 516]]);
        b += eyePair(430, 462, 26, 13, 6);
        b += rect(330, 622, 18, 70, 8) + rect(410, 622, 18, 70, 8);
        b += waveBand(716, 8, 3, 800);
        return b;
      }
    },
    {
      k: 'barn', title: 'Big Barn', draw: function (rand) {
        var b = rect(240, 420, 320, 240, 10);
        b += poly([[196, 434], [300, 318], [400, 272], [500, 318], [604, 434]]);
        b += rect(356, 520, 88, 140, 10);
        b += circle(400, 366, 34);
        b += waveBand(736, 8, 3, 800);
        return b;
      }
    }
  ];

  /* ---------------- builder library: safari & zoo ---------------- */
  var SAFARI = [
    {
      k: 'lion', title: 'Lion King', names: ['Brave Lion', 'Lion Roar', 'Little Lion Cub', 'Sunset Lion'],
      draw: function (rand) {
        var b = '', mp = [];
        for (var i = 0; i < 40; i++) {
          var a = i / 40 * 360;
          mp.push(pol(400, 440, 250 + Math.sin(a * Math.PI / 180 * 9) * 16, a));
        }
        b += poly(mp);
        b += circle(400, 456, 206);
        b += eyePair(400, 430, 74, 29, 12);
        b += ellipse(400, 550, 88, 62);
        b += smile(400, 578, 46, 34);
        return b;
      }
    },
    {
      k: 'elephant', title: 'Baby Elephant', names: ['Baby Elephant', 'Big Ears Elephant', 'Elephant Splash', 'Elephant Parade'],
      draw: function (rand) {
        var b = circle(216, 392, 148) + circle(584, 392, 148);
        b += circle(400, 420, 200);
        b += eyePair(400, 400, 78, 26, 11);
        b += circle(400, 592, 66) + circle(412, 660, 56) + circle(424, 722, 46);
        b += smile(400, 540, 40, 30);
        return b;
      }
    },
    {
      k: 'giraffe', title: 'Tall Giraffe', names: ['Tall Giraffe', 'Spotty Giraffe', 'Giraffe Snack', 'Giraffe Friends'],
      draw: function (rand) {
        var b = rect(362, 330, 76, 330, 38);
        b += ellipse(400, 268, 126, 102);
        b += rect(370, 120, 14, 64, 7) + circle(377, 112, 22) + rect(416, 120, 14, 64, 7) + circle(423, 112, 22);
        b += eyePair(400, 252, 54, 21, 9);
        b += smile(400, 344, 38, 26);
        b += circle(446, 356, 18) + circle(452, 402, 16) + circle(458, 448, 14);
        return b;
      }
    },
    {
      k: 'monkey', title: 'Cheeky Monkey', names: ['Cheeky Monkey', 'Monkey Business', 'Banana Monkey', 'Tree-top Monkey'],
      draw: function (rand) {
        var b = circle(400, 408, 172);
        b += circle(254, 400, 74) + circle(546, 400, 74);
        b += ellipse(400, 484, 122, 92);
        b += eyePair(400, 402, 64, 24, 10);
        b += smile(400, 528, 48, 34);
        return b;
      }
    },
    {
      k: 'zebra', title: 'Stripy Zebra', names: ['Stripy Zebra', 'Baby Zebra', 'Zebra Crossing', 'Zebra Gallop'],
      draw: function (rand) {
        var b = poly([[332, 318], [298, 208], [372, 276]]) + poly([[468, 318], [502, 208], [428, 276]]);
        b += circle(400, 444, 196);
        b += eyePair(400, 432, 72, 27, 11);
        b += ellipse(400, 552, 104, 74);
        b += smile(400, 596, 40, 28);
        return b;
      }
    }
  ];

  /* ---------------- silly monsters generator ---------------- */
  function genMonsters(tpl, rand) {
    var n = tpl.n, cx = 400, cy = 450, b = '';
    var R = 205 + (n % 4) * 18;
    var bumps = 5 + (n % 6);
    var pts = [];
    for (var i = 0; i < 30; i++) {
      var a = i / 30 * 360;
      var r = R + Math.sin(a * Math.PI / 180 * bumps) * (9 + (n % 3) * 5);
      pts.push(pol(cx, cy, r, a));
    }
    b += poly(pts);
    var e = 1 + (n % 5), eyes;
    if (e === 1) eyes = [[0, -20]];
    else if (e === 2) eyes = [[-85, -30], [85, -30]];
    else if (e === 3) eyes = [[-90, -10], [0, -60], [90, -10]];
    else if (e === 4) eyes = [[-90, -40], [-30, -70], [30, -70], [90, -40]];
    else eyes = [[-100, -20], [-50, -70], [0, -40], [50, -70], [100, -20]];
    for (i = 0; i < eyes.length; i++) {
      var ex = cx + eyes[i][0], ey = cy + eyes[i][1];
      var er = 34 + ((n + i) % 3) * 6;
      b += circle(ex, ey, er);
      if ((n + i) % 4 === 3) b += star(ex, ey + 2, er * 0.55, er * 0.24, 5, -90);
      else b += circle(ex + er * 0.12, ey + er * 0.1, Math.max(8, er * 0.38));
    }
    var m = n % 4;
    if (m === 0) b += smile(cx, cy + 90, 90, 70);
    else if (m === 1) {
      b += wedge(cx, cy + 60, 0, 86, 0, 180);
      b += poly([[cx - 58, cy + 66], [cx - 40, cy + 118], [cx - 22, cy + 66]]);
      b += poly([[cx - 8, cy + 66], [cx + 10, cy + 122], [cx + 28, cy + 66]]);
    } else if (m === 2) {
      b += pd('M ' + (cx - 95) + ' ' + (cy + 70) + ' L ' + (cx - 60) + ' ' + (cy + 118) + ' L ' + (cx - 20) + ' ' + (cy + 82) + ' L ' + (cx + 20) + ' ' + (cy + 122) + ' L ' + (cx + 62) + ' ' + (cy + 84) + ' L ' + (cx + 95) + ' ' + (cy + 118) + ' L ' + (cx + 95) + ' ' + (cy + 62) + ' L ' + (cx - 95) + ' ' + (cy + 62) + ' Z');
    } else {
      b += smile(cx, cy + 80, 80, 60);
      b += ellipse(cx + 12, cy + 134, 40, 34);
    }
    b += decor(rand, n % 2 === 0 ? 'stars' : 'dots');
    return b;
  }

  /* ---------------- silly faces ---------------- */
  var FACE_EYES = [
    function (cx, cy) { return eyePair(cx, cy, 82, 40, 17); },
    function (cx, cy) { return wedge(cx - 82, cy, 24, 44, 180, 360) + wedge(cx + 82, cy, 24, 44, 180, 360); },
    function (cx, cy) { return star(cx - 82, cy, 44, 19, 5, -90) + star(cx + 82, cy, 44, 19, 5, -90); },
    function (cx, cy) { return heart(cx - 82, cy, 34) + heart(cx + 82, cy, 34); },
    function (cx, cy) { return circle(cx - 82, cy, 52) + circle(cx + 82, cy, 52) + circle(cx - 82, cy, 18) + circle(cx + 82, cy, 18); }
  ];
  var FACE_MOUTHS = [
    function (cx, cy) { return smile(cx, cy, 92, 66); },
    function (cx, cy) { return wedge(cx, cy - 10, 0, 62, 0, 180) + wedge(cx, cy + 6, 0, 34, 0, 180); },
    function (cx, cy) { return smile(cx, cy, 74, 54) + ellipse(cx, cy + 62, 34, 30); },
    function (cx, cy) { return circle(cx, cy + 20, 40); }
  ];
  function genFaces(tpl, rand) {
    var n = tpl.n;
    var e = n % FACE_EYES.length, m = Math.floor(n / FACE_EYES.length) % FACE_MOUTHS.length;
    var b = circle(400, 410, 232);
    b += FACE_EYES[e](400, 384);
    b += FACE_MOUTHS[m](400, 520);
    b += circle(240, 480, 32) + circle(560, 480, 32);
    return b;
  }

  /* ---------------- letters & numbers ---------------- */
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function genAlphabet(tpl, rand) {
    var n = tpl.n;
    var ch = ALPHABET.charAt(n % ALPHABET.length);
    var style = n % 5;
    var cid = 'cl-' + tpl.id;
    var fam = "'Arial Rounded MT Bold','Comic Sans MS','Trebuchet MS','Segoe UI',sans-serif";
    var fs = 500, tx = 400, ty = 570;
    var b = '<defs><clipPath id="' + cid + '"><text x="' + tx + '" y="' + ty + '" text-anchor="middle" font-family="' + fam + '" font-weight="800" font-size="' + fs + '">' + ch + '</text></clipPath></defs>';
    b += '<g clip-path="url(#' + cid + ')">';
    var i;
    if (style === 0) { for (i = 0; i < 8; i++) b += rect(-40, 40 + i * 95, 880, 62); }
    else if (style === 1) { for (i = 0; i < 8; i++) b += rect(40 + i * 95, -40, 62, 880); }
    else if (style === 2) { for (i = 0; i < 9; i++) b += rectR(-200, 90 + i * 105, 1200, 60, 45, 400, 400); }
    else if (style === 3) { for (i = 0; i < 6; i++) b += circle(400, 400, 60 + i * 62); }
    else { for (var gy = 0; gy < 4; gy++) for (var gx = 0; gx < 4; gx++) if ((gx + gy) % 2 === 0) b += circle(170 + gx * 155, 170 + gy * 155, 46); }
    b += '</g>';
    b += '<text x="' + tx + '" y="' + ty + '" text-anchor="middle" font-family="' + fam + '" font-weight="800" font-size="' + fs + '" fill="none" stroke="' + INK + '" stroke-width="5">' + ch + '</text>';
    b += star(120, 120, 38, 16, 5, -90) + heart(690, 110, 42) + circle(110, 690, 32) + circle(700, 680, 28);
    return b;
  }

  /* ---------------- shape party ---------------- */
  var SHAPE_DRAW = [
    function (cx, cy, s) { return circle(cx, cy, s * 0.5); },
    function (cx, cy, s) { return poly([[cx, cy - s * 0.52], [cx - s * 0.5, cy + s * 0.44], [cx + s * 0.5, cy + s * 0.44]]); },
    function (cx, cy, s) { return star(cx, cy, s * 0.55, s * 0.24, 5, -90); },
    function (cx, cy, s) { return heart(cx, cy, s * 0.44); },
    function (cx, cy, s) { return rect(cx - s * 0.44, cy - s * 0.44, s * 0.88, s * 0.88, s * 0.12); }
  ];
  function genShapes(tpl, rand) {
    var n = tpl.n, v = n % 3, b = '', i;
    if (v === 0) {
      var spots = [[250, 250], [550, 250], [250, 550], [550, 550]];
      for (i = 0; i < 4; i++) {
        var si = (n + i) % SHAPE_DRAW.length;
        b += SHAPE_DRAW[si](spots[i][0], spots[i][1], rr(rand, 190, 240));
        if (i < 2) b += eyePair(spots[i][0], spots[i][1] - 10, 26, 13, 6) + smile(spots[i][0], spots[i][1] + 34, 24, 18);
      }
      b += star(400, 400, 40, 17, 5, -90);
    } else if (v === 1) {
      var cnt = ri(rand, 18, 26);
      for (i = 0; i < cnt; i++) {
        var gx2 = 5;
        var cx = 90 + (i % gx2) * 155 + rr(rand, -30, 30);
        var cy = 90 + Math.floor(i / gx2) * 155 + rr(rand, -30, 30);
        b += SHAPE_DRAW[ri(rand, 0, SHAPE_DRAW.length - 1)](cx, cy, rr(rand, 60, 120));
      }
      b += star(400, 400, 66, 28, 5, -90);
    } else {
      var edge = 16;
      for (i = 0; i < edge; i++) {
        var t = i / edge * Math.PI * 2;
        var cx = 400 + Math.cos(t) * 300, cy = 400 + Math.sin(t) * 300;
        b += SHAPE_DRAW[ri(rand, 0, SHAPE_DRAW.length - 1)](cx, cy, rr(rand, 70, 110));
      }
      b += circle(400, 400, 150);
      b += star(400, 400, 88, 38, 5, -90);
    }
    return b;
  }

  /* ================= CATALOGUE DEFINITIONS (10,000 PAGES TOTAL) ================= */
  var CATEGORIES = [
    { key: 'animals', name: 'Cute Animals', emoji: '\uD83D\uDC3B', blurb: 'Friendly animal faces, cuddly pets and furry buddies.', count: 600, base: 'easy' },
    { key: 'vegetables', name: 'Fresh Vegetables', emoji: '\uD83E\uDD55', blurb: 'Carrots, broccoli, tomatoes and crunchy garden goodies.', count: 500, base: 'easy' },
    { key: 'fruits', name: 'Sweet Fruits', emoji: '\uD83C\uDF53', blurb: 'Apples, berries, watermelons and sunny citrus.', count: 500, base: 'easy' },
    { key: 'sea', name: 'Under the Sea', emoji: '\uD83D\uDC20', blurb: 'Dolphins, turtles, whales and ocean friends.', count: 500, base: 'easy' },
    { key: 'vehicles', name: 'Things That Go', emoji: '\uD83D\uDE97', blurb: 'Cars, rockets, trains, planes, boats and bikes.', count: 500, base: 'easy' },
    { key: 'food', name: 'Yummy Food', emoji: '\uD83C\uDF55', blurb: 'Ice cream, burgers, pizza, cupcakes and treats.', count: 500, base: 'easy' },
    { key: 'mandalas', name: 'Mandalas', emoji: '\uD83C\uDF00', blurb: 'Calm, round patterns with lots of shapes to fill.', count: 900, base: 'detailed' },
    { key: 'patterns', name: 'Patterns & Bursts', emoji: '\u2728', blurb: 'Sunbursts, spirals and popping patterns.', count: 600, base: 'medium' },
    { key: 'snowflakes', name: 'Snowflakes', emoji: '\u2744\uFE0F', blurb: 'Frosty six-pointed sparkles from the sky.', count: 350, base: 'medium' },
    { key: 'stained', name: 'Stained Glass', emoji: '\uD83E\uDE9F', blurb: 'Window panes and jewel colours.', count: 350, base: 'medium' },
    { key: 'mosaics', name: 'Mosaics', emoji: '\uD83E\uDEE7', blurb: 'Bubbles, pebbles and dotted mosaics.', count: 350, base: 'easy' },
    { key: 'zentangle', name: 'Doodle Tiles', emoji: '\uD83E\uDDE9', blurb: 'Patchwork tiles crammed with tiny motifs.', count: 350, base: 'medium' },
    { key: 'pixel', name: 'Pixel Art', emoji: '\uD83D\uDFE6', blurb: 'Chunky squares hide a picture inside.', count: 450, base: 'medium' },
    { key: 'flowers', name: 'Flowers & Gardens', emoji: '\uD83C\uDF38', blurb: 'Blooms, bouquets and sunny gardens.', count: 400, base: 'medium' },
    { key: 'butterflies', name: 'Butterflies', emoji: '\uD83E\uDD8B', blurb: 'Fluttery wings that love bright colours.', count: 300, base: 'easy' },
    { key: 'safari', name: 'Safari & Zoo', emoji: '\uD83E\uDD81', blurb: 'Lions, elephants, giraffes and wild friends.', count: 300, base: 'easy' },
    { key: 'mythical', name: 'Unicorns & Dragons', emoji: '\uD83E\uDD84', blurb: 'Magic friends: unicorns, dragons and mermaids.', count: 300, base: 'easy' },
    { key: 'dinos', name: 'Dinosaur Days', emoji: '\uD83E\uDD95', blurb: 'Stomping, chomping prehistoric pals.', count: 300, base: 'easy' },
    { key: 'monsters', name: 'Silly Monsters', emoji: '\uD83D\uDC7E', blurb: 'Funny monsters with wobbly arms and lots of eyes.', count: 300, base: 'easy' },
    { key: 'space', name: 'Space Adventure', emoji: '\uD83D\uDE80', blurb: 'Rockets, planets, stars and friendly aliens.', count: 300, base: 'easy' },
    { key: 'faces', name: 'Silly Faces', emoji: '\uD83D\uDE0A', blurb: 'Smiles, winks and giggles for days.', count: 250, base: 'easy' },
    { key: 'alphabet', name: 'Letters & Numbers', emoji: '\uD83D\uDD24', blurb: 'A to Z and 0 to 9, full of patterns.', count: 200, base: 'easy' },
    { key: 'shapes', name: 'Shape Party', emoji: '\uD83D\uDD37', blurb: 'Big, chunky shapes for little hands.', count: 200, base: 'easy' },
    { key: 'holidays', name: 'Holidays & Seasons', emoji: '\uD83C\uDF84', blurb: 'Snowmen, pumpkins, gifts and rainbows.', count: 200, base: 'easy' },
    { key: 'weather', name: 'Weather Wonders', emoji: '\u26C5', blurb: 'Sun, rain, thunderstorms and rainbows.', count: 150, base: 'easy' },
    { key: 'music', name: 'Music Makers', emoji: '\uD83C\uDFB8', blurb: 'Drums, guitars, trumpets and boomy sounds.', count: 150, base: 'easy' },
    { key: 'farm', name: 'Farm Friends', emoji: '\uD83D\uDC11', blurb: 'Sheep, barns, cows and tractors on the farm.', count: 200, base: 'easy' }
  ];

  var POOLS = {
    mandalas: ['Sunrise', 'Lotus', 'Blossom', 'Twinkle', 'Zen', 'Bloom', 'Starlight', 'Dream', 'Whirl', 'Petal', 'Harmony', 'Radiance', 'Cosmic', 'Serenity', 'Mandala Magic', 'Chakra', 'Sunburst', 'Infinite', 'Kaleidoscope', 'Solstice'],
    snowflakes: ['Frosty', 'Twinkle', 'Crystal', 'Flurry', 'Snowy', 'Icy', 'Winter', 'Sparkle', 'Glacier', 'Blizzard', 'Polar', 'Frostbite'],
    patterns: ['Zing', 'Burst', 'Pop', 'Jazzy', 'Bounce', 'Fizz', 'Zippy', 'Groovy', 'Vortex', 'Ripple', 'Prism', 'Orbit', 'Waveform', 'Flash'],
    stained: ['Rainbow', 'Cathedral', 'Jewel', 'Prism', 'Window', 'Glow', 'Patchwork', 'Starlight', 'Beacon', 'Mosaic Glass', 'Kaleidoscope', 'Sunlight'],
    mosaics: ['Bubbles', 'Pebbles', 'Dots', 'Orbs', 'Splash', 'Marble', 'Pop', 'Confetti', 'Beads', 'Polka', 'Gemstones', 'Tessera'],
    zentangle: ['Doodle', 'Wiggle', 'Zigzag', 'Quilt', 'Puzzle', 'Swirl', 'Bricks', 'Patches', 'Tangle', 'Ribbon', 'Maze', 'Chevrons'],
    pixel: ['Pixel', 'Blocky', 'Chunky', 'Retro', 'Dotty', 'Square', '8-Bit', 'Arcade', 'Grid', 'Voxel'],
    flowers: ['Rose', 'Tulip', 'Daisy', 'Poppy', 'Lily', 'Sunflower', 'Bluebell', 'Pansy', 'Cherry', 'Peony', 'Marigold', 'Daffodil', 'Orchid', 'Jasmine', 'Lotus Bloom', 'Carnation', 'Gardenia'],
    butterflies: ['Flutter', 'Wing', 'Fairy', 'Meadow', 'Garden', 'Petal', 'Breeze', 'Sunbeam', 'Monarch', 'Swallowtail', 'Silken', 'Glimmer'],
    faces: ['Silly Face', 'Happy Face', 'Giggle Face', 'Cheeky Face', 'Wink Face', 'Grin Face', 'Sunny Face', 'Goofy Face'],
    monsters: ['Wobbly Monster', 'Spotty Monster', 'Giggly Monster', 'Fuzzy Monster', 'Cute Beasty', 'Huggable Monster', 'Silly Sprout', 'Chompy Buddy'],
    shapes: ['Shape Party', 'Shape Friends', 'Shape Collage', 'Geometry Fun', 'Blocks & Rings', 'Playground Shapes'],
    alphabet: ['Letter', 'Number'],
    vegetables: ['Crunchy Garden', 'Veggie Patch', 'Farm Fresh', 'Tasty Green', 'Crispy Crunch', 'Healthy Bite', 'Garden Harvest'],
    fruits: ['Sweet Fruit', 'Juicy Orchard', 'Sunshine Berry', 'Tropical Splash', 'Berry Delight', 'Fruit Bowl', 'Sweet Treat']
  };

  function pad4(n) { return ('000' + n).slice(-4); }
  function pick(pool, i) { return pool[i % pool.length]; }
  function detailSkew(base, i) {
    var r = i % 10;
    if (base === 'easy') return r < 3 ? 'medium' : 'easy';
    if (base === 'medium') return r < 3 ? 'detailed' : (r < 4 ? 'easy' : 'medium');
    return r < 3 ? 'medium' : 'detailed';
  }

  var BUILDERS = {
    animals: ANIMALS,
    vegetables: VEGETABLES,
    fruits: FRUITS,
    safari: SAFARI,
    sea: SEA,
    space: SPACE,
    food: FOOD,
    vehicles: VEHICLES,
    holidays: HOLIDAYS,
    mythical: MYTHICAL,
    dinos: DINOS,
    weather: WEATHER,
    music: MUSIC,
    farm: FARM
  };

  var BG_CYCLE = {
    animals: ['none', 'dots', 'stars', 'clouds'],
    vegetables: ['none', 'dots', 'leaves', 'sparkles', 'stars'],
    fruits: ['none', 'sparkles', 'dots', 'leaves', 'stars'],
    safari: ['none', 'dots', 'stars', 'clouds'],
    sea: ['none', 'bubbles', 'dots', 'stars'],
    space: ['none', 'stars', 'dots', 'stars'],
    food: ['none', 'dots', 'sprinkles', 'hearts'],
    vehicles: ['none', 'clouds', 'stars', 'dots'],
    holidays: ['none', 'dots', 'stars', 'hearts'],
    mythical: ['stars', 'dots', 'bubbles', 'flowers', 'none'],
    dinos: ['none', 'dots', 'stars', 'clouds'],
    weather: ['none', 'dots', 'stars'],
    music: ['none', 'stars', 'sprinkles'],
    farm: ['none', 'clouds', 'dots']
  };

  function buildCatalog() {
    var out = [];
    CATEGORIES.forEach(function (cat) {
      for (var i = 0; i < cat.count; i++) {
        var id = cat.key + '-' + pad4(i + 1);
        var tpl = { id: id, n: i, cat: cat.key, title: '', gen: cat.key, detail: detailSkew(cat.base, i), p: {} };
        if (BUILDERS[cat.key]) {
          var arr = BUILDERS[cat.key];
          var bidx = i % arr.length;
          var k = Math.floor(i / arr.length);
          tpl.p.b = bidx;
          var bgList = BG_CYCLE[cat.key] || ['none', 'dots', 'stars'];
          tpl.p.bg = bgList[k % bgList.length];
          if (arr[bidx].names) {
            tpl.title = arr[bidx].names[k % arr[bidx].names.length] + (k >= arr[bidx].names.length ? ' #' + (k + 1) : '');
          } else {
            tpl.title = arr[bidx].title + ' #' + (k + 1);
          }
        } else if (cat.key === 'alphabet') {
          var ch = ALPHABET.charAt(i % ALPHABET.length);
          tpl.title = (i < 26 ? 'Letter ' : 'Number ') + ch + ' #' + (Math.floor(i / ALPHABET.length) + 1);
        } else if (cat.key === 'faces') {
          tpl.title = pick(POOLS.faces, i % 4) + ' ' + (i + 1);
        } else {
          var pool = POOLS[cat.key] || ['Pattern'];
          tpl.title = pick(pool, i) + ' #' + (i + 1);
        }
        out.push(tpl);
      }
    });
    return out;
  }

  var catalog = buildCatalog();
  var CATNAME = {};
  CATEGORIES.forEach(function (c) { CATNAME[c.key] = c.name; });

  /* ================= render ================= */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function wrap(body, title, id) {
    var inner = body
      .replace(/<(circle|ellipse|rect|path|polygon)(?=[^>]*data-ink)/g,
        '<$1 fill="none" stroke="' + INK + '" stroke-width="' + SW + '" stroke-linecap="round" stroke-linejoin="round"')
      .replace(/<(circle|ellipse|rect|path|polygon)\b(?![^>]*(?:class=|data-ink))/g,
        '<$1 class="region" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="' + SW + '" stroke-linejoin="round"');
    var s = String(id || 'page'), seed = 0;
    for (var i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) % 9973;
    var scale = 4.2 + (seed % 5) * 0.5;
    var fid = 'rough-' + s;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      esc('Colouring page: ' + (title || 'untitled')) + '">' +
      '<defs><filter id="' + fid + '" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.014" numOctaves="2" seed="' + (seed % 1000) + '" result="warp"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="warp" scale="' + F(scale) + '" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs>' +
      '<rect class="region" x="0" y="0" width="800" height="800" fill="' + PAPER + '"/>' +
      '<g filter="url(#' + fid + ')">' + inner + '</g></svg>';
  }

  var GENS = {
    mandalas: genMandala,
    snowflakes: genSnowflake,
    patterns: genPatterns,
    stained: genStained,
    mosaics: genMosaics,
    zentangle: genZentangle,
    pixel: genPixel,
    flowers: genFlowers,
    butterflies: genButterflies,
    faces: genFaces,
    alphabet: genAlphabet,
    shapes: genShapes,
    animals: function (tpl, rand) { var a = ANIMALS[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    vegetables: function (tpl, rand) { var a = VEGETABLES[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    fruits: function (tpl, rand) { var a = FRUITS[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    safari: function (tpl, rand) { var a = SAFARI[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    sea: function (tpl, rand) { var a = SEA[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    space: function (tpl, rand) { var a = SPACE[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    food: function (tpl, rand) { var a = FOOD[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    vehicles: function (tpl, rand) { var a = VEHICLES[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    holidays: function (tpl, rand) { var a = HOLIDAYS[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    mythical: function (tpl, rand) { var a = MYTHICAL[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    dinos: function (tpl, rand) { var a = DINOS[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    weather: function (tpl, rand) { var a = WEATHER[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    music: function (tpl, rand) { var a = MUSIC[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    farm: function (tpl, rand) { var a = FARM[tpl.p.b]; return decor(rand, tpl.p.bg) + a.draw(rand); },
    monsters: genMonsters
  };

  var cache = new Map();
  function render(tpl) {
    var hit = cache.get(tpl.id);
    if (!hit) {
      var rand = rngFor(tpl.id);
      var inner = GENS[tpl.gen](tpl, rand);
      var svg = wrap(inner, tpl.title, tpl.id);
      var count = (svg.match(/class="region"/g) || []).length;
      hit = { svg: svg, count: count };
      cache.set(tpl.id, hit);
      if (cache.size > 800) cache.delete(cache.keys().next().value);
    }
    return hit;
  }

  var byIdMap = {};
  catalog.forEach(function (t) { byIdMap[t.id] = t; });
  function byId(id) { return byIdMap[id] || null; }
  function random() { return catalog[Math.floor(Math.random() * catalog.length)]; }

  /* ================= search ================= */
  function search(o) {
    o = o || {};
    var q = (o.q || '').trim().toLowerCase();
    var cat = o.cat || 'all';
    var detail = o.detail || 'any';
    var favSet = o.favs || null;
    var items = catalog.filter(function (t) {
      if (cat !== 'all' && t.cat !== cat) return false;
      if (detail !== 'any' && t.detail !== detail) return false;
      if (o.fav && favSet && !favSet.has(t.id)) return false;
      if (q) {
        var hay = (t.title + ' ' + t.cat + ' ' + CATNAME[t.cat] + ' ' + t.detail + ' ' + t.id).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var rank = { easy: 0, medium: 1, detailed: 2 };
    if (o.sort === 'az') items.sort(function (a, b) { return a.title < b.title ? -1 : 1; });
    else if (o.sort === 'simple') items.sort(function (a, b) { return rank[a.detail] - rank[b.detail] || a.n - b.n; });
    else if (o.sort === 'detailed') items.sort(function (a, b) { return rank[b.detail] - rank[a.detail] || a.n - b.n; });
    else if (o.sort === 'shuffle') items.sort(function () { return Math.random() - 0.5; });
    var per = o.per || 24;
    var total = items.length;
    var pages = Math.max(1, Math.ceil(total / per));
    var page = Math.min(Math.max(1, o.page || 1), pages);
    return { items: items.slice((page - 1) * per, page * per), total: total, pages: pages, page: page, per: per };
  }

  root.CT = {
    CATEGORIES: CATEGORIES,
    catalog: catalog,
    count: catalog.length,
    byId: byId,
    render: render,
    search: search,
    random: random
  };
})(typeof window !== 'undefined' ? window : globalThis);
