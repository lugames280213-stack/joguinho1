// --- Estado do Jogo (Game Data) ---
const defaultGame = {
    coins: 0,
    totalCoins: 0,
    level: 1,
    xp: 0,
    clickPower: 1,
    clickUpLvl: 0,
    autoPower: 0,
    autoGenCount: 0,
    petCount: 0,
    prestigePoints: 0,
    clicksToday: 0,
    lastSaveTime: Date.now(),
    eventActive: false,
    playerId: '_' + Math.random().toString(36).substr(2, 9),
    playerName: "Jogador Anônimo"
};

let game = JSON.parse(JSON.stringify(defaultGame));
let fps = 30;
let saveInterval;

// Variáveis de Balanço
const baseClickCost = 10;
const baseAutoCost = 50;
const petCost = 1000;
const prestigeCost = 1000000;

// Efeitos Sonoros (Opcional)
const soundClick = new Audio(''); 
const soundBuy = new Audio('');

// --- Inicialização ---
function init() {
    loadGame();
    calculateOfflineProgress();
    updateUI();
    
    // Game Loop
    setInterval(gameLoop, 1000 / fps);
    // Auto Save (10s)
    saveInterval = setInterval(saveGame, 10000);
    // Eventos Aleatórios (1 min)
    setInterval(triggerRandomEvent, 60000);
    // Baú Aleatório (3 min)
    setInterval(spawnChest, 180000);
}

// --- Mecânica Principal ---
document.getElementById('mainObject').addEventListener('pointerdown', (e) => {
    let multiplier = getGlobalMultiplier();
    if(game.eventActive) multiplier *= 2;
    
    let gain = game.clickPower * multiplier;
    game.coins += gain;
    game.totalCoins += gain;
    
    game.xp += 1;
    checkLevelUp();
    
    game.clicksToday++;
    checkMissions();

    createFloatingText(e.clientX, e.clientY, `+${formatNumber(gain)}`);
    if(soundClick.src) { soundClick.currentTime = 0; soundClick.play().catch(e=>{}); }
    
    updateUI();
});

function gameLoop() {
    if (game.autoPower > 0) {
        let multiplier = getGlobalMultiplier();
        if(game.eventActive) multiplier *= 2;
        
        let gainPerTick = (game.autoPower * multiplier) / fps;
        game.coins += gainPerTick;
        game.totalCoins += gainPerTick;
        updateUI();
    }
}

function getGlobalMultiplier() {
    let petMult = 1 + (game.petCount * 0.10);
    let prestigeMult = 1 + (game.prestigePoints * 0.50);
    return petMult * prestigeMult;
}

// --- Loja e Upgrades ---
function getCost(base, level, factor = 1.15) {
    return Math.floor(base * Math.pow(factor, level));
}

function buyClickUpgrade() {
    let cost = getCost(baseClickCost, game.clickUpLvl);
    if (game.coins >= cost) {
        game.coins -= cost;
        game.clickUpLvl++;
        game.clickPower = 1 + (game.clickUpLvl * 2);
        if(soundBuy.src) soundBuy.play().catch(e=>{});
        updateUI();
    }
}

function buyAutoGenerator() {
    let cost = getCost(baseAutoCost, game.autoGenCount);
    if (game.coins >= cost) {
        game.coins -= cost;
        game.autoGenCount++;
        game.autoPower = game.autoGenCount * 1;
        if(soundBuy.src) soundBuy.play().catch(e=>{});
        updateUI();
    }
}

function buyPet() {
    if (game.coins >= petCost) {
        game.coins -= petCost;
        game.petCount++;
        if(soundBuy.src) soundBuy.play().catch(e=>{});
        updateUI();
    }
}

// --- Sistemas Secundários ---
function checkLevelUp() {
    let xpNeeded = game.level * 100;
    if (game.xp >= xpNeeded) {
        game.xp -= xpNeeded;
        game.level++;
        game.coins += game.level * 50; 
    }
}

