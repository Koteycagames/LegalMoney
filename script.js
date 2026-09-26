import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, ref, set, get, update, push, child, onValue 
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

// Функция показа красивой модалки вместо alert
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
                balance: 0.00
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
onAuthStateChanged(auth, (user) => {
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
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    }
});

function listenUserBalance(uid) {
    const balanceRef = ref(db, `users/${uid}/balance`);
    onValue(balanceRef, (snapshot) => {
        const balance = snapshot.val() || 0;
        document.getElementById('balance-display').innerText = balance.toFixed(2) + ' UAH';
    });
}

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

// Логика двухэтапного выполнения с таймером 10 секунд
const getTaskBtn = document.getElementById('get-task-btn');
const stepStartContainer = document.getElementById('step-start-container');
const stepVerifyContainer = document.getElementById('step-verify-container');
const confirmTaskBtn = document.getElementById('confirm-task-btn');
const verifyTimer = document.getElementById('verify-timer');
const noLinksContainer = document.getElementById('no-links-container');

let currentSelectedLink = '';

getTaskBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    // Кулдаун 30 секунд между заданиями
    const lastClickKey = `last_click_${currentUser.uid}`;
    const lastClickTime = parseInt(localStorage.getItem(lastClickKey) || '0');
    const now = Date.now();
    const cooldownTime = 30 * 1000;

    if (now - lastClickTime < cooldownTime) {
        const leftSec = Math.ceil((cooldownTime - (now - lastClickTime)) / 1000);
        showModal(`Подождите еще ${leftSec} сек. перед следующим заданием!`, 'Внимание');
        return;
    }

    // Получаем ссылки из базы
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

    // Выбираем случайную ссылку
    currentSelectedLink = availableLinks[Math.floor(Math.random() * availableLinks.length)];

    // Открываем бота в Telegram
    window.open(currentSelectedLink, '_blank');

    // Переключаем интерфейс на экран проверки с таймером
    stepStartContainer.classList.add('hidden');
    stepVerifyContainer.classList.remove('hidden');

    // Запускаем таймер проверки на 10 секунд
    startVerificationTimer(currentUser.uid, visitedKey, lastClickKey);
});

function startVerificationTimer(uid, visitedKey, lastClickKey) {
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
        let visitedLinks = JSON.parse(localStorage.getItem(visitedKey) || '[]');
        visitedLinks.push(currentSelectedLink);
        localStorage.setItem(visitedKey, JSON.stringify(visitedLinks));
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
    const termsAgreed = document.getElementById('terms-checkbox').checked;

    if (!amount || amount <= 0) {
        showModal('Введите корректную сумму для вывода!', 'Ошибка');
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
        timestamp: Date.now(),
        status: 'pending'
    });

    showModal('Заявка на вывод успешно отправлена!', 'Успех');
    document.getElementById('withdraw-amount').value = '';
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
            const date = new Date(req.timestamp).toLocaleString();
            container.innerHTML += `<div class="bg-gray-700 p-2 rounded">${req.email} запросил ссылки (${date})</div>`;
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
            const date = new Date(req.timestamp).toLocaleString();
            container.innerHTML += `<div class="bg-gray-700 p-2 rounded"><b>${req.amount} UAH</b> от ${req.email} (${date})</div>`;
        });
    });
}
