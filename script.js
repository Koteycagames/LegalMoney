import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, ref, set, get, update, push, remove, child, onValue 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCYCnHLlUOYd8D_82Om5G9htlwVcThO3jY",
    authDomain: "webos-305b5.firebaseapp.com",
    databaseURL: "https://webos-305b5-default-rtdb.firebaseio.com",
    projectId: "webos-305b5",
    storageBucket: "webos-305b5.firebasestorage.app",
    messagingSenderId: "8010715305",
    appId: "1:8010715305:web:fdf4617f34494b995699b8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Функция показа обычной модалки
function showModal(message, title = "Уведомление") {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    document.getElementById('custom-modal').classList.remove('hidden');
}

document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('custom-modal').classList.add('hidden');
});

// Автодополнение почты
const emailInput = document.getElementById('email-input');
emailInput.addEventListener('blur', () => {
    let val = emailInput.value.trim();
    if (val && !val.includes('@')) {
        emailInput.value = val + '@gmail.com';
    }
});

let isRegisterMode = false;
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const authTitle = document.getElementById('auth-title');
const authBtn = document.getElementById('auth-btn');

toggleAuthModeBtn.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    authTitle.innerText = isRegisterMode ? 'Регистрация аккаунта' : 'Вход в систему';
    authBtn.innerText = isRegisterMode ? 'Зарегистрироваться' : 'Войти';
    toggleAuthModeBtn.innerText = isRegisterMode ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться';
});

authBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = document.getElementById('password-input').value;

    if (!email || !password) {
        showModal('Заполните все поля!', 'Ошибка');
        return;
    }

    try {
        if (isRegisterMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await set(ref(db, 'users/' + userCredential.user.uid), {
                email: email,
                balance: 0.00,
                hasLoggedInBefore: false
            });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        showModal('Ошибка: ' + error.message, 'Ошибка');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        document.getElementById('user-email-display').innerText = user.email;

        if (user.email.toLowerCase() === 'koteyca@gmail.com') {
            document.getElementById('tab-admin-btn').classList.remove('hidden');
            loadAdminData();
        } else {
            document.getElementById('tab-admin-btn').classList.add('hidden');
        }

        listenUserBalance(user.uid);
        checkUserRejections(user.uid);

        await runWelcomeFlow(user.uid);
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    }
});

async function runWelcomeFlow(uid) {
    const userRef = ref(db, `users/${uid}`);
    const snap = await get(userRef);
    const userData = snap.val() || {};
    const isFirstTime = !userData.hasLoggedInBefore;

    const modal1 = document.getElementById('welcome-modal-1');
    const btn1 = document.getElementById('welcome-1-btn');
    modal1.classList.remove('hidden');

    let timeLeft1 = 5;
    btn1.disabled = true;
    btn1.className = "w-full bg-gray-700 text-gray-400 font-semibold py-3 rounded-xl transition cursor-not-allowed";
    btn1.innerText = `Подождите (${timeLeft1} сек)`;

    const timer1 = setInterval(() => {
        timeLeft1--;
        if (timeLeft1 > 0) {
            btn1.innerText = `Подождите (${timeLeft1} сек)`;
        } else {
            clearInterval(timer1);
            btn1.disabled = false;
            btn1.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition";
            btn1.innerText = "ОК, согласен";
        }
    }, 1000);

    btn1.onclick = () => {
        modal1.classList.add('hidden');
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.remove('hidden');

        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            showWelcomeModal2(uid, isFirstTime);
        }, 1000);
    };
}

function showWelcomeModal2(uid, isFirstTime) {
    const modal2 = document.getElementById('welcome-modal-2');
    const btn2 = document.getElementById('welcome-2-btn');
    modal2.classList.remove('hidden');

    let timeLeft2 = isFirstTime ? 40 : 15;
    btn2.disabled = true;
    btn2.className = "w-full bg-gray-700 text-gray-400 font-bold py-3 rounded-xl transition cursor-not-allowed";
    btn2.innerText = `Ознакомьтесь с правилами (${timeLeft2} сек)`;

    const timer2 = setInterval(() => {
        timeLeft2--;
        if (timeLeft2 > 0) {
            btn2.innerText = `Ознакомьтесь с правилами (${timeLeft2} сек)`;
        } else {
            clearInterval(timer2);
            btn2.disabled = false;
            btn2.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition shadow-lg";
            btn2.innerText = "Я всё понял и подтверждаю честность";
        }
    }, 1000);

    btn2.onclick = async () => {
        modal2.classList.add('hidden');
        await update(ref(db, `users/${uid}`), { hasLoggedInBefore: true });
    };
}

