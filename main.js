// Animações do site com anime.js v4.4.1 (cópia local em vendor/, licença MIT).
// Nada acompanha a posição da rolagem: as animações tocam ao carregar, ao passar o mouse,
// ao clicar ou uma vez quando a seção aparece na tela.
import {
  animate, createTimeline, stagger, splitText, createDrawable, createLayout, createSpring, utils,
} from './vendor/anime.esm.min.js';

window.__animaOk = true;
const raiz = document.documentElement;
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const mola = (stiffness = 120, damping = 12) => createSpring({ stiffness, damping });
// Uma só linguagem de movimento: entradas com outExpo e uma única mola para o que "salta".
const MOLA = createSpring({ stiffness: 140, damping: 12 });

// ---------- Aceno ----------
const $mao = $('.mao');
function acenar() {
  animate($mao, { rotate: [0, 16, -8, 16, -4, 10, 0], duration: 1300, ease: 'inOutSine' });
}
$('.ola').addEventListener('pointerenter', () => { if (!reduz) acenar(); });

// ---------- Contadores ----------
function contar(el) {
  const fim = +el.dataset.contar;
  const casas = +(el.dataset.casas || 0);
  const o = { v: 0 };
  animate(o, { v: fim, duration: 1400, ease: 'outExpo', onUpdate: () => { el.textContent = o.v.toFixed(casas).replace('.', el.dataset.sep || ','); } });
}

// ---------- Texto que "decodifica", como dados chegando ----------
const SIMBOLOS = '01<>/{}[]#$%&*+=_';
function embaralhar(el, duracao = 900) {
  const final = el.dataset.final || (el.dataset.final = el.textContent);
  const o = { p: 0 };
  animate(o, {
    p: 1, duration: duracao, ease: 'linear',
    onUpdate: () => {
      const n = Math.floor(o.p * final.length);
      let s = final.slice(0, n);
      for (let i = n; i < final.length; i++) {
        s += final[i] === ' ' ? ' ' : SIMBOLOS[(Math.random() * SIMBOLOS.length) | 0];
      }
      el.textContent = s;
    },
    onComplete: () => { el.textContent = final; },
  });
}

// Digita o conteúdo de um elemento letra por letra, mantendo os trechos marcados (<code>).
// O que ainda não foi digitado continua no lugar, invisível, então nada abaixo "pula".
// Um cursor acompanha a digitação.
function digitarTexto(el, msPorLetra, cursor) {
  return new Promise(resolve => {
    const nos = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    // Pula o que é decorativo (a mão que acena), que entra por conta própria.
    while (w.nextNode()) if (!w.currentNode.parentElement.closest('[aria-hidden="true"]')) nos.push(w.currentNode);
    const partes = nos.map(no => {
      const total = no.data.replace(/\s+/g, ' ');
      const resto = document.createElement('span');
      resto.className = 'a-digitar';
      resto.textContent = total;
      no.data = '';
      no.after(resto);
      return { no, resto, total, token: no.parentElement.closest('.token') };
    }).filter(p => p.total);
    partes.forEach(p => { if (p.token) p.token.style.visibility = 'hidden'; });
    el.classList.add('digitando');
    cursor.classList.add('fino');
    const letras = partes.reduce((s, p) => s + p.total.length, 0);
    const o = { n: 0 };
    animate(o, {
      n: letras, duration: letras * msPorLetra, ease: 'linear',
      onUpdate: () => {
        let n = Math.round(o.n), atual = null;
        for (const p of partes) {
          const k = Math.min(n, p.total.length);
          n -= k;
          if (p.no.data.length !== k) {
            p.no.data = p.total.slice(0, k);
            p.resto.textContent = p.total.slice(k);
          }
          if (k > 0 && p.token) p.token.style.visibility = '';
          if (!atual && k < p.total.length) atual = p;
        }
        if (atual && cursor.nextSibling !== atual.resto) atual.resto.before(cursor);
      },
      onComplete: () => {
        partes.forEach(p => { p.no.data = p.total; p.resto.remove(); if (p.token) p.token.style.visibility = ''; });
        el.classList.remove('digitando');
        el.append(cursor);
        resolve();
      },
    });
  });
}

// Termos da bio como trechos de código: ao passar o mouse, se decodificam.
$$('.token').forEach(t => t.addEventListener('pointerenter', () => {
  if (!reduz && !t.closest('.digitando')) embaralhar(t, 600);
}));

