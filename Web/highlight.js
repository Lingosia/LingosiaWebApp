// Responsible for highlighting words and phrases based on user data

function toProperCase(str) {
    if (!str) return '';
    // For CJK, just return as is
    if (/^[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\u31f0-\u31ff\u3000-\u303f]+$/.test(str)) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function toLowerCase(str) {
    return (str || '').toLowerCase();
}

function getUserData(wordOrPhrase) {
    try {
        const data = JSON.parse(localStorage.getItem(getActiveLanguageKey()) || '{}');
        return data[toLowerCase(wordOrPhrase)] || {};
    } catch {
        return {};
    }
}

function setUserData(wordOrPhrase, obj) {
    let data = {};
    try {
        data = JSON.parse(localStorage.getItem(getActiveLanguageKey()) || '{}');
    } catch {}
    data[toLowerCase(wordOrPhrase)] = obj;
    localStorage.setItem(getActiveLanguageKey(), JSON.stringify(data));
    sendUserDataToServer(wordOrPhrase, obj);
}

function sendUserDataToServer(wordOrPhrase, obj) {
    if (!wordOrPhrase || !obj) {
        console.error('Invalid word or phrase or data object');
        return;
    }
    const url = '/api/word';
    const data = {
        wordOrPhrase: toLowerCase(wordOrPhrase),
        ...obj,
        username: getCookie('username'),
        sessionToken: getCookie('sessionToken'),
        language: getActiveLanguageKey()
    };
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .catch(() => {
        console.error('Failed to send user data to server');
    });
}

function applyUserHighlighting(selectedWords = []) {
    // Highlight single words
    document.querySelectorAll('#article .word').forEach(span => {
        let cleanWord = span.dataset.word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"");
        const userData = getUserData(cleanWord);
        if (userData.understanding !== undefined) {
            span.setAttribute('data-understanding', userData.understanding);
        } else {
            span.removeAttribute('data-understanding');
        }
        // Remove previous phrase highlight
        span.removeAttribute('data-phrase-understanding');
        span.classList.remove('phrase-selected');
    });

    // Highlight phrases if selected
    
    let data = {};
    try {
        data = JSON.parse(localStorage.getItem(getActiveLanguageKey()) || '{}');
    } catch {}
    Object.keys(data).forEach(key => {
        if (key.includes(' ') && data[key].understanding !== undefined) {
            const phraseWords = key.toLowerCase().split(' ');
            const spans = Array.from(document.querySelectorAll('#article .word'));
            for (let i = 0; i <= spans.length - phraseWords.length; i++) {
                let match = true;
                for (let j = 0; j < phraseWords.length; j++) {
                    let spanWord = spans[i + j].dataset.word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").toLowerCase();
                    // Compare as lower case
                    if (spanWord !== phraseWords[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    for (let j = 0; j < phraseWords.length; j++) {
                        spans[i + j].setAttribute('data-phrase-understanding', data[key].understanding);
                    }
                }
            }
        }
    });

    /*
    // Highlight all words in a known phrase if any word in the phrase is selected
    if (selectedWords.length === 1) {
        const spans = Array.from(document.querySelectorAll('#article .word'));
        Object.keys(data).forEach(key => {
            if (key.includes(' ') && data[key].understanding !== undefined) {
                const phraseWords = key.toLowerCase().split(' ');
                for (let i = 0; i <= spans.length - phraseWords.length; i++) {
                    let match = true;
                    for (let j = 0; j < phraseWords.length; j++) {
                        let spanWord = spans[i + j].dataset.word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").toLowerCase();
                        if (spanWord !== phraseWords[j]) {
                            match = false;
                            break;
                        }
                    }
                    if (match) {
                        for (let j = 0; j < phraseWords.length; j++) {
                            if (
                                spans[i + j].dataset.word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").toLowerCase() === selectedWords[0].toLowerCase()
                            ) {
                                for (let k = 0; k < phraseWords.length; k++) {
                                    spans[i + k].classList.add('phrase-selected');
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    */
}
