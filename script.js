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
    eventActive: false
};
playerId: '_' + Math.random().toString(36).substr(2, 9),
    playerName: "Jogador Anônimo"
};

let game = JSON.parse(JSON.stringify(defaultGame));
let fps = 30;
let saveInterval;
let game = JSON.parse(JSON.stringify(defaultGame));
let fps = 30;
let saveInterval;

// Variáveis de Balanço
const baseClickCost = 10;
const baseAutoCost = 50;
const petCost = 1000;
const prestigeCost = 1000000;

// Efeitos Sonoros (Placeholder - substitua os caminhos pelos seus arquivos .mp3)
const soundClick = new Audio(''); 
const soundBuy = new Audio('');

// --- Inicialização ---
function init() {
    loadGame();
    calculateOfflineProgress();
    updateUI();
    
    // Game Loop (Roda 30x por segundo para animações e eventos)
    setInterval(gameLoop, 1000 / fps);
    // Auto Save (A cada 10s)
    saveInterval = setInterval(saveGame, 10000);
    // Loop de Eventos Aleatórios (Checa a cada 1 min)
    setInterval(triggerRandomEvent, 60000);
    // Baú Aleatório (Checa a cada 3 min)
    setInterval(spawnChest, 180000);
}

// --- Mecânica Principal ---
document.getElementById('mainObject').addEventListener('pointerdown', (e) => {
    // Cálculo do ganho
    let multiplier = getGlobalMultiplier();
    if(game.eventActive) multiplier *= 2; // Dobro no evento
    
    let gain = game.clickPower * multiplier;
    game.coins += gain;
    game.totalCoins += gain;
    
    // Sistema de XP e Níveis
    game.xp += 1;
    checkLevelUp();
    
    // Missão Diária
    game.clicksToday++;
    checkMissions();

    // Efeitos Visuais e Sonoros
    createFloatingText(e.clientX, e.clientY, `+${formatNumber(gain)}`);
    if(soundClick.src) { soundClick.currentTime = 0; soundClick.play().catch(e=>{}); }
    
    updateUI();
});

// Loop Automático de Moedas
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
    let petMult = 1 + (game.petCount * 0.10); // +10% por pet
    let prestigeMult = 1 + (game.prestigePoints * 0.50); // +50% por ponto de prestígio
    return petMult * prestigeMult;
}

// --- Lógica de Compra e Upgrades ---
function getCost(base, level, factor = 1.15) {
    return Math.floor(base * Math.pow(factor, level));
}

function buyClickUpgrade() {
    let cost = getCost(baseClickCost, game.clickUpLvl);
    if (game.coins >= cost) {
        game.coins -= cost;
        game.clickUpLvl++;
        game.clickPower = 1 + (game.clickUpLvl * 2); // Fórmula de poder de clique
        if(soundBuy.src) soundBuy.play().catch(e=>{});
        updateUI();
    }
}

function buyAutoGenerator() {
    let cost = getCost(baseAutoCost, game.autoGenCount);
    if (game.coins >= cost) {
        game.coins -= cost;
        game.autoGenCount++;
        game.autoPower = game.autoGenCount * 1; // Fórmula de poder automático
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
        // Recompensa de nível
        game.coins += game.level * 50; 
    }
}

function checkMissions() {
    document.getElementById('missionProgress').innerText = game.clicksToday;
    let btn = document.getElementById('claimMissionBtn');
    if (game.clicksToday >= 100) {
        btn.disabled = false;
    }
}

function claimMission() {
    if (game.clicksToday >= 100) {
        game.coins += 500 * game.level;
        game.clicksToday = 0; // Reseta para simplificar (ideal seria salvar por dia)
        document.getElementById('claimMissionBtn').disabled = true;
        updateUI();
    }
}

function doPrestige() {
    if (game.coins >= prestigeCost) {
        if(confirm("Tem certeza? Você perderá moedas e upgrades, mas ganhará um multiplicador permanente!")) {
            let ptsToGain = Math.floor(Math.cbrt(game.totalCoins / prestigeCost)); // Escalonamento cúbico
            let savedPrestige = game.prestigePoints + ptsToGain;
            
            // Reset do jogo
            game = JSON.parse(JSON.stringify(defaultGame));
            game.prestigePoints = savedPrestige;
            
            saveGame();
            updateUI();
            alert(`Prestígio realizado! Você ganhou ${ptsToGain} pontos de prestígio.`);
        }
    }
}

// --- Eventos e Baús ---
function triggerRandomEvent() {
    if(Math.random() < 0.3 && !game.eventActive) { // 30% de chance
        game.eventActive = true;
        document.getElementById('eventDisplay').classList.remove('hidden');
        setTimeout(() => {
            game.eventActive = false;
            document.getElementById('eventDisplay').classList.add('hidden');
        }, 30000); // Dura 30 segundos
    }
}