function checkMissions() {
    const progressEl = document.getElementById('missionProgress');
    if(progressEl) progressEl.innerText = game.clicksToday;
    let btn = document.getElementById('claimMissionBtn');
    if (btn && game.clicksToday >= 100) {
        btn.disabled = false;
    }
}

function claimMission() {
    if (game.clicksToday >= 100) {
        game.coins += 500 * game.level;
        game.clicksToday = 0;
        document.getElementById('claimMissionBtn').disabled = true;
        updateUI();
    }
}

function doPrestige() {
    if (game.coins >= prestigeCost) {
        if(confirm("Tem certeza? Você perderá moedas e upgrades, mas ganhará um bônus permanente!")) {
            let ptsToGain = Math.floor(Math.cbrt(game.totalCoins / prestigeCost));
            let savedPrestige = game.prestigePoints + ptsToGain;
            
            game = JSON.parse(JSON.stringify(defaultGame));
            game.prestigePoints = savedPrestige;
            
            saveGame();
            updateUI();
            alert(`Prestígio realizado! Ganhou ${ptsToGain} pontos.`);
        }
    }
}

// --- Eventos e Baús ---
function triggerRandomEvent() {
    if(Math.random() < 0.3 && !game.eventActive) {
        game.eventActive = true;
        document.getElementById('eventDisplay').classList.remove('hidden');
        setTimeout(() => {
            game.eventActive = false;
            document.getElementById('eventDisplay').classList.add('hidden');
        }, 30000);
    }
}

function spawnChest() {
    if(Math.random() < 0.5) {
        document.getElementById('chestBtn').classList.remove('hidden');
    }
}

function openChest() {
    let reward = game.autoPower * 60 > 100 ? game.autoPower * 60 : 100;
    game.coins += reward;
    document.getElementById('chestBtn').classList.add('hidden');
    createFloatingText(window.innerWidth/2, window.innerHeight/2, `+${formatNumber(reward)} do Baú!`);
    updateUI();
}

// --- Sistema Offline e Saves ---
function calculateOfflineProgress() {
    let now = Date.now();
    let diffInSeconds = (now - game.lastSaveTime) / 1000;
    
    if (diffInSeconds > 60 && game.autoPower > 0) {
        let offlineEarnings = diffInSeconds * (game.autoPower * getGlobalMultiplier()) * 0.5;
        game.coins += offlineEarnings;
        game.totalCoins += offlineEarnings;
        
        document.getElementById('offlineEarnings').innerText = `${formatNumber(offlineEarnings)} Moedas`;
        document.getElementById('offlineModal').classList.remove('hidden');
    }
    game.lastSaveTime = now;
}

function saveGame() {
    game.lastSaveTime = Date.now();
    localStorage.setItem('idleClickerSave', JSON.stringify(game));
}

function loadGame() {
    let saved = localStorage.getItem('idleClickerSave');
    if (saved) {
        let parsed = JSON.parse(saved);
        game = { ...defaultGame, ...parsed };
    }
}

function resetGame() {
    if(confirm("Isso apagará TODO o seu progresso. Continuar?")) {
        localStorage.removeItem('idleClickerSave');
        game = JSON.parse(JSON.stringify(defaultGame));
        updateUI();
    }
}