function checkUserRejections(uid) {
    const withdrawalsRef = ref(db, 'withdrawals');
    get(withdrawalsRef).then((snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((childSnap) => {
                const req = childSnap.val();
                if (req.uid === uid && req.status === 'rejected' && !req.notified) {
                    showModal('Ваша заявка на вывод была отклонена администратором. Причина: обнаружено нарушение правил.', 'Заявка отклонена');
                    update(ref(db, `withdrawals/${childSnap.key}`), { notified: true });
                }
            });
        }
    });
}

function listenUserBalance(uid) {
    const balanceRef = ref(db, `users/${uid}/balance`);
    onValue(balanceRef, (snapshot) => {
        const balance = snapshot.val() || 0;
        document.getElementById('balance-display').innerText = balance.toFixed(2) + ' UAH';
    });
}

// Переключение основных вкладок сайта
window.switchTab = function(tabName) {
    ['main', 'withdraw', 'admin'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}-btn`).classList.remove('border-emerald-500', 'font-semibold');
        document.getElementById(`tab-${t}-btn`).classList.add('border-transparent', 'text-gray-400');
    });
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}-btn`).classList.add('border-emerald-500', 'font-semibold');
    document.getElementById(`tab-${tabName}-btn`).classList.remove('border-transparent', 'text-gray-400');
}

// Переключение подвкладок заданий на главной
window.switchTaskTab = function(subTab) {
    ['bots', 'tiktok', 'bugs'].forEach(t => {
        document.getElementById(`subtab-${t}`).classList.add('hidden');
        document.getElementById(`subtab-${t}-btn`).className = "flex-1 py-2 rounded-lg text-gray-400 hover:text-white transition text-center";
    });
    document.getElementById(`subtab-${subTab}`).classList.remove('hidden');
    
    let activeColor = "bg-emerald-600 text-white";
    if (subTab === 'tiktok') activeColor = "bg-purple-600 text-white";
    if (subTab === 'bugs') activeColor = "bg-blue-600 text-white";

    document.getElementById(`subtab-${subTab}-btn`).className = `flex-1 py-2 rounded-lg ${activeColor} transition text-center`;
}

// Логика модалки TikTok
window.openTikTokModal = function() {
    document.getElementById('tiktok-modal').classList.remove('hidden');
}

window.closeTikTokModal = function() {
    document.getElementById('tiktok-modal').classList.add('hidden');
}

window.submitTikTokTask = async function() {
    const tgUsername = document.getElementById('tiktok-username-input').value.trim();
    if (!tgUsername) {
        showModal('Введите ваш Telegram @username!', 'Ошибка');
        return;
    }

    await push(ref(db, 'tiktok_submissions'), {
        email: currentUser.email,
        uid: currentUser.uid,
        tgUsername: tgUsername,
        timestamp: Date.now(),
        status: 'pending'
    });

    closeTikTokModal();
    document.getElementById('tiktok-username-input').value = '';
    showModal('Задание принято! Теперь отправьте скриншоты в наш Telegram чат, и админ начислит вам 10 UAH после проверки.', 'Успешно');
}

// Логика отправки багов
document.getElementById('send-bug-btn').addEventListener('click', async () => {
    if (!currentUser) return;
    const bugType = document.getElementById('bug-type').value;
    const description = document.getElementById('bug-desc').value.trim();

    if (!description) {
        showModal('Опишите найденный баг или уязвимость!', 'Ошибка');
        return;
    }

    const reward = bugType === 'security' ? 10.00 : 5.00;

    await push(ref(db, 'bug_reports'), {
        email: currentUser.email,
        uid: currentUser.uid,
        type: bugType,
        reward: reward,
        description: description,
        timestamp: Date.now(),
        status: 'pending'
    });

    document.getElementById('bug-desc').value = '';
    showModal(`Отчет отправлен! Если админ подтвердит, вам на баланс капнет ${reward} UAH.`, 'Спасибо!');
});

document.querySelectorAll('input[name="withdraw-method"]').forEach((elem) => {
    elem.addEventListener('change', (e) => {
        const cardContainer = document.getElementById('card-input-container');
        if (e.target.value === 'card') {
            cardContainer.classList.remove('hidden');
        } else {
            cardContainer.classList.add('hidden');
        }
        document.querySelectorAll('input[name="withdraw-method"]').forEach(radio => {
            radio.closest('label').className = radio.checked 
                ? "flex items-center justify-center p-3 bg-gray-800 border border-emerald-500 rounded-lg cursor-pointer text-sm font-semibold"
                : "flex items-center justify-center p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer text-sm font-semibold";
        });
    });
});

