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

    let records = JSON.parse(localStorage.getItem(NEW_STORAGE_KEY));
    if (!records) {
        const oldRecords = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
        if (oldRecords && oldRecords.length > 0) {
            records = oldRecords.map(r => {
                const ext = r.extractedTags || [];
                return {
                    id: (r.id || Date.now()).toString(),
                    text: r.text || "",
                    createdAt: new Date(r.timestamp || Date.now()).toISOString(),
                    crisisFlag: r.crisisFlag || false,
                    tags: {
                        shindoi: ext.includes('しんどさ') ? 1 : 0,
                        guruguru: ext.includes('ぐるぐる') ? 1 : 0,
                        dekita: ext.includes('動けたこと') ? 1 : 0
                    }
                };
            });
            localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(records));
        } else {
            records = [];
        }
    }

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
        [inputView, feedbackView, historyView].forEach(view => {
            view.classList.remove('active');
            setTimeout(() => {
                if(!view.classList.contains('active')) {
                    view.classList.add('hidden');
                }
            }, 400); 
        });
        
        targetView.classList.remove('hidden');
        setTimeout(() => {
            targetView.classList.add('active');
        }, 50);
    }

    submitBtn.addEventListener('click', () => {
        const text = journalInput.value;
        const crisisFlag = hasCrisisWord(text);
        const tags = extractTags(text);
        
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
        
        setTimeout(() => {
            // 1. 危機時表示を通常表示と完全に分離する / 6. 危機時だけは必ず専用文にする
            if (crisisFlag) {
                fbEmpathy.innerHTML = '<p>今はひとりで抱えない方がよさそうです</p>';
                fbFact.innerHTML = '';
                fbClosing.innerHTML = '<div class="crisis-card" style="margin-top:0;"><p>いま使える相談先があります<br>ひとまず相談先を見られる状態にしておきます</p><a href="https://www.mhlw.go.jp/mamorouyokokoro/soudan/kokoro/" target="_blank">相談窓口を見てみる</a></div>';
                
                divider1.style.display = 'none';
                divider2.style.display = 'none'; 
            } else {
                const isFirstOrFew = records.length <= 2;
                
                if (isFirstOrFew) {
                    let empathyText = '今日はしんどい日ですね。';
                    if (tags.guruguru) empathyText = '頭のぐるぐるが強そうですね。';
                    else if (tags.shindoi) empathyText = 'しんどさが強い日ですね。';
                    else if (tags.dekita) empathyText = '少し動けたのですね。';
                    
                    fbEmpathy.innerHTML = `<p>${empathyText}</p>`;
                    fbFact.innerHTML = '';
                    fbClosing.innerHTML = '<p>いまを残していただき、ありがとうございます。</p>';
                } else {
                    let empathyText = '今日もお疲れさまです。';
                    if (tags.shindoi) empathyText = '今日はしんどさが強い日ですね。';
                    if (tags.guruguru) empathyText = '今日は頭のぐるぐるが強い日ですね。';
                    if (tags.dekita) empathyText = '今日は少し動けたのですね。';
                    
                    let factText = '波はありますが、記録を残せる日が続いています。';
                    const pastDekita = records.slice(0, -1).filter(r => r.tags && r.tags.dekita > 0).length;
                    const pastShindoi = records.slice(0, -1).filter(r => r.tags && r.tags.shindoi > 0).length;
                    
                    if (tags.dekita > 0 && pastDekita > 0) {
                        factText = '最近は「少し動けた」と書かれる日が前より増えています。';
                    } else if (tags.shindoi > 0 && pastShindoi > 0) {
                        factText = 'しんどい日の中でも、短い言葉で残せる日は続いています。';
                    }

                    fbEmpathy.innerHTML = `<p>${empathyText}</p>`;
                    fbFact.innerHTML = `<p>${factText}</p>`;
                    fbClosing.innerHTML = '<p>ゆっくり休むことも大切です。</p>';
                }
            }
            
            [fbEmpathy, fbFact, fbClosing].forEach(el => {
                if(el && el.innerHTML !== '') {
                    el.style.animation = 'none';
                    el.offsetHeight; 
                    el.style.animation = null;
                }
            });
            
            if (!crisisFlag) {
                divider1.style.display = (fbFact.innerHTML === '') ? 'none' : 'block';
                divider2.style.display = (fbClosing.innerHTML === '') ? 'none' : 'block';
            }
            [divider1, divider2].forEach(el => {
                if(el.style.display !== 'none') {
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
        
        let shindoiScore = 0;
        let guruguruScore = 0;
        let dekitaScore = 0;

        records.forEach(r => {
            const tags = r.tags || {shindoi:0, guruguru:0, dekita:0};
            if (tags.shindoi > 0) shindoiScore += 1;
            else if (shindoiScore > 0) shindoiScore -= 0.5;

            if (tags.guruguru > 0) guruguruScore += 1;
            else if (guruguruScore > 0) guruguruScore -= 0.5;

            if (tags.dekita > 0) dekitaScore += 1;
            else if (dekitaScore > 0) dekitaScore -= 0.5;

            shindoiData.push(Math.max(0, shindoiScore));
            guruguruData.push(Math.max(0, guruguruScore));
            dekitaData.push(Math.max(0, dekitaScore));
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
                        backgroundColor: 'rgba(163, 177, 198, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: '頭のぐるぐる',
                        data: guruguruData,
                        borderColor: '#C2CEC2',
                        backgroundColor: 'rgba(194, 206, 194, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: '動けたこと',
                        data: dekitaData,
                        borderColor: '#D8C3BA', 
                        backgroundColor: 'rgba(216, 195, 186, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false
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