// ---------- Destaques: cartões em 3D ----------
// Ao entrar, cada cartão "levanta" da base girando em 3D (mola, em sequência).
// Depois, inclina seguindo o mouse, com um reflexo de luz; ao sair, volta com mola.
function prepararDestaques() {
  $$('.num-cartao').forEach(c => {
    c.addEventListener('pointermove', e => {
      if (reduz || e.pointerType !== 'mouse') return;
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      animate(c, { rotateY: (px - 0.5) * 16, rotateX: (0.5 - py) * 16, duration: 450, ease: 'out(3)' });
      c.style.setProperty('--mx', px * 100 + '%');
      c.style.setProperty('--my', py * 100 + '%');
      c.style.setProperty('--brilho', 1);
    });
    c.addEventListener('pointerenter', () => {
      const n = $('[data-contar]', c);
      if (n && !reduz) contar(n);
    });
    c.addEventListener('pointerleave', () => {
      animate(c, { rotateX: 0, rotateY: 0, duration: 900, ease: MOLA });
      c.style.setProperty('--brilho', 0);
    });
  });
}

// ---------- Apresentação ----------
function apresentacao() {
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  const espera = ms => new Promise(r => setTimeout(r, ms));

  // A digitação toca só na primeira visita da sessão; ao voltar (ou trocar PT/EN), o texto já aparece.
  let jaViu = false;
  try {
    jaViu = sessionStorage.getItem('abertura-vista') === '1';
    sessionStorage.setItem('abertura-vista', '1');
  } catch (e) { /* sem armazenamento: digita sempre */ }

  if (jaViu) {
    animate('.ola, .bio', { opacity: [0, 1], y: [10, 0], duration: 600, delay: stagger(120), ease: 'outExpo' });
    animate($mao, { opacity: [0, 1], scale: [0.4, 1], duration: 500, delay: 200, ease: 'outBack' });
    cursor.classList.add('fino');
    $('.bio').append(cursor);
  } else {
    // Tudo é digitado em sequência, como num terminal: título → bio.
    (async () => {
      await espera(300);
      $('.ola').style.opacity = 1;
      await digitarTexto($('.ola-texto'), 55, cursor);
      animate($mao, { opacity: [0, 1], scale: [0.4, 1], duration: 500, ease: 'outBack' });
      setTimeout(acenar, 300);
      await espera(200);
      $('.bio').style.opacity = 1;
      await digitarTexto($('.bio'), 16, cursor);
    })();
  }

  // Momentos de entrada (ms): mais cedo quando não há digitação.
  const t = jaViu
    ? { foto: 0, contatos: 250, cartoes: 400, contar: 500, seta: 1400 }
    : { foto: 200, contatos: 2200, cartoes: 2500, contar: 2700, seta: 4400 };
  createTimeline({ defaults: { ease: 'outExpo' } })
    .add('.foto', { opacity: [0, 1], scale: [0.8, 1], duration: 1400, ease: MOLA }, t.foto)
    .add('.apresentacao .contatos', { opacity: [0, 1], y: [16, 0], duration: 800 }, t.contatos)
    .add('.num-cartao', { opacity: [0, 1], rotateX: [-85, 0], y: [24, 0], duration: 1400, delay: stagger(140), ease: MOLA }, t.cartoes)
    .call(() => $$('.numeros [data-contar]').forEach(contar), t.contar)
    .add('.seta', { opacity: [0, 1], duration: 600 }, t.seta)
    .call(() => {
      animate('.seta svg', { y: [0, 6], duration: 900, alternate: true, loop: true, ease: 'inOutSine' });
    });

  // A seta some quando a pessoa começa a rolar.
  addEventListener('scroll', () => {
    $('.seta').style.opacity = scrollY > 80 ? 0 : 1;
  }, { passive: true });
}