const getTaskBtn = document.getElementById('get-task-btn');
const stepStartContainer = document.getElementById('step-start-container');
const stepVerifyContainer = document.getElementById('step-verify-container');
const confirmTaskBtn = document.getElementById('confirm-task-btn');
const verifyTimer = document.getElementById('verify-timer');
const noLinksContainer = document.getElementById('no-links-container');

let currentSelectedLink = '';

getTaskBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    const lastClickKey = `last_click_${currentUser.uid}`;
    const lastClickTime = parseInt(localStorage.getItem(lastClickKey) || '0');
    const now = Date.now();
    const cooldownTime = 30 * 1000;

    if (now - lastClickTime < cooldownTime) {
        const leftSec = Math.ceil((cooldownTime - (now - lastClickTime)) / 1000);
        showModal(`Подождите еще ${leftSec} сек. перед следующим заданием!`, 'Внимание');
        return;
    }

    const linksSnap = await get(ref(db, 'links'));
    if (!linksSnap.exists()) {
        showNoLinks();
        return;
    }

    const linksObj = linksSnap.val();
    const allLinks = Object.values(linksObj);

    const visitedKey = `visited_links_${currentUser.uid}`;
    let visitedLinks = JSON.parse(localStorage.getItem(visitedKey) || '[]');

    const availableLinks = allLinks.filter(l => !visitedLinks.includes(l));

    if (availableLinks.length === 0) {
        showNoLinks();
        return;
    }

    currentSelectedLink = availableLinks[Math.floor(Math.random() * availableLinks.length)];

    visitedLinks.push(currentSelectedLink);
    localStorage.setItem(visitedKey, JSON.stringify(visitedLinks));

    window.open(currentSelectedLink, '_blank');

    stepStartContainer.classList.add('hidden');
    stepVerifyContainer.classList.remove('hidden');

    startVerificationTimer(currentUser.uid, lastClickKey);
});

function startVerificationTimer(uid, lastClickKey) {
    let timeLeft = 10;
    verifyTimer.innerText = timeLeft;
    confirmTaskBtn.disabled = true;
    confirmTaskBtn.className = "w-full bg-gray-700 text-gray-400 font-bold py-3 rounded-xl transition cursor-not-allowed";
    confirmTaskBtn.innerText = "Ожидание проверки...";

    const interval = setInterval(() => {
        timeLeft--;
        verifyTimer.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval);
            verifyTimer.innerText = "Готово!";
            confirmTaskBtn.disabled = false;
            confirmTaskBtn.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition shadow-lg";
            confirmTaskBtn.innerText = "Подтвердить и получить +1 UAH";
        }
    }, 1000);

    confirmTaskBtn.onclick = async () => {
        localStorage.setItem(lastClickKey, Date.now().toString());

        const userBalanceRef = ref(db, `users/${uid}/balance`);
        const currentBalSnap = await get(userBalanceRef);
        const currentBalance = currentBalSnap.val() || 0;
        await set(userBalanceRef, currentBalance + 1.00);

        stepVerifyContainer.classList.add('hidden');
        stepStartContainer.classList.remove('hidden');
        showModal('Задание успешно выполнено! +1 UAH зачислено на баланс.', 'Успешно');
    };
}

function showNoLinks() {
    stepStartContainer.classList.add('hidden');
    noLinksContainer.classList.remove('hidden');
}

document.getElementById('request-links-btn').addEventListener('click', async () => {
    if (!currentUser) return;
    await push(ref(db, 'link_requests'), {
        email: currentUser.email,
        uid: currentUser.uid,
        timestamp: Date.now()
    });
    showModal('Запрос на новые ссылки успешно отправлен администратору!', 'Отправлено');
});

document.getElementById('withdraw-btn').addEventListener('click', async () => {
    if (!currentUser) return;
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.querySelector('input[name="withdraw-method"]:checked').value;
    const cardNumber = document.getElementById('withdraw-card').value.trim();
    const termsAgreed = document.getElementById('terms-checkbox').checked;

    if (!amount || amount <= 0) {
        showModal('Введите корректную сумму для вывода!', 'Ошибка');
        return;
    }
    if (method === 'card' && !cardNumber) {
        showModal('Введите номер банковской карты!', 'Ошибка');
        return;
    }
    if (!termsAgreed) {
        showModal('Необходимо согласиться с условиями соглашения!', 'Внимание');
        return;
    }

    const userBalRef = ref(db, `users/${currentUser.uid}/balance`);
    const balSnap = await get(userBalRef);
    const currentBalance = balSnap.val() || 0;

    if (amount > currentBalance) {
        showModal('Недостаточно средств на балансе!', 'Ошибка');
        return;
    }

    await set(userBalRef, currentBalance - amount);
    await push(ref(db, 'withdrawals'), {
        email: currentUser.email,
        uid: currentUser.uid,
        amount: amount,
        method: method,
        cardNumber: method === 'card' ? cardNumber : 'Наличные',
        timestamp: Date.now(),
        status: 'pending'
    });

    showModal('Заявка на вывод успешно отправлена!', 'Успех');
    document.getElementById('withdraw-amount').value = '';
    document.getElementById('withdraw-card').value = '';
    document.getElementById('terms-checkbox').checked = false;
});