function spawnChest() {
    if(Math.random() < 0.5) { // 50% de chance
        document.getElementById('chestBtn').classList.remove('hidden');
    }
}

function openChest() {
    let reward = game.autoPower * 60 > 100 ? game.autoPower * 60 : 100; // 1 minuto de auto ou 100
    game.coins += reward;
    document.getElementById('chestBtn').classList.add('hidden');
    createFloatingText(window.innerWidth/2, window.innerHeight/2, `+${formatNumber(reward)} do Baú!`);
    updateUI();
}

// --- Sistema Offline e Saves ---
function calculateOfflineProgress() {
    let now = Date.now();
    let diffInSeconds = (now - game.lastSaveTime) / 1000;
    
    if (diffInSeconds > 60 && game.autoPower > 0) { // Se ficou mais de 1 min fora
        let offlineEarnings = diffInSeconds * (game.autoPower * getGlobalMultiplier());
        offlineEarnings = offlineEarnings * 0.5; // Ganha 50% do total quando offline
        
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
        // Merge do save com o defaultGame (previne erros se adicionar novas variáveis)
        game = { ...defaultGame, ...parsed };
    }
}

function resetGame() {
    if(confirm("Isso apagará TODO o seu progresso, incluindo prestígio. Continuar?")) {
        localStorage.removeItem('idleClickerSave');
        game = JSON.parse(JSON.stringify(defaultGame));
        updateUI();
    }
}

// --- Utilitários e UI ---
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

    // Atualiza Custos e Textos
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
    // Pequeno deslocamento aleatório
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
    event.target.classList.add('active');
}

function closeModal() {
    document.getElementById('offlineModal').classList.add('hidden');
}

// Iniciar o jogo
window.onload = init;
// --- SISTEMA DE RANK MUNDIAL (FIREBASE) ---

// Carrega os scripts do Firebase dinamicamente
const fbApp = document.createElement('script');
fbApp.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
const fbDb = document.createElement('script');
fbDb.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js";
document.head.appendChild(fbApp);
document.head.appendChild(fbDb);

fbDb.onload = function() {
    // ⚠️ CONFIGURAÇÃO DO FIREBASE
    // Você precisa criar uma conta gratuita no Firebase Console, gerar um projeto web e colar suas chaves aqui:
    const firebaseConfig = {
        apiKey: "AIzaSyAs1hbX0vrpCqm01MlnmaVq0mqwLSUFAeQ",
        authDomain: "idle-game-clicker.firebaseapp.com",
        databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
        projectId: "idle-game-clicker",
        storageBucket: "idle-game-clicker.firebasestorage.app",
        messagingSenderId: "819281089897",
        appId: "1:819281089897:web:4e41bff30d5766fd76d9f8"
    };
    
    // Inicializa o Firebase apenas se as chaves forem preenchidas
    if(firebaseConfig.apiKey !== "SUA_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        
        // Envia a pontuação inicial e configura os loops de 5 minutos
        enviarPontuacao();
        atualizarPlacar();
        
        setInterval(enviarPontuacao, 300000); // Envia os dados do jogador a cada 5 min
        setInterval(atualizarPlacar, 300000);  // Puxa o rank mundial a cada 5 min
    }
};

// Salva o apelido que o jogador digitou
function saveNickname() {
    let input = document.getElementById('playerNameInput');
    if(input.value.trim() !== "") {
        game.playerName = input.value.trim();
        saveGame();
        enviarPontuacao();
        alert("Apelido salvo com sucesso!");
    }
}

// Envia os dados do jogador atual para o servidor
function enviarPontuacao() {
    if(typeof firebase === "undefined" || !firebase.apps.length) return;
    
    firebase.database().ref('leaderboard/' + game.playerId).set({
        name: game.playerName,
        score: Math.floor(game.totalCoins), // Usamos totalCoins para evitar trapaças de quem gasta tudo
        lastUpdate: Date.now()
    });
}

// Puxa o Top 10 do servidor e desenha na tela
function atualizarPlacar() {
    if(typeof firebase === "undefined" || !firebase.apps.length) return;
    
    const leaderboardRef = firebase.database().ref('leaderboard');
    // Ordena por pontuação e pega os 10 maiores
    leaderboardRef.orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        const rowsContainer = document.getElementById('leaderboardRows');
        rowsContainer.innerHTML = "";
        
        let jogadores = [];
        snapshot.forEach((childSnapshot) => {
            jogadores.push(childSnapshot.val());
        });
        
        // O Firebase envia do menor para o maior, então invertemos a lista
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

