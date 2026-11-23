/* Top4Rest mobile redesign. The original data loaders and menu CSV formats remain unchanged. */
(function () {
  'use strict';

  const data = { main: null, drinks: null, activeDrink: null, details: new Map(), nextId: 0, lastFocus: null };
  const oldSwitchTab = window.switchTab;

  const h = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function getDetailRecord(title, desc, kbzhu, extra) {
    const id = 'dish-' + (++data.nextId);
    data.details.set(id, { title: title || '', desc: desc || '', kbzhu: kbzhu || null, extra: extra || {} });
    return id;
  }

  function dishInfo(id, title) {
    return '<button type="button" class="lux-info" data-dish-detail="' + h(id) +
      '" aria-label="Состав и КБЖУ: ' + h(title) + '">i</button>';
  }

  function dishCard(item, section) {
    const name = item.name2 ? item.name + ' ' + item.name2 : item.name;
    const composed = SOSTAV[name] || SOSTAV[item.name] || '';
    const desc = item.desc || composed;
    const rawKb = item.kbzhu && item.kbzhu.some(v => Number(v) !== 0) ? item.kbzhu : null;
    const kb = rawKb || KBZHU[name] || KBZHU[item.name] || null;
    const id = getDetailRecord(name, desc, kb, { section: section });
    const size = item.vol ? '<div class="lux-item-vol">' + h(item.vol) + '</div>' : '';
    const price = item.price ? '<div class="lux-item-price">' + h(item.price) + ' ₽</div>' : '';
    const descHtml = desc ? '<p class="lux-item-desc">' + h(desc) + '</p>' : '';
    return '<article class="lux-item">' +
      '<div><div class="lux-item-name">' + h(name) + '</div>' + descHtml + '</div>' +
      '<div class="lux-item-cost">' + price + size + '</div>' +
      dishInfo(id, name) +
      '</article>';
  }

  function itemList(section) {
    const items = section.items || [];
    return '<div class="menu-dish-list">' + items.map(item => dishCard(item, section.title)).join('') + '</div>';
  }

  function plural(n) {
    const m = n % 10, hnd = n % 100;
    if (hnd >= 11 && hnd <= 14) return 'блюд';
    return m === 1 ? 'блюдо' : (m >= 2 && m <= 4 ? 'блюда' : 'блюд');
  }


  // Five guest-facing groups. Original Sheets/CSV sections stay intact.
  const MAIN_GROUP_DEFINITIONS = [
    { title: 'Завтраки', sections: ['Завтраки', 'Добавки к завтракам'] },
    { title: 'Салаты и закуски', sections: ['Закуски', 'Салаты', 'Горячие закуски'] },
    { title: 'Супы', sections: ['Супы'] },
    { title: 'Горячее и гриль', sections: ['Горячие блюда', 'Гриль'] },
    { title: 'Гарниры и хлеб', sections: ['Гарниры', 'Хлеб'] }
  ];

  function mainGroups() {
    if (!data.main) return [];
    const used = new Set();
    const groups = MAIN_GROUP_DEFINITIONS.map(group => {
      const sections = group.sections.filter(title => !!data.main.map[title]);
      sections.forEach(title => used.add(title));
      return {
        title: group.title,
        sections: sections,
        count: sections.reduce((sum, title) => sum + data.main.map[title].items.length, 0)
      };
    }).filter(group => group.sections.length);
    // Do not hide any future category added to the spreadsheet.
    data.main.order.forEach(title => {
      if (!used.has(title)) {
        groups.push({title, sections: [title], count: data.main.map[title].items.length});
      }
    });
    return groups;
  }

  function pluralPositions(n) {
    const last = n % 10, lastTwo = n % 100;
    return lastTwo >= 11 && lastTwo <= 14 ? 'позиций' :
      last === 1 ? 'позиция' : (last >= 2 && last <= 4 ? 'позиции' : 'позиций');
  }

  function renderMainLanding() {
    const host = document.getElementById('breakfast');
    if (!data.main || !host) return;
    const groups = mainGroups();
    let body = '<h2 class="menu-landing-label">Выберите раздел</h2><div class="menu-category-grid">';
    groups.forEach((group, index) => {
      const number = String(index + 1).padStart(2, '0');
      body += '<button type="button" class="menu-category-link" data-main-category="' + h(group.title) + '">' +
        '<span class="menu-category-index" aria-hidden="true">' + number + '</span>' +
        '<span class="menu-category-text">' +
        '<span class="menu-category-name">' + h(group.title) + '</span>' +
        '<span class="menu-category-count">' + group.count + ' ' + pluralPositions(group.count) + '</span>' +
        '</span><span class="menu-category-arrow" aria-hidden="true">›</span></button>';
    });
    body += '</div>';
    host.innerHTML = '<div id="main-category-home">' + body + '</div><div id="main-category-view" hidden></div>';
  }

  function openMainCategory(title) {
    const group = mainGroups().find(x => x.title === title);
    if (!group) return;
    const home = document.getElementById('main-category-home');
    const view = document.getElementById('main-category-view');
    if (!home || !view) return;
    home.hidden = true;
    const sections = group.sections.map(sectionName => {
      const section = data.main.map[sectionName];
      const subheading = group.sections.length > 1 ?
        '<h3 class="main-subsection-title">' + h(sectionName) + '</h3>' : '';
      return '<section class="main-subsection">' + subheading + itemList(section) + '</section>';
    }).join('');
    view.innerHTML = '<button type="button" class="menu-back" data-main-back>‹ Все категории</button>' +
      '<h2 class="menu-view-title">' + h(title) + '</h2>' + sections;
    view.hidden = false;
    view.querySelector('.menu-back').focus({ preventScroll: true });
    document.querySelector('.tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeMainCategory() {
    const home = document.getElementById('main-category-home');
    const view = document.getElementById('main-category-view');
    if (!home || !view) return;
    view.hidden = true;
    home.hidden = false;
    home.querySelector('.menu-category-link')?.focus({ preventScroll: true });
  }

  function renderDrinkNav() {
    const host = document.getElementById('drinks');
    if (!host || !data.drinks || !data.drinks.order.length) return;
    const nav = data.drinks.order.map(title =>
      '<button type="button" class="drink-chip" data-drink-section="' + h(title) +
      '" aria-pressed="false">' + h(title) + '</button>').join('');
    host.innerHTML = '<h2 class="drinks-intro">Выберите напиток</h2>' +
      '<nav class="drinks-filter" aria-label="Категории напитков">' + nav + '</nav>' +
      '<div id="drink-menu-results"></div>';
    setDrinkSection(data.drinks.order[0]);
  }

  function setDrinkSection(title) {
    if (!data.drinks || !data.drinks.map[title]) return;
    data.activeDrink = title;
    document.querySelectorAll('[data-drink-section]').forEach(button => {
      const active = button.dataset.drinkSection === title;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const sec = data.drinks.map[title], el = document.getElementById('drink-menu-results');
    if (!el) return;
    el.innerHTML = '<h3 class="drink-section-label">' + h(title) + '</h3>' + itemList(sec);
  }

  window.loadMenuTab = async function () {
    try {
      const started = performance.now();
      const response = await fetchCsv(MENU_CSV_URL);
      Diag.rec.menuCsvMs = Math.round(performance.now() - started);
      Diag.rec.menuCsvStatus = response.status;
      if (!response.ok) throw new Error('Menu CSV ' + response.status);
      const tabs = parseMenuRows(parseCsv(await response.text()));
      data.main = tabs['Основное'] || null;
      data.drinks = tabs['Напитки'] || null;
      if (data.main && data.main.order.length) renderMainLanding();
      if (data.drinks && data.drinks.order.length) renderDrinkNav();
    } catch (error) {
      Diag.rec.menuCsvError = String(error && error.message || error);
      console.error('Menu refresh error; original menu retained', error);
      /* In case of network failure, the original static menu stays available. */
    }
  };

  window.renderKompleks = function (day) {
    const groups = [
      ['salat', 'Салат'], ['soup', 'Суп'], ['main', 'Горячее'], ['side', 'Гарнир']
    ];
    /* Keep previously registered menu and drink details across parallel CSV loads. */
    let body = '<div class="kompleks-price"><span class="kompleks-price-label">Комплексный обед</span>' +
      '<span class="kompleks-price-value">' + h(KOMPLEKS_PRICE) + ' ₽</span></div>' +
      '<div class="kompleks-note">✦ &nbsp; Выберите по одному блюду из каждой категории &nbsp; ✦</div>';
    groups.forEach(pair => {
      const group = pair[0], title = pair[1];
      const items = day[group] || [];
      if (!items.length) return;
      body += '<section class="category"><div class="category-header"><h2 class="category-title">' +
        title + '</h2><div class="category-line"></div></div><div class="choice-grid" data-group="' + group + '">';
      items.forEach(item => {
        const name = item.name || '';
        if (item.sostav) SOSTAV[name] = item.sostav;
        if (item.kbzhu) KBZHU[name] = item.kbzhu;
        const desc = SOSTAV[name] || '';
        const kb = KBZHU[name] || null;
        const detailId = getDetailRecord(name, desc, kb, { group: group, price: Number(item.price) || 0 });
        const detail = desc ? '<div class="choice-footnote">' + h(desc) + '</div>' : '';
        const extra = Number(item.price) > 0 ? '<div class="choice-extra-price">+' + Number(item.price) + ' ₽</div>' : '';
        body += '<div role="button" tabindex="0" aria-pressed="false" class="choice-card" data-choice-group="' +
          group + '" data-choice-name="' + h(name) + '" data-choice-price="' + (Number(item.price) || 0) +
          '" data-choice-detail="' + h(detailId) + '">' +
          '<span class="choice-marker" aria-hidden="true"></span>' +
          '<div class="choice-copy"><div class="choice-name">' + h(name) + '</div>' +
          detail + extra + '</div>' +
          dishInfo(detailId, name) + '</div>';
      });
      body += '</div></section>';
    });
    body += '<div id="total-bar" style="display:none"><div class="total-inner">' +
      '<div class="total-summary"><div class="total-summary-info"><div class="total-summary-name">Ваш обед</div>' +
      '<div class="total-progress" id="total-progress">0 из 4 блюд</div></div>' +
      '<div class="total-sum"><div id="total-final" class="total-sum-final"></div></div>' +
      '<button type="button" class="total-action" id="total-action">Далее ›</button></div>' +
      '<div class="total-details" id="total-details" hidden>' +
      '<div class="total-top"><span class="total-label">Ваш выбор</span>' +
      '<button type="button" class="total-reset" data-clear-choice>Сбросить</button></div>' +
      '<div id="total-rows" class="total-selected"></div><div id="total-kbzhu" class="total-kbzhu-row"></div>' +
      '<div id="total-hint" class="total-hint"></div></div></div></div>';
    return body;
  };

  window.updateTotal = function () {
    const bar = document.getElementById('total-bar');
    if (!bar) return;
    const count = Object.keys(selected).length;
    bar.style.display = count ? 'block' : 'none';
    document.body.classList.toggle('has-selection', count > 0);
    if (!count) return;
    const keys = ['salat', 'soup', 'main', 'side'];
    const extras = keys.reduce((sum, group) => sum + (Number(selected[group]?.price) || 0), 0);
    document.getElementById('total-progress').textContent = count + ' из 4 блюд';
    document.getElementById('total-final').textContent = (Number(KOMPLEKS_PRICE) + extras) + ' ₽';
    document.getElementById('total-rows').innerHTML = keys.filter(group => selected[group])
      .map(group => '<div class="total-row"><div><div class="total-row-cat">' + h(GROUPS[group]) +
        '</div><div class="total-row-name">' + h(selected[group].name) + '</div></div></div>').join('');
    const missing = keys.filter(group => !selected[group]);
    document.getElementById('total-hint').textContent = missing.length ?
      'Осталось выбрать: ' + missing.map(group => GROUPS[group].toLowerCase()).join(', ') :
      'Комплексный обед собран ✦';
    document.getElementById('total-action').textContent = missing.length ? 'Далее ›' : 'Ваш выбор ▾';
    document.querySelectorAll('.choice-card').forEach(card =>
      card.setAttribute('aria-pressed', String(card.classList.contains('selected'))));
    updateTotalKbzhu();
  };

  window.resetAll = function () {
    Object.keys(selected).forEach(group => delete selected[group]);
    document.querySelectorAll('.choice-card').forEach(card => {
      card.classList.remove('selected');
      card.setAttribute('aria-pressed', 'false');
    });
    const details = document.getElementById('total-details');
    if (details) details.hidden = true;
    window.updateTotal();
  };

  window.switchTab = function (id, tab) {
    oldSwitchTab(id, tab);
    if (id === 'breakfast' && document.getElementById('main-category-view')) closeMainCategory();
  };

  function openDetails(id) {
    const item = data.details.get(id);
    if (!item) return;
    data.lastFocus = document.activeElement;
    const overlay = document.getElementById('new-detail-overlay');
    const liveKb = item.kbzhu || KBZHU[item.title] || null;
    const liveDesc = item.desc || SOSTAV[item.title] || '';
    const food = liveKb && liveKb.some(v => Number(v) !== 0);
    const desc = liveDesc ?
      '<p class="detail-text">' + h(liveDesc) + '</p>' :
      '<p class="detail-text">Состав уточняется</p>';
    let nutritional = '<p class="detail-text">КБЖУ уточняется</p>';
    if (food) {
      nutritional = '<div class="detail-food-grid">' +
        liveKb.map((value, i) => '<div class="detail-food-cell"><div class="detail-food-value">' +
          h(value) + '</div><div class="detail-food-label">' +
          ['ккал', 'белки, г', 'жиры, г', 'углеводы, г'][i] + '</div></div>').join('') +
        '</div><div class="detail-portion">Пищевая ценность на порцию</div>';
    }
    const isCombo = !!item.extra.group;
    const alreadySelected = isCombo && selected[item.extra.group]?.name === item.title;
    overlay.querySelector('.detail-dialog').innerHTML =
      '<div class="detail-top"><h2 class="detail-name" id="detail-title">' + h(item.title) +
      '</h2><button type="button" class="detail-close" data-detail-close aria-label="Закрыть">×</button></div>' +
      '<div class="detail-heading">Состав</div>' + desc +
      '<div class="detail-heading">Пищевая ценность</div>' + nutritional +
      (isCombo ? '<button type="button" class="detail-select" data-select-detail="' + h(id) + '">' +
        (alreadySelected ? 'Убрать из обеда' : 'Выбрать блюдо') + '</button>' : '');
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.detail-close').focus();
  }

  function closeDetails() {
    const overlay = document.getElementById('new-detail-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (data.lastFocus && typeof data.lastFocus.focus === 'function' && data.lastFocus.isConnected) data.lastFocus.focus();
  }

  window.openKbzhu = function (key, title, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const id = getDetailRecord(title || key, SOSTAV[key] || SOSTAV[title] || '', KBZHU[key] || KBZHU[title], {});
    openDetails(id);
  };
  window.closeKbzhu = function () { closeDetails(); };

  document.body.insertAdjacentHTML('beforeend',
    '<div id="new-detail-overlay" class="detail-overlay" role="presentation" hidden>' +
    '<div class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title"></div></div>');

  function chooseCard(card) {
    if (!card) return;
    select(card, card.dataset.choiceGroup, card.dataset.choiceName, Number(card.dataset.choicePrice) || 0);
  }

  document.addEventListener('click', event => {
    const detail = event.target.closest('[data-dish-detail]');
    if (detail) {
      event.preventDefault();
      event.stopPropagation();
      openDetails(detail.dataset.dishDetail);
      return;
    }
    if (event.target.closest('[data-detail-close]') || event.target.id === 'new-detail-overlay') {
      closeDetails(); return;
    }
    const selectFromDetail = event.target.closest('[data-select-detail]');
    if (selectFromDetail) {
      const id = selectFromDetail.dataset.selectDetail;
      const card = Array.from(document.querySelectorAll('.choice-card')).find(x => x.dataset.choiceDetail === id);
      if (card) chooseCard(card);
      closeDetails(); return;
    }
    const mainCategory = event.target.closest('[data-main-category]');
    if (mainCategory) { openMainCategory(mainCategory.dataset.mainCategory); return; }
    if (event.target.closest('[data-main-back]')) { closeMainCategory(); return; }
    const drink = event.target.closest('[data-drink-section]');
    if (drink) { setDrinkSection(drink.dataset.drinkSection); return; }
    if (event.target.closest('[data-clear-choice]')) { window.resetAll(); return; }
    if (event.target.closest('#total-action')) {
      const missing = ['salat', 'soup', 'main', 'side'].find(group => !selected[group]);
      if (missing) {
        const section = document.querySelector('.choice-grid[data-group="' + missing + '"]');
        section?.closest('.category')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const panel = document.getElementById('total-details');
        if (panel) panel.hidden = !panel.hidden;
      }
      return;
    }
    const card = event.target.closest('.choice-card[data-choice-group]');
    if (card) chooseCard(card);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeDetails(); return; }
    const overlay = document.getElementById('new-detail-overlay');
    if (!overlay.hidden && event.key === 'Tab') {
      const buttons = Array.from(overlay.querySelectorAll('button:not([hidden])'));
      if (!buttons.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
      return;
    }
    const card = event.target.closest('.choice-card[data-choice-group]');
    if (card && event.target === card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      chooseCard(card);
    }
  });
})();