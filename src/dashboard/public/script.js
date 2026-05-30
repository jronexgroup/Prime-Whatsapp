function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.text().catch(() => 'Request failed');
    showToast(err.substring(0, 100), 'error');
    return null;
  }
  return res.json().catch(() => ({}));
}

function get(el) { return document.querySelector(el); }
function getAll(el) { return document.querySelectorAll(el); }

function copyText(el) {
  const val = el.value || el.textContent;
  navigator.clipboard?.writeText(val).then(() => showToast('Copied!', 'info'));
}

function contactLabel(c) {
  return c.displayName || c.phoneNumber || c.pushName || c.jid?.split('@')[0] || 'Unknown';
}

function contactMeta(c) {
  const parts = [];
  if (c.phoneNumber) parts.push(c.phoneNumber);
  if (c.isContactSaved) parts.push('saved');
  return parts.join(' · ');
}

function createContactPicker(inputId, hiddenId, dropdownId, contacts, opts = {}) {
  const input = get(inputId);
  const hidden = get(hiddenId);
  const dropdown = get(dropdownId);
  if (!input || !hidden || !dropdown) return;

  const multiple = opts.multiple || false;
  const selected = multiple ? (opts.selected || []) : null;
  const onSelect = opts.onSelect || null;
  let focusIndex = -1;
  let filtered = contacts;

  function render(filter) {
    const q = (filter || '').toLowerCase().trim();
    filtered = q ? contacts.filter(c => (contactLabel(c) + ' ' + c.jid).toLowerCase().includes(q)) : contacts;
    const hasExactJid = q && contacts.some(c => c.jid === q);
    let html = '';
    for (const c of filtered) {
      const label = contactLabel(c);
      const meta = contactMeta(c);
      if (multiple && selected.includes(c.jid)) continue;
      html += `<div class="item" data-jid="${c.jid}">
        <div><div class="name">${label}</div><div class="meta">${meta}</div></div>
        <div class="jid-hint">${c.jid.substring(0, 30)}</div>
      </div>`;
    }
    if (q && !hasExactJid) {
      const isNum = /^[0-9]+$/.test(q);
      if (isNum) {
        html += `<div class="item manual-item" data-jid="${q}">➕ Add number: ${q}</div>`;
      } else {
        html += `<div class="item manual-item" data-jid="${q}">➕ Use: ${q}</div>`;
      }
    }
    if (!html) html = '<div class="item" style="color:#999;cursor:default">No contacts found</div>';
    dropdown.innerHTML = html;
    if (html) dropdown.style.display = 'block';
    focusIndex = -1;
  }

  render('');

  input.addEventListener('input', () => render(input.value));

  input.addEventListener('focus', () => {
    render(input.value);
    dropdown.style.display = 'block';
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusIndex = Math.min(focusIndex + 1, items.length - 1);
      items.forEach((el, i) => el.style.background = i === focusIndex ? '#f0fdf4' : '');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusIndex = Math.max(focusIndex - 1, 0);
      items.forEach((el, i) => el.style.background = i === focusIndex ? '#f0fdf4' : '');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIndex >= 0 && items[focusIndex]) items[focusIndex].click();
    }
  });

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (!item || !item.dataset.jid) return;
    const jid = item.dataset.jid;
    const c = contacts.find(x => x.jid === jid);
    const label = c ? contactLabel(c) : jid;

    if (multiple) {
      if (!selected.includes(jid)) selected.push(jid);
      render(input.value);
      if (onSelect) onSelect(selected);
      updateTags();
    } else {
      hidden.value = jid;
      input.value = label;
      dropdown.style.display = 'none';
      if (onSelect) onSelect(jid, c);
    }
  });

  function updateTags() {
    const container = opts.tagsContainer ? get(opts.tagsContainer) : null;
    if (!container) return;
    container.innerHTML = selected.map(jid => {
      const c = contacts.find(x => x.jid === jid);
      const label = c ? contactLabel(c) : jid;
      return `<span class="contact-tag">${label} <span class="remove" data-jid="${jid}">×</span></span>`;
    }).join('');
    container.querySelectorAll('.remove').forEach(el => {
      el.addEventListener('click', () => {
        const idx = selected.indexOf(el.dataset.jid);
        if (idx > -1) selected.splice(idx, 1);
        render(input.value);
        if (onSelect) onSelect(selected);
        updateTags();
      });
    });
  }

  if (multiple && opts.tagsContainer) updateTags();

  return { selected, filtered, render, updateTags };
}