// --- Interface e Abas ---
function updateUI() {
    document.getElementById('coinCount').innerText = formatNumber(Math.floor(game.coins));
    
    let totalCps = game.autoPower * getGlobalMultiplier();
    if(game.eventActive) totalCps *= 2;
    document.getElementById('cps').innerText = formatNumber(totalCps.toFixed(1));
    
    document.getElementById('level').innerText = game.level;
    document.getElementById('xp').innerText = game.xp;
    let xpNeeded = game.level * 100;
    document.getElementById('xpNeeded').innerText = xpNeeded;
    document.getElementById('xp-bar').style.width = `${(game.xp / xpNeeded) * 100}%`;

    document.getElementById('clickUpLvl').innerText = game.clickUpLvl;
    document.getElementById('autoGenCount').innerText = game.autoGenCount;
    
    let clickCost = getCost(baseClickCost, game.clickUpLvl);
    let autoCost = getCost(baseAutoCost, game.autoGenCount);
    
    document.getElementById('clickUpCost').innerText = `Custa: ${formatNumber(clickCost)}`;
    document.getElementById('clickUpCost').disabled = game.coins < clickCost;
    
    document.getElementById('autoGenCost').innerText = `Custa: ${formatNumber(autoCost)}`;
    document.getElementById('autoGenCost').disabled = game.coins < autoCost;

    document.getElementById('petMultiplier').innerText = (1 + (game.petCount * 0.10)).toFixed(2);
    document.getElementById('petCost').disabled = game.coins < petCost;

    document.getElementById('prestigeBonus').innerText = game.prestigePoints * 50;
    document.getElementById('prestigeBtn').disabled = game.coins < prestigeCost;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(2) + "k";
    return num.toString();
}

function createFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    let offsetX = (Math.random() - 0.5) * 40;
    el.style.left = `${x + offsetX}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 1000);
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    
    // Encontra o botão clicado para ativar a classe visual
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if(btn) btn.classList.add('active');
}

function closeModal() {
    document.getElementById('offlineModal').classList.add('hidden');
}

// --- CONEXÃO RANK MUNDIAL (FIREBASE) ---// --- CONEXÃO RANK MUNDIAL (FIREBASE) ---

window.addEventListener('DOMContentLoaded', () => {
    // ⚠️ SUBSTITUA COM SUAS CHAVES REAIS DO FIREBASE AQUI:
    const firebaseConfig = {
        apiKey: "AIzaSyAs1hbX0vrpCqm01MlnmaVq0mqwLSUFAeQ",
        authDomain: "idle-game-clicker.firebaseapp.com",
        databaseURL: "https://idle-game-clicker-default-rtdb.firebaseio.com",
        projectId: "idle-game-clicker",
        storageBucket: "idle-game-clicker.firebasestorage.app",
        messagingSenderId: "819281089897",
        appId: "1:819281089897:web:4e41bff30d5766fd76d9f8"
    };
    
    if (typeof firebase !== "undefined") {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        atualizarPlacar();
        
        setInterval(enviarPontuacao, 300000); 
        setInterval(atualizarPlacar, 300000);  
    }
});

function saveNickname() {
    let input = document.getElementById('playerNameInput');
    if (input && input.value.trim() !== "") {
        game.playerName = input.value.trim();
        saveGame();
        enviarPontuacao();
        alert("Apelido salvo com sucesso!");
    }
}

function enviarPontuacao() {
    if (typeof firebase === "undefined" || !firebase.apps.length) return;
    
    firebase.database().ref('leaderboard/' + game.playerId).set({
        name: game.playerName,
        score: Math.floor(game.totalCoins),
        lastUpdate: Date.now()
    }).then(() => {
        atualizarPlacar();
    }).catch((error) => {
        console.error("Erro ao enviar pontuação: ", error);
    });
}

function atualizarPlacar() {
    if (typeof firebase === "undefined" || !firebase.apps.length) return;
    
    const leaderboardRef = firebase.database().ref('leaderboard');
    leaderboardRef.orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        const rowsContainer = document.getElementById('leaderboardRows');
        if (!rowsContainer) return;
        rowsContainer.innerHTML = "";
        
        let jogadores = [];
        snapshot.forEach((childSnapshot) => { jogadores.push(childSnapshot.val()); });
        jogadores.reverse();
        
        jogadores.forEach((jogador, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #444";
            tr.innerHTML = `
                <td style="padding: 8px; font-weight: bold; color: ${index === 0 ? 'var(--gold)' : 'white'}">#${index + 1}</td>
                <td>${jogador.name}</td>
                <td style="color: var(--gold)">${formatNumber(jogador.score)}</td>
            `;
            rowsContainer.appendChild(tr);
        });
    });
}

window.onload = init;