// ---------- Ilustrações do "O que faço" ----------
// Cada uma toca uma vez ao aparecer e de novo ao passar o mouse (ou tocar) no bloco.
const ilustracoes = {
  conf(el, fim) {
    const linhas = $$('.lanc', el), dup = $('.lanc.dup', el), tag = $('.dup-tag', el), scan = $('.scan', el);
    dup.classList.remove('marcado');
    utils.set($$('.l-ok', el), { opacity: 0, scale: 0.4 });
    utils.set(tag, { opacity: 0 });
    const tl = createTimeline({ onComplete: fim })
      .add(scan, { opacity: [0, 1, 1, 0], y: [0, el.clientHeight - 26], duration: 1700, ease: 'inOutSine' }, 0);
    linhas.forEach((l, i) => tl.add($('.l-ok', l), { opacity: [0, 1], scale: [0.4, 1], duration: 600, ease: 'outBack' }, 250 + i * 290));
    tl.call(() => dup.classList.add('marcado'), 250 + 2 * 290)
      .add(tag, { opacity: [0, 1], x: [-8, 0], duration: 500, ease: 'outExpo' }, 250 + 2 * 290 + 120);
    return tl;
  },

  margem(el, fim) {
    const linha = $('.linha-margem', el), pontos = $$('.pontos circle', el);
    utils.set(pontos, { opacity: 0, scale: 0 });
    utils.set(linha, { opacity: 0 });
    return createTimeline({ onComplete: fim })
      .add($$('rect', el), { scaleY: [0, 1], duration: 800, delay: stagger(80), ease: 'outExpo' }, 0)
      .call(() => utils.set(linha, { opacity: 1 }), 550)
      .add(createDrawable(linha), { draw: ['0 0', '0 1'], duration: 1000, ease: 'inOutQuad' }, 550)
      .add(pontos, { opacity: [0, 1], scale: [0, 1], duration: 450, delay: stagger(160), ease: 'outBack' }, 600);
  },

  orc(el, fim) {
    const tl = createTimeline({ onComplete: fim });
    utils.set($('.pilula', el), { opacity: 0 });
    $$('.enche', el).forEach((e, i) =>
      tl.add(e, { width: ['0%', e.style.getPropertyValue('--p')], duration: 1000, ease: 'outExpo' }, i * 220));
    return tl.add($('.pilula', el), { opacity: [0, 1], y: [10, 0], duration: 600, ease: 'outBack' }, 1000);
  },

  rank(el, fim) {
    const linhas = $$('.rank', el);
    const larg = linhas.map(l => +l.dataset.w);
    const ordem = larg.map((_, i) => i).sort((a, b) => larg[b] - larg[a]);
    const tl = createTimeline({ onComplete: fim })
      .add(linhas, { y: 0, duration: 300, ease: 'outQuad' }, 0);
    linhas.forEach((l, i) => tl.add($('.enche', l), { width: ['0%', larg[i] + '%'], duration: 900, ease: 'outExpo' }, 300 + i * 120));
    // Depois de medir, a lista se reordena do mais rentável para o menos.
    linhas.forEach((l, i) => tl.add(l, { y: (ordem.indexOf(i) - i) * 30, duration: 800, ease: 'inOutQuint' }, 1500));
    return tl;
  },

  auto(el, fim) {
    const nos = $$('.no', el), bol = $('.bolinha', el), pil = $('.pilula', el);
    nos.forEach(n => n.classList.remove('aceso'));
    utils.set(pil, { opacity: 0 });
    return createTimeline({ onComplete: fim })
      .call(() => nos[0].classList.add('aceso'), 0)
      .add(bol, { opacity: [0, 1], duration: 200 }, 0)
      .add(bol, { left: ['14%', '86%'], duration: 1600, ease: 'inOutSine' }, 200)
      .call(() => nos[1].classList.add('aceso'), 1000)
      .call(() => nos[2].classList.add('aceso'), 1800)
      .add(bol, { opacity: 0, duration: 250 }, 1800)
      .add(pil, { opacity: [0, 1], y: [10, 0], duration: 600, ease: 'outBack' }, 1900);
  },
};

function prepararBlocos() {
  $$('.bloco').forEach(b => {
    let tocando = false;
    b.tocar = () => {
      if (tocando || reduz) return;
      tocando = true;
      ilustracoes[b.dataset.ilus]($('.ilus', b), () => { tocando = false; });
    };
    b.addEventListener('pointerenter', () => b.tocar());
  });
}

// ---------- Entradas das seções (uma vez, ao aparecer) ----------
function aoAparecer(el, fn, limiar = 0.2) {
  if (!el) return;
  const obs = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    fn();
  }, { threshold: limiar });
  obs.observe(el);
}
const subir = (alvos, extra = {}) => animate(alvos, { opacity: [0, 1], y: [24, 0], duration: 900, ease: 'outExpo', ...extra });