document.getElementById('add-link-btn').addEventListener('click', async () => {
    const newLink = document.getElementById('new-link-input').value.trim();
    if (!newLink) {
        showModal('Введите ссылку!', 'Ошибка');
        return;
    }
    await push(ref(db, 'links'), newLink);
    document.getElementById('new-link-input').value = '';
    showModal('Ссылка успешно добавлена в общую базу!', 'Успешно');
});

function loadAdminData() {
    onValue(ref(db, 'link_requests'), (snapshot) => {
        const container = document.getElementById('admin-link-requests');
        container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="text-gray-500">Нет запросов</p>';
            return;
        }
        snapshot.forEach((childSnap) => {
            const req = childSnap.val();
            const key = childSnap.key;
            const date = new Date(req.timestamp).toLocaleString();
            
            const div = document.createElement('div');
            div.className = "bg-gray-700 p-2 rounded flex justify-between items-center text-xs";
            div.innerHTML = `<span>${req.email} (${date})</span>`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = "bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30";
            deleteBtn.innerText = "Удалить";
            deleteBtn.onclick = async () => {
                await remove(ref(db, `link_requests/${key}`));
            };
            
            div.appendChild(deleteBtn);
            container.appendChild(div);
        });
    });

    onValue(ref(db, 'withdrawals'), (snapshot) => {
        const container = document.getElementById('admin-withdrawals');
        container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="text-gray-500">Нет заявок на вывод</p>';
            return;
        }
        snapshot.forEach((childSnap) => {
            const req = childSnap.val();
            const key = childSnap.key;
            const date = new Date(req.timestamp).toLocaleString();
            
            const div = document.createElement('div');
            div.className = "bg-gray-700 p-3 rounded space-y-2 text-xs";
            
            let statusBadge = '';
            if (req.status === 'pending') statusBadge = '<span class="text-yellow-400">[Ожидает]</span>';
            else if (req.status === 'approved') statusBadge = '<span class="text-emerald-400">[Одобрено]</span>';
            else if (req.status === 'rejected') statusBadge = '<span class="text-red-400">[Отклонено]</span>';

            div.innerHTML = `
                <div><b>${req.amount} UAH</b> (${req.method === 'card' ? 'Карта: ' + req.cardNumber : 'Наличными'}) от ${req.email} ${statusBadge}</div>
                <div class="text-gray-400 text-[10px]">${date}</div>
            `;

            if (req.status === 'pending') {
                const btnContainer = document.createElement('div');
                btnContainer.className = "flex space-x-2 mt-1";

                const approveBtn = document.createElement('button');
                approveBtn.className = "flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1 rounded font-semibold";
                approveBtn.innerText = "Одобрить";
                approveBtn.onclick = async () => {
                    await update(ref(db, `withdrawals/${key}`), { status: 'approved' });
                };

                const rejectBtn = document.createElement('button');
                rejectBtn.className = "flex-1 bg-red-600 hover:bg-red-700 text-white py-1 rounded font-semibold";
                rejectBtn.innerText = "Отклонить";
                rejectBtn.onclick = async () => {
                    const userBalRef = ref(db, `users/${req.uid}/balance`);
                    const balSnap = await get(userBalRef);
                    const currentBal = balSnap.val() || 0;
                    await set(userBalRef, currentBal + req.amount);

                    await update(ref(db, `withdrawals/${key}`), { status: 'rejected', notified: false });
                };

                btnContainer.appendChild(approveBtn);
                btnContainer.appendChild(rejectBtn);
                div.appendChild(btnContainer);
            } else {
                const removeBtn = document.createElement('button');
                removeBtn.className = "w-full bg-gray-600 hover:bg-gray-500 text-white py-1 rounded mt-1";
                removeBtn.innerText = "Удалить из истории";
                removeBtn.onclick = async () => {
                    await remove(ref(db, `withdrawals/${key}`));
                };
                div.appendChild(removeBtn);
            }

            container.appendChild(div);
        });
    });
}
