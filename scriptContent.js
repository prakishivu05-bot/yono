// DATA
const transactionsTemplate = [
    {icon:'🛒',bg:'#E3F2FD',name:'BigBasket',date:'04 Apr 2026, 10:22 AM',type:'debit',amount:'₹1,248.00',bal:'₹1,24,580.00',ref:'UPI/263748120/BB'},
    {icon:'💰',bg:'#E8F5E9',name:'Salary Credit',date:'01 Apr 2026, 09:00 AM',type:'credit',amount:'₹65,000.00',bal:'₹1,25,828.00',ref:'NEFT/HDFC/SAL0401'},
    {icon:'🏠',bg:'#FFF3E0',name:'House Rent',date:'31 Mar 2026, 11:00 PM',type:'debit',amount:'₹18,000.00',bal:'₹60,828.00',ref:'UPI/263102938/RENT'},
    {icon:'⚡',bg:'#F3E5F5',name:'BESCOM Bill',date:'28 Mar 2026, 02:15 PM',type:'debit',amount:'₹2,340.00',bal:'₹78,828.00',ref:'BBPS/BESCOM/3847'}
];

const upiContacts = [
    {name:'Priya Sharma',vpa:'priya.sharma@ybl',color:'#E91E63',last:'₹5,000'},
    {name:'Amit Verma',vpa:'amitv@oksbi',color:'#1976D2',last:'₹2,500'},
    {name:'Sunita Rao',vpa:'sunita@paytm',color:'#388E3C',last:'₹1,200'},
    {name:'Rahul Nair',vpa:'rahul.n@upi',color:'#F57C00',last:'₹800'},
];

// STATE Variables
let pinBuffer = '';
let currentTab = 'home';
let toastTimer = null;

let userProfile = null;
let failedLoginAttempts = 0;
let failedTxnAttempts = 0;
let pendingTxn = null; 
window.isHoneypot = false;

// BIOMETRICS
let devEnv = { ip: '192.168.1.1', device: 'Chrome Desktop' };
let biometrics = { backspaces: 0, startTime: null, keystrokes: 0, directionChanges: 0, totalDist: 0, lastPt: null, lastAngle: 0 };

document.addEventListener('keydown', (e) => {
    if (!biometrics.startTime) biometrics.startTime = Date.now();
    biometrics.keystrokes++;
    if (e.key === 'Backspace' || e.key === 'Delete') biometrics.backspaces++;
});

document.addEventListener('mousemove', (e) => {
    if (!biometrics.lastPt) { biometrics.lastPt = {x: e.clientX, y: e.clientY}; return; }
    const dx = e.clientX - biometrics.lastPt.x;
    const dy = e.clientY - biometrics.lastPt.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 5) { 
        biometrics.totalDist += dist;
        const angle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(angle - biometrics.lastAngle);
        if (angleDiff > 1) biometrics.directionChanges++; 
        biometrics.lastAngle = angle;
        biometrics.lastPt = {x: e.clientX, y: e.clientY};
    }
});

