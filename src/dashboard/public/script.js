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
