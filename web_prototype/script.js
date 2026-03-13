/**
 * メンタル回復ウォッチャー - MVP 100% Visual Matching Version
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
    const shindoiVocab = ['しんどい', 'だるい', '動けない', 'つらい', '疲れた', 'つかれた', '重い', '何もできない'];
    const guruguruVocab = ['ぐるぐる', '不安', '焦り', '落ち着かない', '考えすぎ', '頭が回る', '頭がうるさい', 'ごちゃごちゃ'];
    const dekitaVocab = ['動けた', '出られた', '少しできた', 'やれた', '起きられた', 'できた', '行けた', '食べられた'];

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
            tags: extractStats(text)
        };
        
        records.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        submitBtn.textContent = '生成中...';
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
        // A. Empathy
        let empathy = '今日もお疲れさまです。';
        if (current.tags.shindoi) empathy = '今日はしんどさが強い日ですね';
        else if (current.tags.dekita) empathy = '少し動けたのですね';
        empathyEl.innerHTML = empathy;

        // B. Organized (With Custom Icons from Image)
        let organizedHTML = '';
        if (current.tags.guruguru) organizedHTML += '<div class="item-row"><div class="icon-placeholder icon-spiral"></div><div class="item-text">頭のぐるぐるが続いていた</div></div>';
        if (current.tags.shindoi) organizedHTML += '<div class="item-row"><div class="icon-placeholder icon-heart"></div><div class="item-text">動けなさが続いていた</div></div>';
        if (current.text.includes('責める') || current.text.includes('ごめん')) organizedHTML += '<div class="item-row"><div class="icon-placeholder icon-heart"></div><div class="item-text">自分を責める気持ちがあった</div></div>';
        if (!organizedHTML) organizedHTML = '<div class="item-row"><div class="icon-placeholder icon-spiral"></div><div class="item-text">今の気持ちを言葉にできた</div></div>';
        organizedEl.innerHTML = organizedHTML;

        // C. Strength
        strengthEl.innerHTML = `
            <div class="item-row"><div class="icon-placeholder icon-leaf"></div><div class="item-text">状態を言葉にして残せている</div></div>
            <div class="item-row"><div class="icon-placeholder icon-spiral"></div><div class="item-text">振り返ろうとしている</div></div>
        `;

        // D. Comparison
        const pastLogs = records.slice(0, -1);
        let comparison = '波はありますが、戻ってきている部分がありそうです。';
        if (pastLogs.length > 3) comparison = '少し動けた日が増えてきています。';
        comparisonTextEl.textContent = comparison;

        // E. Closing
        closingTextEl.textContent = '波はありますが、前より戻ってきている部分があります';
    }

    function renderHistory(range = 7) {
        const filtered = records.filter(r => (new Date() - new Date(r.createdAt)) < (range * 24 * 60 * 60 * 1000));
        
        historySummary.innerHTML = filtered.length > 2 
            ? 'しんどさの波はありますが、<br><span>“少し動けた” 日も混ざっています</span>'
            : '記録が積み重なると、波の変化が見えてきます。';

        const recent = [...records].reverse().slice(0, 3);
        recentLogsList.innerHTML = recent.map(r => {
            const d = new Date(r.createdAt);
            const dotColor = r.tags.dekita ? '#79A7A7' : (r.tags.shindoi ? '#D8C3BA' : '#BBB');
            return `<div class="mini-log-card">
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
