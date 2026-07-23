let categories = [];
let items = [];
let deliveryMethods = {};
const orders = {};
let activeDate = '';
let invoiceFormat = 'email';
let showDelivery = false;
let sidebarManuallyScrolled = false;
let programmaticSidebarScroll = false;

const money = value => `$${value.toLocaleString()}`;
const formatDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const nextDay = value => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + 1); return formatDate(date); };
const nextOrderDate = value => { const date = new Date(`${value}T12:00:00`); do { date.setDate(date.getDate() + 1); } while (date.getDay() === 6); return formatDate(date); };
const today = formatDate(new Date());

function createOrder(date, delivery = 'pickup') {
  if (!orders[date]) orders[date] = { quantities: Array(items.length).fill(0), delivery };
  activeDate = date;
}
function activeOrder() { return orders[activeDate]; }
function foodTotal(order) { return order.quantities.reduce((total, quantity, index) => total + quantity * items[index].price, 0); }
function orderTotal(order) { return foodTotal(order) + deliveryMethods[order.delivery].fee; }
function categoryId(name) { return name.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and'); }

function renderMenu() {
  const order = activeOrder();
  document.getElementById('active-date-message').textContent = `Editing ${dateLabel(activeDate)}`;
  document.getElementById('menu').innerHTML = categories.map(category => {
    const id = categoryId(category.name);
    const categoryItems = category.items.map(item => items.indexOf(item));
    return `<section aria-labelledby="${id}">
      <h2 id="${id}" class="section-heading">${category.name}</h2>
      ${category.subtitle ? `<p class="category-subtitle">${category.subtitle}</p>` : ''}
      <div class="menu-grid">${categoryItems.map(index => menuTile(index, order.quantities[index])).join('')}</div>
    </section>`;
  }).join('');
}
function menuTile(index, quantity) {
  const item = items[index];
  return `<article class="menu-tile">
    <button class="tile-add" type="button" onclick="addItem(${index})" aria-label="Add ${item.name}">
      <div class="item-name">${item.name}</div>
      ${quantity ? '' : '<div class="add-hint">Tap to add</div>'}
    </button>
    ${quantity ? `<div class="quantity-bar"><span class="selected-label">Added</span><div class="quantity-control"><button type="button" aria-label="Remove one ${item.name}" onclick="changeQuantity(${index},-1)">−</button><span class="quantity">${quantity}</span><button type="button" aria-label="Add one ${item.name}" onclick="changeQuantity(${index},1)">+</button></div></div>` : ''}
  </article>`;
}
function deliveryOptions(selected) {
  return Object.values(deliveryMethods).map(method => `<option value="${method.id}" ${method.id === selected ? 'selected' : ''}>${method.name} — ${money(method.fee)}</option>`).join('');
}
function renderTotals() {
  const dates = Object.keys(orders).sort();
  const totalsContent = document.getElementById('totals-content');
  const savedScrollTop = totalsContent.scrollTop;
  document.getElementById('date-totals').innerHTML = dates.map(date => {
    const order = orders[date];
    const selectedItems = items.map((item, index) => ({ item, quantity: order.quantities[index] })).filter(selection => selection.quantity);
    const itemList = selectedItems.length ? selectedItems.map(({ item, quantity }) => `<div class="selected-item"><span>${quantity} × ${item.name}</span><span>${money(quantity * item.price)}</span></div>`).join('') : '<p class="empty-selection">No food selected.</p>';
    return `<section id="date-total-${date}" class="date-total ${date === activeDate ? 'current-date' : ''}">
      <span class="total-date">${dateLabel(date)}</span>
      <div class="selected-items">${itemList}</div>
      
      <div class="date-summary"><div><span class="total-caption">Food subtotal</span>${money(foodTotal(order))}</div><div><span class="total-caption">Delivery</span>${money(deliveryMethods[order.delivery].fee)}</div><div><span class="total-caption">Date total</span><strong>${money(orderTotal(order))}</strong></div></div>
    </section>`;
  }).join('');
  const foodSubtotal = dates.reduce((total, date) => total + foodTotal(orders[date]), 0);
  const grandTotal = dates.reduce((total, date) => total + orderTotal(orders[date]), 0);
  document.getElementById('food-subtotal').textContent = money(foodSubtotal);
  document.getElementById('grand-total').textContent = money(grandTotal);
  if (sidebarManuallyScrolled) totalsContent.scrollTop = savedScrollTop;
  else scrollSidebarToCurrentDate();
}
function scrollSidebarToCurrentDate() {
  const totalsContent = document.getElementById('totals-content');
  const currentDate = document.getElementById(`date-total-${activeDate}`);
  if (!currentDate || window.matchMedia('(max-width: 900px)').matches) return;
  programmaticSidebarScroll = true;
  totalsContent.scrollTop = Math.max(0, currentDate.offsetTop - totalsContent.offsetTop - 8);
  requestAnimationFrame(() => { programmaticSidebarScroll = false; });
}
function render() {
  const order = activeOrder();
  const activeDateObject = new Date(`${activeDate}T12:00:00`);
  document.getElementById('order-date').value = activeDate;
  document.getElementById('top-weekday').textContent = activeDateObject.toLocaleDateString('en-CA', { weekday: 'long' });
  document.getElementById('top-date').textContent = activeDateObject.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById('active-delivery-label').textContent = 'Delivery';
  document.getElementById('active-delivery').innerHTML = deliveryOptions(order.delivery);
  renderMenu();
  renderTotals();
}
function addItem(index) { activeOrder().quantities[index] += 1; render(); }
function changeQuantity(index, adjustment) { const order = activeOrder(); order.quantities[index] = Math.max(0, order.quantities[index] + adjustment); render(); }
function setActiveDelivery(method) { activeOrder().delivery = method; renderTotals(); }
function animateDateChange(direction) {
  const menu = document.querySelector('.menu-area');
  const animationClass = direction > 0 ? 'date-slide-next' : 'date-slide-previous';
  menu.classList.remove('date-slide-next', 'date-slide-previous');
  void menu.offsetWidth;
  menu.classList.add(animationClass);
  setTimeout(() => menu.classList.remove(animationClass), 320);
}
function selectAdjacent(direction, animate = false) {
  const dates = Object.keys(orders).sort();
  const date = dates[dates.indexOf(activeDate) + direction];
  if (date) { activeDate = date; render(); if (animate) animateDateChange(direction); }
}
function escapeHtml(value) { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function ordinal(day) { const remainder = day % 100; if (remainder >= 11 && remainder <= 13) return `${day}th`; return `${day}${({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th')}`; }
function invoiceDateLabel(value) { const date = new Date(`${value}T12:00:00`); const weekday = date.toLocaleDateString('en-CA', { weekday: 'long' }); const month = date.toLocaleDateString('en-CA', { month: 'long' }); return `${weekday}, ${month} ${ordinal(date.getDate())}`; }
function pluralize(name) { return /s$/i.test(name) ? name : `${name}s`; }
function invoiceItemLine(item, quantity) {
  return quantity === 1
    ? `1 ${item.name} — ${money(item.price)}`
    : `${quantity} ${pluralize(item.name)} — ${money(item.price)} × ${quantity} = ${money(item.price * quantity)}`;
}
function invoiceItemMarkup(line) {
  const escaped = escapeHtml(line);
  return line.includes(' = ')
    ? escaped.replace(/(= )(\$[\d,]+)$/g, '$1<strong>$2</strong>')
    : escaped.replace(/(\$[\d,]+)$/g, '<strong>$1</strong>');
}
function invoiceData() {
  const dates = Object.keys(orders).sort();
  const sections = dates.map(date => {
    const order = orders[date];
    const lines = items.map((item, index) => ({ item, quantity: order.quantities[index] })).filter(selection => selection.quantity).map(({ item, quantity }) => invoiceItemLine(item, quantity));
    return { date, lines, delivery: deliveryMethods[order.delivery], total: orderTotal(order) };
  });
  return {
    sections,
    foodSubtotal: dates.reduce((total, date) => total + foodTotal(orders[date]), 0),
    deliveryTotal: dates.reduce((total, date) => total + deliveryMethods[orders[date].delivery].fee, 0),
    grandTotal: dates.reduce((total, date) => total + orderTotal(orders[date]), 0)
  };
}
function invoiceSummaryMarkup(invoice) {
  return `<div class="invoice-summary"><div><strong>Meals Subtotal:</strong> <strong>${money(invoice.foodSubtotal)} USD</strong></div><div><strong>Delivery Charges:</strong> <strong>${money(invoice.deliveryTotal)} USD</strong></div><div><strong>Weekday Meals Total:</strong> <strong>${money(invoice.grandTotal)} USD</strong></div></div>`;
}
function emailInvoiceMarkup(invoice, showDelivery) {
  return `<h1 id="invoice-title"><strong>Kosher Food Order Summary</strong></h1>${invoice.sections.map(section => `<section><h2><strong>${invoiceDateLabel(section.date)}</strong></h2>${showDelivery ? `<div class="delivery-details"><div><strong>Delivery:</strong> ${escapeHtml(section.delivery.name)} — <strong>${money(section.delivery.fee)}</strong></div><div><strong>Delivery Time:</strong> TBD</div></div>` : ''}<div class="invoice-items">${section.lines.length ? section.lines.map(line => `<div class="invoice-line">${invoiceItemMarkup(line)}</div>`).join('') : '<div class="invoice-line">No food selected.</div>'}</div></section>`).join('')}${invoiceSummaryMarkup(invoice)}`;
}
function whatsappItemLine(line) {
  return line.includes(' = ')
    ? line.replace(/(= )(\$[\d,]+)$/g, '$1*$2*')
    : line.replace(/(\$[\d,]+)$/g, '*$1*');
}
function whatsappInvoiceText(invoice, showDelivery) {
  return [`*Kosher Food Order Summary*`, '', ...invoice.sections.flatMap(section => [`*${invoiceDateLabel(section.date)}*`, ...(showDelivery ? [`*Delivery:* ${section.delivery.name} — *${money(section.delivery.fee)}*`, '*Delivery Time:* TBD'] : []), ...section.lines.map(whatsappItemLine), '']), `*Meals Subtotal:* *${money(invoice.foodSubtotal)} USD*`, `*Delivery Charges:* *${money(invoice.deliveryTotal)} USD*`, `*Weekday Meals Total:* *${money(invoice.grandTotal)} USD*`].join('\n');
}
function showInvoice() {
  const invoice = invoiceData();
  
  const content = document.getElementById('invoice-content');
  content.classList.toggle('whatsapp-format', invoiceFormat === 'whatsapp');
  if (invoiceFormat === 'whatsapp') content.textContent = whatsappInvoiceText(invoice, showDelivery);
  else content.innerHTML = emailInvoiceMarkup(invoice, showDelivery);
  document.getElementById('copy-status').textContent = '';
  document.getElementById('invoice-modal').hidden = false;
}
function closeInvoice() { document.getElementById('invoice-modal').hidden = true; }
function invoicePlainText() {
  const invoice = invoiceData();
  
  return ['Kosher Food Order Summary', '', ...invoice.sections.flatMap(section => [invoiceDateLabel(section.date), ...(showDelivery ? [`Delivery: ${section.delivery.name} — ${money(section.delivery.fee)}`, 'Delivery Time: TBD'] : []), ...section.lines, '']), `Meals Subtotal: ${money(invoice.foodSubtotal)} USD`, `Delivery Charges: ${money(invoice.deliveryTotal)} USD`, `Weekday Meals Total: ${money(invoice.grandTotal)} USD`].join('\n');
}
function toggleInvoiceFormat() {
  invoiceFormat = invoiceFormat === 'email' ? 'whatsapp' : 'email';
  document.getElementById('format-toggle').textContent = invoiceFormat === 'email' ? 'For Gmail' : 'For WhatsApp';
  if (!document.getElementById('invoice-modal').hidden) showInvoice();
}
async function copyInvoice() {
  const text = invoiceFormat === 'whatsapp' ? whatsappInvoiceText(invoiceData(), showDelivery) : invoicePlainText();
  const html = document.getElementById('invoice-content').innerHTML;
  try {
    if (invoiceFormat === 'email' && navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    document.getElementById('copy-status').textContent = 'Invoice copied.';
  } catch {
    document.getElementById('copy-status').textContent = 'Select the invoice text above to copy it manually.';
  }
}

async function initialize() {
  const response = await fetch('data.json');
  if (!response.ok) throw new Error('Unable to load menu data.');
  const data = await response.json();
  categories = data.categories;
  items = categories.flatMap(category => category.items);
  deliveryMethods = Object.fromEntries(data.deliveryMethods.map(method => [method.id, method]));
  createOrder(today);
  render();
  const totalsContent = document.getElementById('totals-content');
  totalsContent.addEventListener('wheel', () => { sidebarManuallyScrolled = true; }, { passive: true });
  totalsContent.addEventListener('touchmove', () => { sidebarManuallyScrolled = true; }, { passive: true });
  totalsContent.addEventListener('scroll', () => { if (!programmaticSidebarScroll) sidebarManuallyScrolled = true; }, { passive: true });
  document.getElementById('previous-date').addEventListener('click', () => selectAdjacent(-1));
  document.getElementById('next-date').addEventListener('click', () => selectAdjacent(1));
  let touchStart = null;
  document.addEventListener('touchstart', event => {
    if (!window.matchMedia('(max-width: 600px)').matches || event.touches.length !== 1 || event.target.closest('.invoice-modal')) return;
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  document.addEventListener('touchend', event => {
    if (!touchStart || !window.matchMedia('(max-width: 600px)').matches || document.getElementById('invoice-modal').hidden === false) { touchStart = null; return; }
    const touch = event.changedTouches[0];
    const horizontal = touch.clientX - touchStart.x;
    const vertical = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(horizontal) >= 80 && Math.abs(horizontal) > Math.abs(vertical) * 1.5) selectAdjacent(horizontal < 0 ? 1 : -1, true);
  }, { passive: true });
  document.getElementById('order-date').addEventListener('change', event => { const date = event.target.value; if (date) { createOrder(date, activeOrder().delivery); render(); } });
  document.getElementById('new-date').addEventListener('click', () => { const delivery = activeOrder().delivery; createOrder(nextOrderDate(activeDate), delivery); render(); });
  document.getElementById('active-delivery').addEventListener('change', event => setActiveDelivery(event.target.value));
  document.getElementById('export-invoice').addEventListener('click', showInvoice);
  document.getElementById('close-invoice').addEventListener('click', closeInvoice);
  document.getElementById('copy-invoice').addEventListener('click', copyInvoice);
  document.getElementById('delivery-toggle').addEventListener('click',()=>{showDelivery=!showDelivery;document.getElementById('delivery-toggle').textContent=showDelivery?'Hide Delivery':'Show Delivery';if(!document.getElementById('invoice-modal').hidden)showInvoice();});
  document.getElementById('format-toggle').addEventListener('click', toggleInvoiceFormat);
  document.getElementById('invoice-modal').addEventListener('click', event => { if (event.target.id === 'invoice-modal') closeInvoice(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeInvoice(); });
  if (/Android/i.test(navigator.userAgent)) document.body.classList.add('android');
}

initialize().catch(error => { document.getElementById('menu').innerHTML = `<p class="status-message">${error.message} Please open this site through GitHub Pages or another web server.</p>`; });