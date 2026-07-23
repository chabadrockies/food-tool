let categories = [];
let items = [];
let deliveryMethods = {};
const orders = {};
let activeDate = '';

const money = value => `$${value.toLocaleString()}`;
const formatDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const nextDay = value => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + 1); return formatDate(date); };
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
      ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
      <div class="price">${money(item.price)}</div>
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
  document.getElementById('date-totals').innerHTML = dates.map(date => {
    const order = orders[date];
    const itemCount = order.quantities.reduce((sum, quantity) => sum + quantity, 0);
    return `<section class="date-total">
      <span class="total-date">${dateLabel(date)}</span><span class="total-caption">${itemCount} item${itemCount === 1 ? '' : 's'}</span>
      <div class="delivery-field"><label class="total-caption" for="delivery-${date}">Delivery</label><select id="delivery-${date}" class="w3-select w3-border" onchange="setDelivery('${date}',this.value)">${deliveryOptions(order.delivery)}</select></div>
      <div class="total-numbers"><div><span class="total-caption">Food</span>${money(foodTotal(order))}</div><div><span class="total-caption">Delivery</span>${money(deliveryMethods[order.delivery].fee)}</div><div><span class="total-caption">Total</span><strong>${money(orderTotal(order))}</strong></div></div>
    </section>`;
  }).join('');
  document.getElementById('grand-total').textContent = money(dates.reduce((total, date) => total + orderTotal(orders[date]), 0));
}
function render() { document.getElementById('order-date').value = activeDate; renderMenu(); renderTotals(); }
function addItem(index) { activeOrder().quantities[index] += 1; render(); }
function changeQuantity(index, adjustment) { const order = activeOrder(); order.quantities[index] = Math.max(0, order.quantities[index] + adjustment); render(); }
function setDelivery(date, method) { orders[date].delivery = method; renderTotals(); }
function selectAdjacent(direction) { const dates = Object.keys(orders).sort(); const date = dates[dates.indexOf(activeDate) + direction]; if (date) { activeDate = date; render(); } }

async function initialize() {
  const response = await fetch('data.json');
  if (!response.ok) throw new Error('Unable to load menu data.');
  const data = await response.json();
  categories = data.categories;
  items = categories.flatMap(category => category.items);
  deliveryMethods = Object.fromEntries(data.deliveryMethods.map(method => [method.id, method]));
  createOrder(today);
  render();
  document.getElementById('previous-date').addEventListener('click', () => selectAdjacent(-1));
  document.getElementById('next-date').addEventListener('click', () => selectAdjacent(1));
  document.getElementById('order-date').addEventListener('change', event => { const date = event.target.value; if (date) { createOrder(date, activeOrder().delivery); render(); } });
  document.getElementById('new-date').addEventListener('click', () => { const delivery = activeOrder().delivery; createOrder(nextDay(activeDate), delivery); render(); });
}

initialize().catch(error => { document.getElementById('menu').innerHTML = `<p class="status-message">${error.message} Please open this site through GitHub Pages or another web server.</p>`; });