function entradas() {
  $$('.secao-cabeca').forEach(c => aoAparecer(c, () => {
    subir(c);
    const h2 = $('.embaralha', c);
    if (h2) embaralhar(h2);
  }));

  // Um bloco abaixo do outro: cada um entra e toca a ilustração quando chega à tela.
  $$('.bloco').forEach(b => aoAparecer(b, () => {
    subir(b, { y: [36, 0] });
    setTimeout(() => b.tocar(), 300);
  }, 0.35));

  aoAparecer($('.grupos'), () => {
    subir($$('.grupo-nome'), { delay: stagger(120) });
    animate('.ferr li', { opacity: [0, 1], scale: [0.6, 1], rotate: [-6, 0], duration: 1100, delay: stagger(60, { start: 150 }), ease: MOLA });
  });

  aoAparecer($('.cartoes'), () => {
    subir('.cartoes .cartao', { delay: stagger(120), y: [40, 0] });
    $$('.cartoes [data-contar]').forEach(contar);
  }, 0.15);

  aoAparecer($('.contato'), () => {
    subir($$('.contato > *'), { delay: stagger(100) });
    embaralhar($('.contato .embaralha'));
  }, 0.3);
}

// Ferramentas: o ícone dá um pulinho ao passar o mouse.
$$('.ferr li').forEach(li => li.addEventListener('pointerenter', () => {
  if (!reduz) animate($('.ico', li), { y: [0, -9, 0], rotate: [0, -8, 0], duration: 550, ease: 'outQuad' });
}));

// ---------- Projetos: o cartão cresce e vira o painel de detalhes ----------
const $modal = $('.modal');
const modalLayout = createLayout($modal, {
  children: ['.cartao', '.tag', '.titulo', '.numero', '.resumo'],
  properties: ['--overlay-alpha'],
  duration: reduz ? 0 : 550,
  ease: 'outExpo',
});

function abrir(cartao) {
  const clone = cartao.cloneNode(true);
  clone.removeAttribute('id');
  clone.removeAttribute('tabindex');
  clone.removeAttribute('role');
  clone.style.opacity = 1;
  clone.style.transform = 'none';
  const fechar = document.createElement('button');
  fechar.className = 'fechar';
  fechar.type = 'button';
  fechar.setAttribute('aria-label', 'Fechar');
  fechar.textContent = '×';
  fechar.addEventListener('click', fecharModal);
  clone.appendChild(fechar);
  $modal.innerHTML = '';
  $modal.appendChild(clone);
  modalLayout.update(() => {
    $modal.showModal();
    cartao.classList.add('aberto');
  });
  if (!reduz) animate($('.detalhe', clone), { opacity: [0, 1], y: [14, 0], duration: 600, delay: 250, ease: 'outExpo' });
}

function fecharModal() {
  if (!$modal.open) return;
  const aberto = $('.cartoes .cartao.aberto');
  modalLayout.update(() => {
    $modal.close();
    if (aberto) aberto.classList.remove('aberto');
  });
  if (aberto) aberto.focus({ preventScroll: true });
}

$$('.cartoes .cartao').forEach(cartao => {
  cartao.addEventListener('click', () => abrir(cartao));
  cartao.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(cartao); }
  });
});
// "Ver na prática": rola até o projeto que comprova a habilidade e abre os detalhes.
$$('.na-pratica').forEach(a => a.addEventListener('click', e => {
  const cartao = $(a.getAttribute('href'));
  if (!cartao) return;
  e.preventDefault();
  cartao.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' });
  setTimeout(() => abrir(cartao), reduz ? 0 : 650);
}));

$modal.addEventListener('cancel', e => { e.preventDefault(); fecharModal(); });
$modal.addEventListener('click', e => { if (e.target === $modal) fecharModal(); });

// ---------- Contato: copiar o e-mail ----------
const $copiar = $('.copiar');
const textoCopiar = $copiar.textContent;
$copiar.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('.email').textContent.trim());
    $copiar.textContent = $copiar.dataset.ok;
  } catch {
    $copiar.textContent = $copiar.dataset.erro;
  }
  $copiar.classList.add('ok');
  if (!reduz) animate($copiar, { scale: [0.85, 1], duration: 700, ease: MOLA });
  setTimeout(() => { $copiar.textContent = textoCopiar; $copiar.classList.remove('ok'); }, 2200);
});

// ---------- Currículo: o botão só aparece se o PDF existir ----------
const $cv = $('.curriculo');
if ($cv) fetch($cv.getAttribute('href'), { method: 'HEAD' })
  .then(r => { if (r.ok) $cv.hidden = false; })
  .catch(() => {});

// ---------- Início ----------
prepararBlocos();
prepararDestaques();
if (reduz) {
  raiz.classList.remove('js-anima');
} else {
  apresentacao();
  entradas();
}
