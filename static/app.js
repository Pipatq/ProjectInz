// --- JAVASCRIPT SECTION ---
// --- GLOBAL STATE ---
let productList = [];
let shoppingCart = [];
let currentPatientDetails = {};
let transactionHistory = [];
let currentlyViewedTransaction = null;

const ALL_HEADERS = [
    'id', 'fname', 'lname', 'date', 'type', 'products', 'total',
    'doctor_name', 'consultant', 'hospital_fee', 'deposit_amount',
    'outstanding_balance', 'payment_method', 'review_status',
    'procedure_info', 'patient_age', 'comment'
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    await loadTransactionHistory();
    document.getElementById('firstName').focus();
});

async function loadProducts() {
    try {
        const response = await fetch(`${window.location.origin}/static/items.csv?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvData = await response.text();
        if (!csvData.trim()) {
            productList = [];
            return;
        }
        const rawList = parseCsv(csvData, true);
        
        productList = rawList.map(p => ({
            ...p,
            name: p.name || p.ชื่อ 
        }));

        console.log("Products loaded:", productList.length);
    } catch (error) {
        console.error("Error loading products:", error);
        alert("Failed to load product data.");
    }
}

// --- UI & TAB NAVIGATION ---
function openTab(tabId) {
    if (tabId !== 'receiptTab') {
        currentlyViewedTransaction = null;
    }
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[onclick*="'${tabId}'"]`).classList.add('active');
}

// --- PATIENT & BILLING LOGIC (TAB 1) ---
function savePatientInfoAndProceed() {
    const firstName = document.getElementById('firstName').value.trim();
    if (!firstName) {
        alert("Please enter at least a first name.");
        return;
    }
    
    const checkedStatuses = Array.from(document.querySelectorAll('input[name="reviewStatus"]:checked'))
                                      .map(cb => cb.value)
                                      .join(',');

    currentPatientDetails = {
        firstName: firstName,
        lastName: document.getElementById('lastName').value.trim(),
        type: document.getElementById('patientType').value,
        patientAge: document.getElementById('patientAge').value,
        doctorName: document.getElementById('doctorName').value.trim(),
        consultant: document.getElementById('consultant').value.trim(),
        procedureInfo: document.getElementById('procedureInfo').value.trim(),
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        reviewStatus: checkedStatuses,
        comment: document.getElementById('comment').value.trim() 
    };
    openTab('productsTab');
}

function updateBillingSummary() {
    const productTotal = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const hospitalFee = parseFloat(document.getElementById('hospitalFee').value) || 0;
    const depositAmount = parseFloat(document.getElementById('depositAmount').value) || 0;
    const grandTotal = productTotal + hospitalFee;
    const outstandingBalance = grandTotal - depositAmount;

    document.getElementById('summaryProductTotal').textContent = `${productTotal.toFixed(2)} ฿`;
    document.getElementById('summaryHospitalFee').textContent = `${hospitalFee.toFixed(2)} ฿`;
    document.getElementById('summaryGrandTotal').textContent = `${grandTotal.toFixed(2)} ฿`;
    document.getElementById('summaryDeposit').textContent = `${depositAmount.toFixed(2)} ฿`;
    document.getElementById('summaryOutstanding').textContent = `${outstandingBalance.toFixed(2)} ฿`;
    return { productTotal, hospitalFee, depositAmount, grandTotal, outstandingBalance };
}

// --- PRODUCT & CART LOGIC (TAB 2) ---
function quickSearch(term) {
    document.getElementById('searchProduct').value = term;
    searchProducts();
}

function clearSearch() {
    document.getElementById('searchProduct').value = '';
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchProduct').focus();
}

function searchProducts() {
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    if (searchTerm.length < 1) { resultsDiv.innerHTML = ''; return; }

    const filtered = productList.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchTerm)) || 
        (p.itemcode && p.itemcode.toLowerCase().includes(searchTerm))
    );
    
    let html = '';
    filtered.slice(0, 10).forEach(product => {
        const price = parseFloat(product[document.getElementById('patientType').value] || 0);
        html += `<div class="search-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="addItemToCart('${product.itemcode}')">
                    [${product.itemcode}] ${product.name} - <strong>${price.toFixed(2)}฿</strong>
                </div>`;
    });
    resultsDiv.innerHTML = html;
}