async function notifyDigitalTwin(action, amount) {
    try {
        let hesitationMs = biometrics.startTime ? (Date.now() - biometrics.startTime) : 0;
        let jitterScore = Math.min(100, Math.floor((biometrics.directionChanges / Math.max(1, biometrics.totalDist)) * 5000));
        
        let metrics = { backspaces: biometrics.backspaces, hesitationMs, jitterScore };
        biometrics = { backspaces: 0, startTime: null, keystrokes: 0, directionChanges: 0, totalDist: 0, lastPt: null, lastAngle: 0 };

        let payload = { 
            userId: window.isHoneypot ? 'Hacker_Trap' : (userProfile ? userProfile.name : 'Unknown'),
            action: action, 
            amount: amount, 
            ip: devEnv.ip, 
            device: devEnv.device, 
            metrics: metrics,
            isHoneypot: window.isHoneypot
        };

        fetch('/api/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch(e) {}
}

window.onload = () => {
    document.getElementById('topbarDate').textContent = new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
    renderUPIContacts();
    renderServicesTab('banking');
    loadUserProfile();
};

function loadUserProfile() {
    const saved = localStorage.getItem('yonoUserProfile');
    if (saved) {
        userProfile = JSON.parse(saved);
        goTo('splash');
    } else {
        goTo('register');
    }
}

function registerUser() {
    const name = document.getElementById('regName').value;
    const pin = document.getElementById('regPin').value;
    if(name.length < 3 || pin.length !== 4) {
        showToast('Please enter valid name and 4-digit PIN');
        return;
    }
    userProfile = {
        name: name,
        pin: pin,
        balance: 154000.00,
        transactions: JSON.parse(JSON.stringify(transactionsTemplate))
    };
    localStorage.setItem('yonoUserProfile', JSON.stringify(userProfile));
    notifyDigitalTwin('device_registered', 0);
    showToast('Registration Successful');
    goTo('login');
}

function updateUIForUser() {
    let name = userProfile.name;
    let bal = userProfile.balance;
    let txns = userProfile.transactions || [];
    
    if (window.isHoneypot) {
        name = 'System Admin';
        bal = 500000.00;
        document.getElementById('acNumber').textContent = '●●●● ●●●● 9999';
    } else {
        document.getElementById('acNumber').textContent = '●●●● ●●●● 4782';
    }

    const els = document.querySelectorAll('#tbName, .profile-name');
    els.forEach(el => {if(el) el.textContent = name;});
    
    document.getElementById('tbAvatar').textContent = name.substring(0,2).toUpperCase();
    document.querySelector('.profile-avatar-big').textContent = name.substring(0,2).toUpperCase();
    document.getElementById('acBalance').textContent = parseFloat(bal).toLocaleString('en-IN', {minimumFractionDigits: 2});

    renderTransactions(txns);
}

function renderTransactions(txns) {
  const el = document.getElementById('recentTxns');
  if(!el) return;
  el.innerHTML = txns.slice(0,5).map(t => `<div class="txn-item"><div class="txn-icon" style="background:${t.bg}">${t.icon}</div><div class="txn-details"><div class="txn-name">${t.name}</div><div class="txn-date">${t.date}</div><div class="txn-ref">${t.ref}</div></div><div class="txn-amount"><div class="${t.type}">${t.type==='debit'?'- ':'+ '}${t.amount}</div><div class="bal">Bal: ${t.bal}</div></div></div>`).join('');
}

function renderUPIContacts() {
  const el = document.getElementById('upiContacts');
  if(!el) return;
  el.innerHTML = upiContacts.map(c => `<div class="upi-contact" onclick="showModal('upiPay','${c.name}','${c.vpa}')"><div class="upi-avatar" style="background:${c.color}">${c.name[0]}</div><div><div class="upi-name">${c.name}</div><div class="upi-vpa">${c.vpa}</div></div><div style="margin-left:auto"><div class="upi-amount-hint">Last: ${c.last}</div></div></div>`).join('');
}

function renderServicesTab(tab) {
  const el = document.getElementById('servicesTabContent');
  if(!el) return;
  el.innerHTML = `<div style='padding: 20px; text-align:center; color:#607080;'>Mock Services Loaded</div>`;
}

function switchServicesTab(el, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// NAVIGATION
function goTo(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  let t = document.getElementById(screen);
  if(t) t.classList.add('active');
  
  if (screen === 'splash' && userProfile) {
     setTimeout(() => goTo('login'), 2000); 
  }
  
  const hasNav = ['home','upi','services','rewards','profile'].includes(screen);
  const n = document.getElementById('bottomNav');
  if(n) n.style.display = hasNav ? 'flex' : 'none';
}

function goToTab(tab) {
  goTo(tab);
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + tab);
  if (navEl) navEl.classList.add('active');
}

// PIN LOGIC (4 DIGIT)
function enterPin(d) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += d;
  for (let i = 0; i < 4; i++) {
    const p = document.getElementById('d' + i);
    if(p) p.classList.toggle('filled', i < pinBuffer.length);
  }
  if (pinBuffer.length === 4) {
    // Slight delay for UX
    setTimeout(() => {
      validateLoginPin();
    }, 200);
  }
}

function clearPin() {
  if (pinBuffer.length > 0) {
    pinBuffer = pinBuffer.slice(0, -1);
    for (let i = 0; i < 4; i++) {
        let p = document.getElementById('d' + i);
        if(p) p.classList.toggle('filled', i < pinBuffer.length);
    }
  }
}

function validateLoginPin() {
    const entered = pinBuffer;
    
    setTimeout(() => {
      pinBuffer = '';
      for (let i = 0; i < 4; i++) {
          let p = document.getElementById('d' + i);
          if(p) p.classList.remove('filled');
      }
    }, 100);

    if (!userProfile) return;

    if (entered === userProfile.pin) {
        failedLoginAttempts = 0;
        notifyDigitalTwin('login_success', 0);
        updateUIForUser();
        goTo('home');
        goToTab('home');
    } else {
        failedLoginAttempts++;
        if (failedLoginAttempts >= 3) {
            window.isHoneypot = true;
            failedLoginAttempts = 0;
            notifyDigitalTwin('honeypot_login_breach', 0);
            updateUIForUser(); // Generates fake data
            goTo('home');
            goToTab('home');
            showToast('Login Successful');
        } else {
            notifyDigitalTwin('login_failed_attempt', 0);
            showToast(`Incorrect PIN. Attempts left: ${3 - failedLoginAttempts}`);
        }
    }
}

// MODALS AND TRANSACTION
function showModal(type, ...args) {
  const body = document.getElementById('modalBody');
  document.getElementById('modalOverlay').classList.add('open');

  const modals = {
    transfer: () => `<button class="modal-close" onclick="closeModal()">×</button><div class="modal-title">Fund Transfer</div><div class="input-group"><label>Beneficiary Account / UPI ID</label><input type="text" placeholder="Enter A/C no or UPI ID" id="benef"></div><div class="input-group"><label>Amount (₹)</label><input type="number" placeholder="0.00" id="amt"></div><div class="btn-row"><button class="btn-outline" onclick="closeModal()">Cancel</button><button class="btn-solid" onclick="initiateTxn('transfer')">Proceed</button></div>`,
    upiPay: () => `<button class="modal-close" onclick="closeModal()">×</button><div class="modal-title">Pay ${args[0]}</div><div class="input-group"><label>Amount (₹)</label><input type="number" placeholder="0.00" id="upiAmtQ" style="font-size:24px;background:#F8FBFF;"></div><button class="btn-solid" style="width:100%;margin-top:8px" onclick="initiateTxn('upi', '${args[0]}')">Pay ${args[0]}</button>`,
    authTxn: () => `<button class="modal-close" onclick="closeModal()">×</button><div class="modal-title" style="color:var(--sbi-blue)">Authenticate Payment</div><p style="font-size:13px; color:var(--subtext); margin-bottom: 16px;">Please enter your 4-digit MPIN to authorize ${args[0]} to ${args[1]}</p><div class="input-group"><input type="password" id="authPin" placeholder="4-Digit PIN" maxlength="4" style="font-size:24px; text-align:center; letter-spacing:10px;"></div><button class="btn-solid" style="width:100%;background:#003B7A" onclick="confirmTxn()">Confirm Payment</button>`  
  };
  body.innerHTML = (modals[type] || (() => `<div class="modal-title">Coming Soon</div>`))();
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
}

function initiateTxn(type, benefName) {
    let amtStr = type === 'transfer' ? document.getElementById('amt')?.value : document.getElementById('upiAmtQ')?.value;
    let amt = parseFloat(amtStr);
    
    if(!amt || isNaN(amt)) { showToast('Enter a valid amount'); return; }
    
    if(!window.isHoneypot && amt > userProfile.balance) {
        showToast('Insufficient Balance');
        return;
    }

    pendingTxn = { type: type, amount: amt, name: benefName || document.getElementById('benef')?.value || 'Unknown' };
    
    showModal('authTxn', '₹' + amt.toLocaleString('en-IN'), pendingTxn.name);
    biometrics.startTime = Date.now();
}

function confirmTxn() {
    const pin = document.getElementById('authPin').value;
    
    if(pin !== userProfile.pin) {
        failedTxnAttempts++;
        if(failedTxnAttempts >= 3) {
            window.isHoneypot = true;
            failedTxnAttempts = 0;
            notifyDigitalTwin('honeypot_txn_breach', pendingTxn.amount);
            executePendingTxn(); 
        } else {
            notifyDigitalTwin('txn_auth_failed', pendingTxn.amount);
            showToast(`Incorrect PIN. Attempts left: ${3 - failedTxnAttempts}`);
        }
        return;
    }
    
    failedTxnAttempts = 0;
    executePendingTxn();
}

function executePendingTxn() {
    notifyDigitalTwin(`transaction_${pendingTxn.type}`, pendingTxn.amount);

    if(!window.isHoneypot) {
        userProfile.balance -= pendingTxn.amount;
        userProfile.transactions.unshift({
            icon: pendingTxn.type === 'upi' ? '📱' : '💸',
            bg: '#FFF3E0',
            name: pendingTxn.name,
            date: new Date().toLocaleString('en-IN', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}),
            type: 'debit',
            amount: '₹' + pendingTxn.amount.toLocaleString('en-IN', {minimumFractionDigits: 2}),
            bal: '₹' + userProfile.balance.toLocaleString('en-IN', {minimumFractionDigits: 2}),
            ref: (pendingTxn.type==='upi'?'UPI/':'TXN/') + Date.now().toString().slice(-8)
        });
        localStorage.setItem('yonoUserProfile', JSON.stringify(userProfile));
    }
    
    updateUIForUser();
    closeModal();
    showSuccess(`₹${pendingTxn.amount.toLocaleString('en-IN')} Sent!`, `Payment to ${pendingTxn.name} successful.`, 'TXN'+Date.now().toString().slice(-8));
    pendingTxn = null;
}

function switchAccount(el, idx) {
  document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function showSuccess(title, sub, ref) {
  const el = document.getElementById('successOverlay');
  if(!el) return;
  document.getElementById('successTitle').textContent = title;
  document.getElementById('successSub').textContent = sub;
  document.getElementById('successRef').textContent = 'Ref: ' + ref;
  el.classList.add('show');
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('show');
}
 
function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
 
function logout() {
  goTo('login');
  document.getElementById('bottomNav').style.display = 'none';
  window.isHoneypot = false; 
  showToast('Logged out securely');
}
