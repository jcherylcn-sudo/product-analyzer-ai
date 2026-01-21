let products = [];
let analysisData = null;

window.addEventListener('DOMContentLoaded', () => {
  addProduct();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('addProductBtn').addEventListener('click', addProduct);
  document.getElementById('analyzeBtn').addEventListener('click', analyzeProducts);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });
}

function addProduct() {
  const index = products.length;
  const row = document.createElement('div');
  row.className = 'product-input-row';
  row.id = `product-${index}`;
  row.innerHTML = `
    <input 
      type="text" 
      placeholder="输入产品链接（Shopee/Lazada）"
      data-index="${index}"
    >
    ${index > 0 ? `<button class="btn btn-secondary btn-sm" onclick="removeProduct(${index})">删除</button>` : ''}
  `;
  document.getElementById('productsContainer').appendChild(row);
  products.push({ link: '', index });
}

function removeProduct(index) {
  document.getElementById(`product-${index}`).remove();
  products = products.filter(p => p.index !== index);
}

function clearAll() {
  document.getElementById('productsContainer').innerHTML = '';
  products = [];
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'none';
  addProduct();
}

async function analyzeProducts() {
  const links = Array.from(document.querySelectorAll('.product-input-row input'))
    .map(input => input.value.trim())
    .filter(link => link !== '');

  if (links.length === 0) {
    showError('请输入至少一个产品链接');
    return;
  }

  showLoading(true);
  document.getElementById('errorMessage').style.display = 'none';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || '分析失败');
      return;
    }

    analysisData = data;
    displayResults(data);
    document.getElementById('resultsSection').style.display = 'block';

  } catch (error) {
    showError(`错误: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

function displayResults(data) {
  displaySellingPoints(data.products);
  displayReviews(data.products);
  displayParameters(data.products);
  displaySuggestions(data.suggestions);
  switchTab('selling-points');
}

function displaySellingPoints(products) {
  let html = '';
  products.forEach((product, index) => {
    html += `
      <div class="card" style="margin-bottom: 20px;">
        <h4>${index + 1}. ${product.name}</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${product.sellingPoints.map(point => `<span class="badge">${point}</span>`).join('')}
        </div>
      </div>
    `;
  });
  document.getElementById('sellingPointsContent').innerHTML = html;
}

function displayReviews(products) {
  let html = '';
  products.forEach((product, index) => {
    const reviews = product.reviews;
    const dist = reviews.distribution;

    html += `
      <div class="review-distribution">
        <h4>${index + 1}. ${product.name}</h4>
        <p style="color: #666; margin: 0 0 15px 0;">总评价数: <strong>${reviews.totalCount}</strong> 条</p>

        <div style="margin-bottom: 20px;">
          ${createStarRow('5星', dist['5star'])}
          ${createStarRow('4星', dist['4star'])}
          ${createStarRow('3星', dist['3star'])}
          ${createStarRow('2星', dist['2star'])}
          ${createStarRow('1星', dist['1star'])}
        </div>

        <div class="feedback-section">
          <h5>✓ 用户喜欢：</h5>
          <div class="feedback-list">
            ${reviews.likes.map(like => `<span class="feedback-tag positive">✓ ${like}</span>`).join('')}
          </div>
        </div>

        <div class="feedback-section">
          <h5>✗ 用户吐槽：</h5>
          <div class="feedback-list">
            ${reviews.dislikes.map(dislike => `<span class="feedback-tag negative">✗ ${dislike}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  });
  document.getElementById('reviewsContent').innerHTML = html;
}

function createStarRow(label, starData) {
  const percentage = parseInt(starData.percentage);
  return `
    <div class="star-row">
      <div class="star-label">${label}</div>
      <div class="star-bar">
        <div class="star-fill" style="width: ${percentage}%;">
          ${starData.count} (${starData.percentage})
        </div>
      </div>
    </div>
  `;
}

function displayParameters(products) {
  if (products.length === 0) return;

  const params = products[0].parameters;
  const paramKeys = Object.keys(params);

  let html = '<table class="comparison-table"><thead><tr><th>参数</th>';
  
  products.forEach((product, index) => {
    html += `<th>${index + 1}. ${product.name}</th>`;
  });
  html += '</tr></thead><tbody>';

  paramKeys.forEach(key => {
    html += '<tr>';
    html += `<td><strong>${formatParamName(key)}</strong></td>`;
    
    products.forEach(product => {
      const value = product.parameters[key];
      html += `<td>${value || '暂无信息'}</td>`;
    });
    
    html += '</tr>';
  });

  html += '</tbody></table>';
  document.getElementById('parametersContent').innerHTML = html;
}

function formatParamName(key) {
  const names = {
    'price': '价格',
    'sales': '销量',
    'shippingFee': '运费',
    'returnPolicy': '退货政策',
    'warranty': '保修信息',
    'material': '材质/规格',
    'weight': '重量',
    'dimensions': '尺寸'
  };
  return names[key] || key;
}

function displaySuggestions(suggestions) {
  const html = `
    <div class="card">
      <p>${suggestions}</p>
    </div>
  `;
  document.getElementById('suggestionsContent').innerHTML = html;
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function showLoading(show) {
  document.getElementById('loadingMessage').style.display = show ? 'block' : 'none';
}

function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = `❌ ${message}`;
  errorEl.style.display = 'block';
}
