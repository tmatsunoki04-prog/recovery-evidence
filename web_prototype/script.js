document.addEventListener('DOMContentLoaded', () => {
    const inputView = document.getElementById('input-view');
    const feedbackView = document.getElementById('feedback-view');
    const historyView = document.getElementById('history-view');
    
    const journalInput = document.getElementById('journal-input');
    const submitBtn = document.getElementById('submit-btn');
    const backBtn = document.getElementById('back-btn');
    const historyBtn = document.getElementById('history-btn');
    
    const crisisLink = document.getElementById('crisis-link');
    
    const fbEmpathy = document.getElementById('fb-empathy');
    const fbFact = document.getElementById('fb-fact');
    const fbClosing = document.getElementById('fb-closing');
    const divider1 = document.getElementById('divider-1');
    const divider2 = document.getElementById('divider-2');
    
    const ctx = document.getElementById('waveChart').getContext('2d');
    let chartInstance = null;

    const STORAGE_KEY = 'mental_app_records';
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const crisisWords = ['死にたい', '消えたい', 'いなくなりたい', 'もう無理', '限界', '終わりにしたい'];
    const shindosaWords = ['しんどい', 'だるい', '動けない'];
    const guruguruWords = ['頭がぐるぐる', '不安', '焦り'];
    const ugoketaWords = ['動けた', '出られた', '少しできた'];

    function extractTags(text) {
        const tags = [];
        if (shindosaWords.some(w => text.includes(w))) tags.push('しんどさ');
        if (guruguruWords.some(w => text.includes(w))) tags.push('ぐるぐる');
        if (ugoketaWords.some(w => text.includes(w))) tags.push('動けたこと');
        return tags;
    }

    function hasCrisisWord(text) {
        return crisisWords.some(w => text.includes(w));
    }

    journalInput.addEventListener('input', () => {
        const text = journalInput.value.trim();
        submitBtn.disabled = text.length === 0;
        
        if (hasCrisisWord(text)) {
            crisisLink.classList.remove('hidden');
        } else {
            crisisLink.classList.add('hidden');
        }
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
            id: Date.now(),
            text: text,
            timestamp: Date.now(),
            crisisFlag: crisisFlag,
            extractedTags: tags
        };
        
        records.push(newRecord);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        submitBtn.textContent = '生成中...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            if (crisisFlag) {
                fbEmpathy.innerHTML = '<p>今はひとりで抱えない方がよさそうです。</p>';
                fbFact.innerHTML = '<p>いま使える相談先があります。下のボタンから窓口を見てみてください。</p>';
                fbClosing.innerHTML = '';
            } else {
                const isFirstOrFew = records.length <= 2;
                
                if (isFirstOrFew) {
                    let empathyText = '今日はしんどい日ですね。';
                    if (tags.includes('ぐるぐる')) empathyText = '頭のぐるぐるが強そうですね。';
                    else if (tags.includes('しんどさ')) empathyText = '動けない感じが強い日ですね。';
                    else if (tags.includes('動けたこと')) empathyText = '少し動けたのですね。';
                    
                    fbEmpathy.innerHTML = `<p>${empathyText}</p>`;
                    fbFact.innerHTML = '';
                    fbClosing.innerHTML = '<p>吐き出していただき、ありがとうございます。</p>';
                } else {
                    let empathyText = '今日もお疲れさまです。';
                    if (tags.includes('しんどさ')) empathyText = '今日はしんどさが強い日ですね。';
                    if (tags.includes('ぐるぐる')) empathyText = '今日は頭のぐるぐるが強い日ですね。';
                    if (tags.includes('動けたこと')) empathyText = '今日は少し動けたのですね。';
                    
                    let factText = '波はありますが、全部が悪い日ではなくなってきています。';
                    const pastUgoketa = records.slice(0, -1).filter(r => r.extractedTags.includes('動けたこと')).length;
                    const pastShindosa = records.slice(0, -1).filter(r => r.extractedTags.includes('しんどさ')).length;
                    
                    if (tags.includes('動けたこと') && pastUgoketa > 0) {
                        factText = '最近は「少し動けた」と書かれる日が前より増えています。';
                    } else if (tags.includes('しんどさ') && pastShindosa > 0) {
                        factText = 'しんどい日の中でも、短い言葉で残せる日は続いています。';
                    }

                    fbEmpathy.innerHTML = `<p>${empathyText}</p>`;
                    fbFact.innerHTML = `<p>${factText}</p>`;
                    fbClosing.innerHTML = '<p>ゆっくりで大丈夫です。</p>';
                }
            }
            
            [fbEmpathy, fbFact, fbClosing].forEach(el => {
                if(el && el.innerHTML !== '') {
                    el.style.animation = 'none';
                    el.offsetHeight; 
                    el.style.animation = null;
                }
            });
            
            divider1.style.display = (fbFact.innerHTML === '') ? 'none' : 'block';
            divider2.style.display = (fbClosing.innerHTML === '') ? 'none' : 'block';
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
            crisisLink.classList.add('hidden');
            
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
        
        let shindosaData = [];
        let guruguruData = [];
        let ugoketaData = [];
        
        let shindosaScore = 0;
        let guruguruScore = 0;
        let ugoketaScore = 0;

        records.forEach(r => {
            if (r.extractedTags.includes('しんどさ')) shindosaScore += 1;
            else if (shindosaScore > 0) shindosaScore -= 0.5;

            if (r.extractedTags.includes('ぐるぐる')) guruguruScore += 1;
            else if (guruguruScore > 0) guruguruScore -= 0.5;

            if (r.extractedTags.includes('動けたこと')) ugoketaScore += 1;
            else if (ugoketaScore > 0) ugoketaScore -= 0.5;

            shindosaData.push(Math.max(0, shindosaScore));
            guruguruData.push(Math.max(0, guruguruScore));
            ugoketaData.push(Math.max(0, ugoketaScore));
        });

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'しんどさ',
                        data: shindosaData,
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
                        data: ugoketaData,
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
