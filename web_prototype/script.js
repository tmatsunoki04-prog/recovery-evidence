/**
 * メンタル回復ウォッチャー - Recovery Evidence Core Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // UI Containers
    const inputView = document.getElementById('input-view');
    const feedbackView = document.getElementById('feedback-view');
    const historyView = document.getElementById('history-view');
    
    // Controls
    const journalInput = document.getElementById('journal-input');
    const submitBtn = document.getElementById('submit-btn');
    const navHome = document.getElementById('nav-home');
    const navAdd = document.getElementById('nav-add');
    const navHistory = document.getElementById('nav-history');

    // Feedback Elements
    const empathyEl = document.getElementById('fb-empathy');
    const organizedEl = document.getElementById('fb-organized-list');
    const strengthEl = document.getElementById('fb-strength-list');
    const comparisonTextEl = document.getElementById('fb-comparison-text');
    const closingTextEl = document.getElementById('fb-closing-text');

    // History Elements
    const historySummary = document.getElementById('history-summary-text');
    const recentLogsList = document.getElementById('recent-logs-list');
    const ctx = document.getElementById('waveChart').getContext('2d');
    let chartInstance = null;

    const STORAGE_KEY = 'recoveryEvidenceLogs';

    /**
     * Data Logic
     */
    function loadRecords() {
        let logs = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!logs) {
            const oldLogs = JSON.parse(localStorage.getItem('mental_app_records'));
            if (oldLogs && Array.isArray(oldLogs)) {
                logs = oldLogs.map(r => ({
                    id: (r.id || Date.now()).toString(),
                    text: r.text || "",
                    createdAt: new Date(r.timestamp || Date.now()).toISOString(),
                    crisisFlag: r.crisisFlag || false,
                    tags: {
                        shindoi: (r.extractedTags || []).includes('しんどさ') ? 1 : 0,
                        guruguru: (r.extractedTags || []).includes('ぐるぐる') ? 1 : 0,
                        dekita: (r.extractedTags || []).includes('動けたこと') ? 1 : 0
                    },
                    recovery: {
                        life_actions: 0,
                        interpersonal: 0,
                        easier_thinking: 0,
                        future_contact: 0,
                        self_determination: 0
                    }
                }));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
            } else { logs = []; }
        }
        return logs;
    }

    let records = loadRecords();

    // Vocabulary
    const crisisWords = ['死にたい', '消えたい', 'いなくなりたい', 'もう無理', 'もうむり', '限界', '終わりにしたい', '消えたいです', 'つかれた', '生きていたくない', 'しにたい'];
    
    // Standard Tags
    const shindoiVocab = ['しんどい', 'だるい', '動けない', 'つらい', '疲れた', 'つかれた', '重い', '何もできない'];
    const guruguruVocab = ['ぐるぐる', '不安', '焦り', '落ち着かない', '考えすぎ', '頭が回る', '頭がうるさい', 'ごちゃごちゃ'];
    const dekitaVocab = ['動けた', '出られた', '少しできた', 'やれた', '起きられた', 'できた', '行けた', '食べられた'];

    // Recovery Categories Dictionary
    const recoveryDict = {
        life_actions: ['風呂', '歯磨き', '食べた', '洗濯', '片付け', '外に出た', '散歩', '買い物', '掃除'],
        interpersonal: ['返信', '会話', '話した', '挨拶', '電話', '会った', '連絡'],
        easier_thinking: ['ぐるぐるが減った', '別のこと', '集中できた', '忘れられた', '落ち着いた', '考えすぎなかった'],
        future_contact: ['明日', '来週', '予定', '予約', '準備', '計画', '来月'],
        self_determination: ['決めた', '断った', '頼った', '薬', 'やめると決めた', '休む']
    };

    function detectRecovery(text) {
        const result = {};
        for (const [key, words] of Object.entries(recoveryDict)) {
            result[key] = words.some(w => text.includes(w)) ? 1 : 0;
        }
        return result;
    }

    function extractStats(text) {
        return {
            shindoi: shindoiVocab.some(w => text.includes(w)) ? 1 : 0,
            guruguru: guruguruVocab.some(w => text.includes(w)) ? 1 : 0,
            dekita: dekitaVocab.some(w => text.includes(w)) ? 1 : 0
        };
    }

    // --- Interaction & Navigation ---

    function goToView(target, title, navActiveId) {
        document.getElementById('view-title').textContent = title;
        [inputView, feedbackView, historyView].forEach(v => v.classList.remove('active', 'hidden'));
        [inputView, feedbackView, historyView].forEach(v => { if(v !== target) v.classList.add('hidden'); });
        
        target.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if(navActiveId) document.getElementById(navActiveId).classList.add('active');
        
        window.scrollTo(0, 0);
    }

    navHome.addEventListener('click', () => goToView(inputView, '今の波', 'nav-home'));
    navAdd.addEventListener('click', () => goToView(inputView, '今の波', 'nav-home'));
    navHistory.addEventListener('click', () => {
        goToView(historyView, 'これまでの波', 'nav-history');
        renderHistory();
    });

    // Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const val = journalInput.value.trim();
            journalInput.value = val ? val + '、' + chip.dataset.text : chip.dataset.text;
            journalInput.dispatchEvent(new Event('input'));
        });
    });

    journalInput.addEventListener('input', () => {
        submitBtn.disabled = journalInput.value.trim().length === 0;
    });

    submitBtn.addEventListener('click', () => {
        const text = journalInput.value;
        const record = {
            id: Date.now().toString(),
            text: text,
            createdAt: new Date().toISOString(),
            crisisFlag: crisisWords.some(w => text.includes(w)),
            tags: extractStats(text),
            recovery: detectRecovery(text)
        };
        
        records.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        submitBtn.textContent = '翻訳中...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            renderFeedback(record);
            goToView(feedbackView, '今日の返し', null);
            submitBtn.textContent = '吐き出す →';
            submitBtn.disabled = false;
            journalInput.value = '';
        }, 800);
    });

    function renderFeedback(current) {
        // --- A. 今日の受け止め ---
        const s = current.tags.shindoi;
        const g = current.tags.guruguru;
        const d = current.tags.dekita;
        let empathy = '今日は重さのある日ですね';
        if (s && g) empathy = '今日はしんどさと、頭のぐるぐるが重なっていそうです';
        else if (s) empathy = '今日はしんどさが強い日ですね';
        else if (g) empathy = '今日は頭のぐるぐるが強い日ですね';
        else if (d) empathy = '今日は少し動けた部分もあったのですね';
        empathyEl.innerHTML = empathy;

        // --- B. 今日の状態の整理 ---
        let organizedHTML = '';
        if (current.tags.guruguru) organizedHTML += '<div class="item-row"><div class="icon-placeholder icon-spiral"></div><div class="item-text">頭の中で考えが止まりにくかったこと</div></div>';
        if (current.tags.shindoi) organizedHTML += '<div class="item-row"><div class="icon-placeholder icon-heart"></div><div class="item-text">動き出すまでかなり重さがあったこと</div></div>';
        if (current.text.includes('できない') || current.text.includes('ごめん')) organizedHTML += '<div class="item-row"><div class="icon-placeholder icon-heart"></div><div class="item-text">できなかったことで自分を責める感じがあったこと</div></div>';
        if (!organizedHTML) organizedHTML = '<div class="item-row"><div class="icon-placeholder icon-spiral"></div><div class="item-text">今の気持ちを言葉にできたこと</div></div>';
        organizedEl.innerHTML = organizedHTML;

        // --- C. 残っている力 ---
        let strengths = [];
        if (current.text.length > 30) strengths.push('しんどい中でも、ここまで書けています');
        else strengths.push('今の状態を言葉にして残せています');
        if (current.text.includes('昨日') || current.text.includes('最近')) strengths.push('今日の流れを振り返ろうとしています');
        else strengths.push('状態を見ようとする力は残っています');
        const strengthHTML = strengths.slice(0, 2).map(str => `<div class="item-row"><div class="icon-placeholder icon-leaf"></div><div class="item-text">${str}</div></div>`).join('');
        strengthEl.innerHTML = strengthHTML;

        // --- D. 戻り始めているもの & E. 過去との比較 ---
        const categories = {
            life_actions: '【生活行動】',
            interpersonal: '【対人接点】',
            easier_thinking: '【思考のゆるみ】',
            future_contact: '【未来への接触】',
            self_determination: '【自己決定】'
        };
        let recoveryFound = [];
        for (const [key, label] of Object.entries(categories)) {
            if (current.recovery[key]) recoveryFound.push(label);
        }
        
        let recoveryMsg = '今日の痕跡: まだ静かに休む時間が必要そうです。';
        if (recoveryFound.length > 0) {
            recoveryMsg = `今日の痕跡: ${recoveryFound.join(' ')} の記述が戻り始めています。`;
        }
        
        const pastLogs = records.slice(0, -1);
        let comparisonMsg = '記録が積み重なると、波の変化と回復の兆しをここでお伝えします。';
        if (pastLogs.length >= 1) {
            const pastRecoveryTags = pastLogs.map(r => r.recovery ? Object.entries(r.recovery).filter(e => e[1] > 0).map(e => e[0]) : []).flat();
            if (recoveryFound.length > 0) {
                comparisonMsg = '以前は「動けない」という言葉が主でしたが、最近は具体的な活動や先のことへの言及が少しずつ増えてきています。';
            } else {
                comparisonMsg = 'まだしんどさの波の中にいますが、こうして記録を続けられていることが回復のための大きな力になります。';
            }
        }
        comparisonTextEl.innerHTML = `<div style="font-weight:700; color:var(--primary); margin-bottom:4px;">${recoveryMsg}</div><div>${comparisonMsg}</div>`;

        // --- F. 根拠カード (小さく表示) ---
        const last7Days = records.filter(r => (new Date() - new Date(r.createdAt)) < (7 * 24 * 60 * 60 * 1000));
        const recoveryStats = { life_actions:0, interpersonal:0, easier_thinking:0, future_contact:0, self_determination:0 };
        last7Days.forEach(r => {
            if (r.recovery) for(const k in recoveryStats) if(r.recovery[k]) recoveryStats[k]++;
        });
        
        const evidenceEl = document.getElementById('fb-evidence-card');
        const activeEvidence = Object.entries(recoveryStats).filter(e => e[1] > 0);
        if (activeEvidence.length > 0) {
            evidenceEl.style.display = 'block';
            evidenceEl.innerHTML = '根拠: ' + activeEvidence.map(e => `${categories[e[0]]} ${e[1]}回`).join(' / ') + ' (直近7日)';
        } else {
            evidenceEl.style.display = 'none';
        }
    }

    // --- History View Logic ---

    function renderHistory(range = 7) {
        const filtered = records.filter(r => (new Date() - new Date(r.createdAt)) < (range * 24 * 60 * 60 * 1000));
        
        let summary = '記録が積み重なると、しんどさの波の中に隠れた回復の兆しを「線」として繋いで見えるようにします。';
        if (filtered.length > 2) {
            const recoveryStats = { life_actions:0, interpersonal:0, easier_thinking:0, future_contact:0, self_determination:0 };
            filtered.forEach(r => {
                if (r.recovery) {
                    for(const k in recoveryStats) if(r.recovery[k]) recoveryStats[k]++;
                }
            });
            
            const statsEntries = Object.entries(recoveryStats).filter(e => e[1] > 0).sort((a,b) => b[1] - a[1]);
            if (statsEntries.length > 0) {
                const labels = { life_actions:'【生活行動】', interpersonal:'【対人接点】', easier_thinking:'【思考のゆるみ】', future_contact:'【未来への接触】', self_determination:'【自己決定】' };
                summary = `しんどさの波はありますが、最近は${statsEntries.map(e => labels[e[0]]).join('や')}の記述が混ざる日が出てきています。これは回復の「線」が伸び始めている兆しです。`;
            }
        }
        historySummary.innerHTML = summary;

        const recent = [...records].reverse().slice(0, 3);
        recentLogsList.innerHTML = recent.map(r => {
            const d = new Date(r.createdAt);
            const dotColor = r.tags.dekita ? '#79A7A7' : (r.tags.shindoi ? '#D8C3BA' : '#BBB');
            return `<div class="mini_log_card">
                <span style="color:#999;font-size:0.85rem;">${d.getMonth()+1}/${d.getDate()}</span>
                <span style="flex:1;margin:0 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.text}</span>
                <i style="width:8px;height:8px;border-radius:50%;background:${dotColor}"></i>
            </div>`;
        }).join('');

        drawWave(filtered);
    }

    function drawWave(data) {
        if(chartInstance) chartInstance.destroy();
        const labels = data.map((_, i) => i + 1);
        let sData = [], gData = [], dData = [];
        let sVal=2, gVal=1, dVal=0;
        data.forEach(r => {
            sVal = Math.max(0, sVal + (r.tags.shindoi ? 1 : -0.4));
            gVal = Math.max(0, gVal + (r.tags.guruguru ? 1 : -0.4));
            dVal = Math.max(0, dVal + (r.tags.dekita ? 1 : -0.4));
            sData.push(sVal); gData.push(gVal); dData.push(dVal);
        });

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { data: sData, borderColor: '#8BAEAE', backgroundColor: 'rgba(139,174,174,0.1)', fill: true, tension: 0.5, pointRadius: 0, borderWidth: 2 },
                    { data: gData, borderColor: '#E8D5D0', backgroundColor: 'rgba(232,213,208,0.1)', fill: true, tension: 0.5, pointRadius: 0, borderWidth: 2 },
                    { data: dData, borderColor: '#B7C9B7', backgroundColor: 'rgba(183,201,183,0.1)', fill: true, tension: 0.5, pointRadius: 0, borderWidth: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false, min: 0 } }
            }
        });
    }

    // Default view
    goToView(inputView, '今の波', 'nav-home');
});