function addItemToCart(itemCode) {
    const product = productList.find(p => p.itemcode === itemCode);
    if (!product) return;

    const existingItem = shoppingCart.find(item => item.itemcode === itemCode);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        const price = parseFloat(product[document.getElementById('patientType').value] || 0);
        shoppingCart.push({ ...product, price: price, quantity: 1 });
    }
    updateCartDisplay();
    clearSearch();
}

function updateCartDisplay() {
    const cartBody = document.getElementById('cartItems');
    cartBody.innerHTML = '';
    shoppingCart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        const row = cartBody.insertRow();
        row.innerHTML = `
            <td>${item.name} <small>(${item.itemcode})</small></td>
            <td>${item.price.toFixed(2)}</td>
            <td><input type="number" min="1" value="${item.quantity}" onchange="updateQuantity(${index}, this.value)" style="width: 60px;"></td>
            <td>${itemTotal.toFixed(2)}</td>
            <td><button onclick="removeFromCart(${index})" style="background-color:#e74c3c; padding: 5px 10px;">X</button></td>
        `;
    });

    const productTotal = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = productTotal.toFixed(2);
    updateBillingSummary();
}

function updateQuantity(index, newQuantity) {
    const qty = parseInt(newQuantity, 10);
    if(qty > 0) shoppingCart[index].quantity = qty;
    else shoppingCart.splice(index, 1);
    updateCartDisplay();
}

function removeFromCart(index) {
    shoppingCart.splice(index, 1);
    updateCartDisplay();
}

// --- RECEIPT & SAVING LOGIC (TAB 3) ---
async function generateReceipt() {
    if (shoppingCart.length === 0 && !confirm("Cart is empty. Do you want to proceed without any products?")) {
        return;
    }
    await saveTransaction();
    populateReceiptForDisplay('TXN-' + Date.now());
    openTab('receiptTab');
}

async function saveTransaction() {
    const billing = updateBillingSummary();
    const transactionData = {
        id: 'TXN-' + Date.now(),
        fname: currentPatientDetails.firstName,
        lname: currentPatientDetails.lastName,
        date: new Date().toISOString(),
        type: currentPatientDetails.type,
        products: shoppingCart.map(item => `${item.name}(${item.quantity})`).join('; '),
        total: billing.productTotal,
        doctor_name: currentPatientDetails.doctorName,
        consultant: currentPatientDetails.consultant,
        hospital_fee: billing.hospitalFee,
        deposit_amount: billing.depositAmount,
        outstanding_balance: billing.outstandingBalance,
        payment_method: currentPatientDetails.paymentMethod,
        review_status: currentPatientDetails.reviewStatus,
        procedure_info: currentPatientDetails.procedureInfo,
        patient_age: currentPatientDetails.patientAge,
        comment: currentPatientDetails.comment
    };

    try {
        const response = await fetch(`${window.location.origin}/save-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });
        if (!response.ok) throw new Error('Server responded with an error.');
        
        console.log('Transaction saved successfully.');
        await loadTransactionHistory(); 
    } catch (error) {
        console.error("Error saving transaction:", error);
        alert("Could not save transaction to server.");
    }
}

function populateReceiptForDisplay(transactionId, details = currentPatientDetails, cart = shoppingCart, transaction = null) {
    const template = document.getElementById('receipt');
    const clone = template.cloneNode(true);
    clone.id = 'receipt_display';
    clone.classList.remove('print-area');

    const receiptContainer = document.querySelector('#receiptTab .receipt-preview-container');
    receiptContainer.innerHTML = '';
    receiptContainer.appendChild(clone);
    
    populatePrintableData(clone.id, transactionId, details, cart, transaction);
}

// --- HISTORY LOGIC (TAB 4) ---
async function loadTransactionHistory() {
    try {
        const response = await fetch(`${window.location.origin}/static/log.csv?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Failed to load history file.');
        const csvData = await response.text();
        if (csvData.trim() === '') {
            transactionHistory = [];
        } else {
            transactionHistory = parseCsv(csvData, true);
        }
        searchHistory();
    } catch (error) {
        console.error("Error loading transaction history:", error);
        document.getElementById('historyResults').innerHTML = '<p>Error loading transaction history.</p>';
    }
}

function searchHistory() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const historyDiv = document.getElementById('historyResults');
    
    const filtered = transactionHistory.filter(txn => {
        const fullName = `${txn.fname || ''} ${txn.lname || ''}`.toLowerCase();
        const date = new Date(txn.date).toLocaleString('th-TH').toLowerCase();
        const doctor = (txn.doctor_name || '').toLowerCase();
        return fullName.includes(searchTerm) || date.includes(searchTerm) || doctor.includes(searchTerm);
    });
    
    if (filtered.length === 0) {
        historyDiv.innerHTML = '<p>No transactions found.</p>'; return;
    }
    
    historyDiv.innerHTML = filtered.reverse().map(txn => `
        <div onclick="viewReceiptFromHistory('${txn.id}')" style="padding: 10px; border: 1px solid #ddd; margin-bottom: 5px; cursor: pointer;">
            <strong>${txn.fname || ''} ${txn.lname || ''}</strong> (${new Date(txn.date).toLocaleDateString('th-TH')})
            <div style="float: right;">ค้างชำระ: <strong>${parseFloat(txn.outstanding_balance || 0).toFixed(2)}฿</strong></div>
            <div style="font-size:0.9em; color: #555;">Doctor: ${txn.doctor_name || 'N/A'}</div>
        </div>`
    ).join('');
}

