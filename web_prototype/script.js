/**
 * メンタル回復ウォッチャー - MVP Core Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const inputView = document.getElementById('input-view');
    const feedbackView = document.getElementById('feedback-view');
    const historyView = document.getElementById('history-view');
    const journalInput = document.getElementById('journal-input');
    const submitBtn = document.getElementById('submit-btn');
    const backBtn = document.getElementById('back-btn');
    const historyBtn = document.getElementById('history-btn');
    const fbEmpathy = document.getElementById('fb-empathy');
    const fbFact = document.getElementById('fb-fact');
    const fbClosing = document.getElementById('fb-closing');
    const divider1 = document.getElementById('divider-1');
    const divider2 = document.getElementById('divider-2');
    const ctx = document.getElementById('waveChart').getContext('2d');
    let chartInstance = null;

    // 4. 保存キーと保存データ名を正式化する
    const STORAGE_KEY = 'recoveryEvidenceLogs';

    /**
     * 5. 保存データ構造の正式化とマイグレーション
     */
    function loadAndMigrate() {
        let logs = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!logs) {
            // 旧キー "mental_app_records" からの移行
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
            } else {
                logs = [];
            }
        }
        return logs;
    }

    let records = loadAndMigrate();

    // 2. 危機語彙を増やす
    const crisisWords = [
        '死にたい', '消えたい', 'いなくなりたい', 'もう無理', 'もうむり',
        '限界', '終わりにしたい', '消えたいです', 'つかれた', '生きていたくない', 'しにたい'
    ];

    // 3. タグ語彙を拡張する
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

    function detectCrisis(text) {
        return crisisWords.some(w => text.includes(w));
    }

    // Input monitoring
    journalInput.addEventListener('input', () => {
        submitBtn.disabled = journalInput.value.trim().length === 0;
    });

    // View navigation
    function goToView(target) {
        [inputView, feedbackView, historyView].forEach(v => {
            v.classList.remove('active');
            setTimeout(() => { if(!v.classList.contains('active')) v.classList.add('hidden'); }, 400);
        });
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('active'), 50);
    }

    // Submit handler
    submitBtn.addEventListener('click', () => {
        const text = journalInput.value;
        const crisisFlag = detectCrisis(text);
        const tags = extractStats(text);
        
        // Save new record in formalized structure
        const record = {
            id: Date.now().toString(),
            text: text,
            createdAt: new Date().toISOString(),
            crisisFlag: crisisFlag,
            tags: tags
        };
        
        records.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        submitBtn.textContent = '生成中...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            fbEmpathy.innerHTML = '';
            fbFact.innerHTML = '';
            fbClosing.innerHTML = '';
            divider1.style.display = 'none';
            divider2.style.display = 'none';

            if (crisisFlag) {
                // 1. 危機時表示の完全分離 / 6. 危機時専用メッセージ
                fbEmpathy.innerHTML = '<p>今はひとりで抱えない方がよさそうです</p>';
                fbFact.innerHTML = '<p>いま使える相談先があります</p>';
                fbClosing.innerHTML = `
                    <div class="crisis-card" style="margin-top:0; border:1px solid #FFDCDC; padding:16px; background:#FFF5F5; border-radius:12px; text-align:center;">
                        <p style="color:#D44; margin-bottom:12px;">ひとまず相談先を見られる状態にしておきます</p>
                        <a href="https://www.mhlw.go.jp/mamorouyokokoro/soudan/kokoro/" target="_blank" style="color:#222; font-weight:700; text-decoration:underline;">相談窓口を見てみる</a>
                    </div>
                `;
            } else {
                // 通常・継続返答
                const isFirstTime = records.length <= 2;
                if (isFirstTime) {
                    let greeting = '今日はしんどい日ですね。';
                    if (tags.dekita) greeting = '少し動けたのですね。';
                    else if (tags.guruguru) greeting = '頭のぐるぐるが強そうですね。';
                    fbEmpathy.innerHTML = `<p>${greeting}</p>`;
                    fbClosing.innerHTML = '<p>いまを吐き出していただき、ありがとうございます。</p>';
                } else {
                    let greeting = '今日もお疲れさまです。';
                    if (tags.shindoi) greeting = '今日はしんどさが強い日ですね。';
                    
                    let fact = '波はありますが、少しずつ記録が積み重なっています。';
                    const pastDekita = records.slice(0, -1).filter(r => r.tags && r.tags.dekita > 0).length;
                    if (tags.dekita > 0 && pastDekita > 0) {
                        fact = '「少し動けた」と書かれた日が前より増えています。';
                    }
                    
                    fbEmpathy.innerHTML = `<p>${greeting}</p>`;
                    fbFact.innerHTML = `<p>${fact}</p>`;
                    fbClosing.innerHTML = '<p>ゆっくりで大丈夫です。</p>';
                    divider1.style.display = 'block';
                }
            }
            divider2.style.display = 'block';
            
            goToView(feedbackView);
            submitBtn.textContent = '吐き出す';
            submitBtn.disabled = false;
            journalInput.value = '';
        }, 1000);
    });

    backBtn.addEventListener('click', () => goToView(inputView));
    historyBtn.addEventListener('click', () => {
        if(historyView.classList.contains('active')) goToView(inputView);
        else { goToView(historyView); drawWave(); }
    });

    function drawWave() {
        if(chartInstance) chartInstance.destroy();
        if (records.length === 0) return;
        const labels = records.map((_, i) => i + 1);
        let sData = [], gData = [], dData = [];
        let sVal = 0, gVal = 0, dVal = 0;
        records.forEach(r => {
            const t = r.tags || {shindoi:0, guruguru:0, dekita:0};
            sVal = Math.max(0, sVal + (t.shindoi ? 1 : -0.3));
            gVal = Math.max(0, gVal + (t.guruguru ? 1 : -0.3));
            dVal = Math.max(0, dVal + (t.dekita ? 1 : -0.3));
            sData.push(sVal); gData.push(gVal); dData.push(dVal);
        });
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'しんどさ', data: sData, borderColor: '#A3B1C6', backgroundColor: 'rgba(163,177,198,0.1)', fill: true, tension: 0.4, pointRadius:0 },
                    { label: 'ぐるぐる', data: gData, borderColor: '#C2CEC2', backgroundColor: 'rgba(194,206,194,0.1)', fill: true, tension: 0.4, pointRadius:0 },
                    { label: 'できたこと', data: dData, borderColor: '#D8C3BA', backgroundColor: 'rgba(216,195,186,0.1)', fill: true, tension: 0.4, pointRadius:0 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false, min: 0 } }
            }
        });
    }
});
