document.addEventListener('DOMContentLoaded', () => {
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

    // 4. 保存キーと保存データ名を正式化する / 5. 旧データがあっても壊れないようにする
    const OLD_STORAGE_KEY = 'mental_app_records';
    const NEW_STORAGE_KEY = 'recoveryEvidenceLogs';

    /**
     * ローカルストレージからの読み込みとマイグレーション
     */
    function loadRecords() {
        let logs = JSON.parse(localStorage.getItem(NEW_STORAGE_KEY));
        
        // 旧形式のデータがある場合は移行する
        if (!logs) {
            const oldData = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
            if (oldData && Array.isArray(oldData)) {
                logs = oldData.map(r => ({
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
                localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(logs));
                // 移行後は旧データを削除しても良いが、安全のため残す場合は何もしない
            } else {
                logs = [];
            }
        }
        return logs;
    }

    let records = loadRecords();

    // 2. 危機語彙を増やす
    const crisisWords = [
        '死にたい', '消えたい', 'いなくなりたい', 'もう無理', 'もうむり',
        '限界', '終わりにしたい', '消えたいです', 'つかれた', '生きていたくない', 'しにたい'
    ];

    // 3. タグ語彙を拡張する
    const shindoiWords = [
        'しんどい', 'だるい', '動けない', 'つらい', '疲れた', 'つかれた', '重い', '何もできない'
    ];
    const guruguruWords = [
        'ぐるぐる', '不安', '焦り', '落ち着かない', '考えすぎ', '頭が回る', '頭がうるさい', 'ごちゃごちゃ'
    ];
    const dekitaWords = [
        '動けた', '出られた', '少しできた', 'やれた', '起きられた', 'できた', '行けた', '食べられた'
    ];

    function extractTags(text) {
        return {
            shindoi: shindoiWords.some(w => text.includes(w)) ? 1 : 0,
            guruguru: guruguruWords.some(w => text.includes(w)) ? 1 : 0,
            dekita: dekitaWords.some(w => text.includes(w)) ? 1 : 0
        };
    }

    function hasCrisisWord(text) {
        return crisisWords.some(w => text.includes(w));
    }

    journalInput.addEventListener('input', () => {
        const text = journalInput.value.trim();
        submitBtn.disabled = text.length === 0;
    });

    function switchView(targetView) {
        // 全ビューのフェードアウト
        [inputView, feedbackView, historyView].forEach(view => {
            view.classList.remove('active');
            setTimeout(() => {
                if(!view.classList.contains('active')) {
                    view.classList.add('hidden');
                }
            }, 400); 
        });
        
        // ターゲットビューの表示
        targetView.classList.remove('hidden');
        setTimeout(() => {
            targetView.classList.add('active');
        }, 50);
    }

    submitBtn.addEventListener('click', () => {
        const text = journalInput.value;
        const crisisFlag = hasCrisisWord(text);
        const tags = extractTags(text);
        
        // データ保存の正規化
        const newRecord = {
            id: Date.now().toString(),
            text: text,
            createdAt: new Date().toISOString(),
            crisisFlag: crisisFlag,
            tags: tags
        };
        
        records.push(newRecord);
        localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(records));

        submitBtn.textContent = '生成中...';
        submitBtn.disabled = true;
        
        // 生成演出（1秒）
        setTimeout(() => {
            // フィードバック内容の構築
            fbEmpathy.innerHTML = '';
            fbFact.innerHTML = '';
            fbClosing.innerHTML = '';
            divider1.style.display = 'none';
            divider2.style.display = 'none';

            // 1. 危機時表示を通常表示と完全に分離する / 6. 危機時は専用文
            if (crisisFlag) {
                fbEmpathy.innerHTML = '<p>今はひとりで抱えない方がよさそうです</p>';
                fbFact.innerHTML = '<p>いま使える相談先があります</p>';
                fbClosing.innerHTML = `
                    <div class="crisis-card" style="margin-top:0; border:1px solid #FFDCDC;">
                        <p>ひとまず相談先を見られる状態にしておきます</p>
                        <a href="https://www.mhlw.go.jp/mamorouyokokoro/soudan/kokoro/" target="_blank" style="font-weight:700;">相談窓口を見てみる</a>
                    </div>
                `;
                divider1.style.display = 'block';
                divider2.style.display = 'block';
            } else {
                // 通常・継続の返答分岐
                const isFirstOrFew = records.length <= 2;
                
                if (isFirstOrFew) {
                    let empathy = '今日はしんどい日ですね。';
                    if (tags.guruguru) empathy = '頭のぐるぐるが強そうですね。';
                    else if (tags.shindoi) empathy = 'しんどさが強い日ですね。';
                    else if (tags.dekita) empathy = '少し動けたのですね。';
                    
                    fbEmpathy.innerHTML = `<p>${empathy}</p>`;
                    fbClosing.innerHTML = '<p>いまを吐き出していただき、ありがとうございます。</p>';
                } else {
                    let empathy = '今日もお疲れさまです。';
                    if (tags.shindoi) empathy = '今日はしんどさが強い日ですね。';
                    if (tags.guruguru) empathy = '今日は頭のぐるぐるが強い日ですね。';
                    if (tags.dekita) empathy = '今日は少し動けたのですね。';
                    
                    let fact = '波はありますが、記録を残せる日が続いています。';
                    const pastDekitaCount = records.slice(0, -1).filter(r => r.tags && r.tags.dekita > 0).length;
                    const pastShindoiCount = records.slice(0, -1).filter(r => r.tags && r.tags.shindoi > 0).length;
                    
                    if (tags.dekita > 0 && pastDekitaCount > 0) {
                        fact = '「少し動けた」と書かれる日が前より増えています。';
                    } else if (tags.shindoi > 0 && pastShindoiCount > 0) {
                        fact = 'しんどい日の中でも、感情を言葉にできる日は増えています。';
                    }

                    fbEmpathy.innerHTML = `<p>${empathy}</p>`;
                    fbFact.innerHTML = `<p>${fact}</p>`;
                    fbClosing.innerHTML = '<p>ゆっくりで大丈夫です。</p>';
                    divider1.style.display = 'block';
                }
                divider2.style.display = 'block';
            }
            
            // アニメーションの再トリガー
            [fbEmpathy, fbFact, fbClosing, divider1, divider2].forEach(el => {
                if(el && (el.innerHTML !== '' || el.style.display === 'block')) {
                    el.style.animation = 'none';
                    el.offsetHeight; 
                    el.style.animation = null;
                }
            });
            
            switchView(feedbackView);
            
            submitBtn.textContent = '吐き出す';
            submitBtn.disabled = false;
            journalInput.value = '';
            
        }, 1000);
    });

    backBtn.addEventListener('click', () => {
        switchView(inputView);
    });

    historyBtn.addEventListener('click', () => {
        if(historyView.classList.contains('active')){
            switchView(inputView);
        } else {
            switchView(historyView);
            renderChart();
        }
    });

    function renderChart() {
        if(chartInstance) {
            chartInstance.destroy();
        }
        
        if (records.length === 0) return;

        const labels = records.map((_, i) => i + 1);
        
        let shindoiData = [];
        let guruguruData = [];
        let dekitaData = [];
        
        let sScore = 0;
        let gScore = 0;
        let dScore = 0;

        records.forEach(r => {
            const t = r.tags || {shindoi:0, guruguru:0, dekita:0};
            if (t.shindoi > 0) sScore += 1; else if (sScore > 0) sScore -= 0.3;
            if (t.guruguru > 0) gScore += 1; else if (gScore > 0) gScore -= 0.3;
            if (t.dekita > 0) dScore += 1; else if (dScore > 0) dScore -= 0.3;

            shindoiData.push(Math.max(0, sScore));
            guruguruData.push(Math.max(0, gScore));
            dekitaData.push(Math.max(0, dScore));
        });

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'しんどさ',
                        data: shindoiData,
                        borderColor: '#A3B1C6',
                        backgroundColor: 'rgba(163, 177, 198, 0.05)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true
                    },
                    {
                        label: '頭のぐるぐる',
                        data: guruguruData,
                        borderColor: '#C2CEC2',
                        backgroundColor: 'rgba(194, 206, 194, 0.05)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true
                    },
                    {
                        label: '動けたこと',
                        data: dekitaData,
                        borderColor: '#D8C3BA', 
                        backgroundColor: 'rgba(216, 195, 186, 0.05)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { 
                        display: false,
                        min: 0
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
});