function viewReceiptFromHistory(txnId) {
        const txn = transactionHistory.find(t => t.id === txnId);
        if (!txn) { alert("Transaction not found!"); return; }

        currentlyViewedTransaction = txn;

        const detailsForReceipt = {
            firstName: txn.fname, lastName: txn.lname, type: txn.type, patientAge: txn.patient_age,
            doctorName: txn.doctor_name, consultant: txn.consultant, procedureInfo: txn.procedure_info,
            paymentMethod: txn.payment_method, reviewStatus: txn.review_status,
            comment: txn.comment 
        };
        
        const cartForReceipt = (txn.products || '').split(';').map(p => {
            const match = p.trim().match(/(.+)\((\d+)\)/);
            if (!match) return null;
            const [_, name, quantity] = match;
            const product = productList.find(prod => prod.name === name.trim()) || {price:0, itemcode:'N/A'};
            return { ...product, quantity: parseInt(quantity, 10), price: parseFloat(product[txn.type] || 0) };
        }).filter(Boolean);
        
        populateReceiptForDisplay(txn.id, detailsForReceipt, cartForReceipt, txn);
        
        openTab('receiptTab'); 
}

// --- PRINTING LOGIC ---
function populatePrintableData(elementId, transactionId, details, cart, transaction) {
    const container = document.getElementById(elementId);
    if(!container) return;

    const billing = transaction ? {
        productTotal: parseFloat(transaction.total || 0),
        hospitalFee: parseFloat(transaction.hospital_fee || 0),
        grandTotal: (parseFloat(transaction.total || 0) + parseFloat(transaction.hospital_fee || 0)),
        depositAmount: parseFloat(transaction.deposit_amount || 0),
        outstandingBalance: parseFloat(transaction.outstanding_balance || 0),
    } : updateBillingSummary();

    const fields = {
        receiptId: transactionId,
        receiptDate: new Date(transaction ? transaction.date : Date.now()).toLocaleString('th-TH'),
        receiptName: `${details.firstName} ${details.lastName}`,
        receiptAge: details.patientAge || 'N/A',
        receiptType: details.type,
        receiptDoctor: details.doctorName || 'N/A',
        receiptConsultant: details.consultant || 'N/A',
        receiptProcedure: details.procedureInfo || 'N/A',
        receiptSubtotal: billing.productTotal.toFixed(2),
        receiptHospitalFee: billing.hospitalFee.toFixed(2),
        receiptGrandTotal: billing.grandTotal.toFixed(2),
        receiptDeposit: billing.depositAmount.toFixed(2),
        receiptOutstanding: billing.outstandingBalance.toFixed(2),
        receiptPaymentMethod: details.paymentMethod,
        receiptReviewStatus: details.reviewStatus,
        comment: details.comment || 'N/A'
    };

    for(const key in fields) {
        const element = container.querySelector(`[data-field="${key}"]`);
        if(element) element.textContent = fields[key];
    }
    
    const receiptItemsBody = container.querySelector('#receiptItemsTable_print tbody');
    receiptItemsBody.innerHTML = '';
    cart.forEach(item => {
        const row = receiptItemsBody.insertRow();
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>${(item.price * item.quantity).toFixed(2)}</td>
        `;
    });
}

function printMainReceipt() {
    const detailsToPrint = currentlyViewedTransaction ? {
            firstName: currentlyViewedTransaction.fname, lastName: currentlyViewedTransaction.lname, type: currentlyViewedTransaction.type, patientAge: currentlyViewedTransaction.patient_age,
            doctorName: currentlyViewedTransaction.doctor_name, consultant: currentlyViewedTransaction.consultant, procedureInfo: currentlyViewedTransaction.procedure_info,
            paymentMethod: currentlyViewedTransaction.payment_method, reviewStatus: currentlyViewedTransaction.review_status,
            comment: currentlyViewedTransaction.comment 
        } : currentPatientDetails;

    const cartToPrint = currentlyViewedTransaction ? (currentlyViewedTransaction.products || '').split(';').map(p => {
            const match = p.trim().match(/(.+)\((\d+)\)/);
            if (!match) return null;
            const [_, name, quantity] = match;
            const product = productList.find(prod => prod.name === name.trim()) || {price:0, itemcode:'N/A'};
            return { ...product, quantity: parseInt(quantity, 10), price: parseFloat(product[currentlyViewedTransaction.type] || 0) };
        }).filter(Boolean) : shoppingCart;

    const transactionId = currentlyViewedTransaction ? currentlyViewedTransaction.id : 'TXN-' + Date.now();

    populatePrintableData('receipt', transactionId, detailsToPrint, cartToPrint, currentlyViewedTransaction);
    window.print();
}

window.onafterprint = () => {
    document.body.classList.remove('print-active');
};

function parseCsv(csvData, hasHeader = true) {
    const lines = csvData.trim().split(/\r?\n/);
    if (hasHeader && lines.length < 2) return []; 
    if (!hasHeader && lines.length < 1) return [];

    const headerRow = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const startIndex = hasHeader ? 1 : 0;
    
    const dataRows = lines.slice(startIndex);
    if(dataRows.length === 0) return [];
    
    const csvRegex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;

    return dataRows.map(line => {
        if (!line.trim()) return null;

        const matches = [...line.matchAll(csvRegex)];
        const values = matches.map(m => {
            let value = m[1]; 
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            return value;
        });
        
        let obj = {};
        headerRow.forEach((header, index) => {
            obj[header] = values[index] !== undefined ? values[index].trim() : '';
        });
        return obj;
    }).filter(Boolean); 
}

function resetFlow() {
    document.getElementById('patientTab').querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => input.value = '');
    document.getElementById('patientType').selectedIndex = 0;
    document.getElementById('payCash').checked = true;

    document.querySelectorAll('input[name="reviewStatus"]').forEach(cb => cb.checked = false);

    document.getElementById('hospitalFee').value = 0;
    document.getElementById('depositAmount').value = 0;

    shoppingCart = [];
    currentPatientDetails = {};
    document.getElementById('searchProduct').value = '';
    document.getElementById('searchResults').innerHTML = '';
    
    updateCartDisplay();
    openTab('patientTab');
    document.getElementById('firstName').focus();
}