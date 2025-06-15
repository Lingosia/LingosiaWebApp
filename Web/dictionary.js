// Responsible for dictionary UI, selection, and saving user data

// ...existing code for getUserData, setUserData, applyUserHighlighting...

function getActiveLanguageKey() {

    //get language from the language cookie
    const language = getCookie('language') || 'unknown';
    if (language === 'unknown') {
        console.warn('No language set in cookie, defaulting to "unknown".');
    }
    return `${language}`;
}

function getWordSpans() {
    const lines = Array.from(document.querySelectorAll('#article > br, #article > span.word'));
    let result = [];
    let lineNum = 0;
    let wordIdx = 0;
    lines.forEach(node => {
        if (node.tagName === 'BR') {
            lineNum++;
            wordIdx = 0;
        } else {
            result.push({span: node, line: lineNum, idx: wordIdx});
            wordIdx++;
        }
    });
    return result;
}

function setupDictionaryUI() {
    let isSelecting = false;
    let selectedWords = [];
    let lastSelected = null;
    let startSpan = null;
    let startIndex = null;
    let startLine = null;

    function clearSelection() {
        document.querySelectorAll('#article .word.selected').forEach(span => {
            span.classList.remove('selected');
        });
        selectedWords = [];
    }

    function updateDictionaryDisplay() {
        const dictDiv = document.getElementById('dictionary-word');
        if (selectedWords.length === 1) {
            const cleanWord = selectedWords[0].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"");
            // Find all phrases containing this word and present in the article at this position
            let data = {};
            try {
                data = JSON.parse(localStorage.getItem(getActiveLanguageKey()) || '{}');
            } catch {}
            let foundPhrase = null;
            let foundPhraseStartIdx = null;
            let foundPhraseWords = null;

            const spans = Array.from(document.querySelectorAll('#article .word'));
            let selectedIdx = spans.findIndex(span =>
                span.classList.contains('selected')
            );

            // Check if the selected word is part of a known phrase and select the whole phrase
            let phraseMatched = false;
            Object.keys(data).forEach(key => {
                if (key.includes(' ') && data[key].understanding !== undefined) {
                    const phraseWords = key.toLowerCase().split(' ');
                    for (let i = 0; i <= spans.length - phraseWords.length; i++) {
                        let match = true;
                        for (let j = 0; j < phraseWords.length; j++) {
                            const spanWord = spans[i + j].dataset.word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").toLowerCase();
                            if (spanWord !== phraseWords[j]) {
                                match = false;
                                break;
                            }
                        }
                        if (match && selectedIdx >= i && selectedIdx < i + phraseWords.length) {
                            foundPhrase = key;
                            foundPhraseStartIdx = i;
                            foundPhraseWords = phraseWords;
                            // Select all words in the phrase
                            selectedWords = [];
                            for (let j = 0; j < phraseWords.length; j++) {
                                spans[i + j].classList.add('selected');
                                selectedWords.push(spans[i + j].dataset.word);
                            }
                            phraseMatched = true;
                            break;
                        }
                    }
                }
            });

            if (foundPhrase) {
                dictDiv.textContent = foundPhrase;
                document.getElementById('user-translation-form').style.display = 'none';
                document.getElementById('user-phrase-form').style.display = '';
                const phraseData = getUserData(foundPhrase);
                document.getElementById('user-phrase-translation').value = phraseData.translation || '';
                document.getElementById('user-phrase-understanding').value = phraseData.understanding !== undefined ? phraseData.understanding : '';
            } else {
                dictDiv.textContent = cleanWord;
                const userData = getUserData(cleanWord);
                document.getElementById('user-translation').value = userData.translation || '';
                document.getElementById('user-understanding').value = userData.understanding !== undefined ? userData.understanding : '';
                document.getElementById('user-translation-form').style.display = '';
                document.getElementById('user-phrase-form').style.display = 'none';

                // Lingosia - Start: Anki deck lookup for single word
                // Get language from cookie
                const language = getCookie('language') || 'danish';
                const ankiKey = 'ankiDeck_' + language;
                let ankiDeck = [];
                try {
                    const ankiRaw = localStorage.getItem(ankiKey);
                    if (ankiRaw) {
                        ankiDeck = JSON.parse(ankiRaw);
                    }
                } catch {}
                // Search for the word in all notes of all models
                console.log(`Searching Anki deck for word "${cleanWord}" in language "${language}"`);
                let ankiMatches = [];
                if (ankiDeck && ankiDeck.length > 0) {
                    ankiDeck.forEach(deck => {
                        if (deck.notes && deck.fieldNames) {
                            deck.notes.forEach(note => {
                                // Check if cleanWord is a value in the note object (no regex, no cleaning)
                                if (Object.values(note).some(val =>
                                    typeof val === 'string' && val.toLowerCase().includes(cleanWord.toLowerCase())
                                )) {
                                    ankiMatches.push({
                                        model: deck.name,
                                        fields: note
                                    });
                                    console.log(`Found match in Anki deck "${deck.name}" for word "${cleanWord}":`, note);
                                }
                            });
                        }
                    });
                }
                // Display matches at the bottom of the dictionary pane
                let ankiDiv = document.getElementById('anki-dictionary-results');
                if (!ankiDiv) {
                    ankiDiv = document.createElement('div');
                    ankiDiv.id = 'anki-dictionary-results';
                    ankiDiv.style.marginTop = '1em';
                    dictDiv.parentNode.appendChild(ankiDiv);
                }
                if (ankiMatches.length > 0) {
                    let html = '<div style="border-top:1px solid #ccc;margin-top:8px;padding-top:4px;font-size:90%"><b>Anki deck matches:</b><ul style="margin:0;padding-left:18px">';
                    ankiMatches.forEach(match => {
                        html += `<li><b>${match.model}</b>: `;
                        html += Object.entries(match.fields).map(([k, v]) => `<span style="color:#555">${k}</span>: <span style="color:#222">${v}</span>`).join(', ');
                        html += '</li>';
                    });
                    html += '</ul></div>';
                    ankiDiv.innerHTML = html;
                } else {
                    ankiDiv.innerHTML = '';
                }
                // Lingosia - End
            }
        } else if (selectedWords.length > 1) {
            const phrase = selectedWords.map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"")).join(' ').toLowerCase();
            dictDiv.textContent = phrase;
            document.getElementById('user-translation').value = '';
            document.getElementById('user-understanding').value = '';
            document.getElementById('user-translation-form').style.display = 'none';
            document.getElementById('user-phrase-form').style.display = '';
            const phraseData = getUserData(phrase);
            document.getElementById('user-phrase-translation').value = phraseData.translation || '';
            document.getElementById('user-phrase-understanding').value = phraseData.understanding !== undefined ? phraseData.understanding : '';
        } else {
            dictDiv.textContent = 'Click a word to see it here';
            document.getElementById('user-translation').value = '';
            document.getElementById('user-understanding').value = '';
            document.getElementById('user-translation-form').style.display = '';
            document.getElementById('user-phrase-form').style.display = 'none';
        }
        applyUserHighlighting(selectedWords);
    }

    const wordSpans = getWordSpans();

    wordSpans.forEach((obj, i) => {
        const span = obj.span;
        span.addEventListener('mousedown', function(e) {
            e.preventDefault();
            clearSelection();
            isSelecting = true;
            startSpan = span;
            startIndex = i;
            startLine = obj.line;
            span.classList.add('selected');
            selectedWords = [span.dataset.word];
            lastSelected = span;
            updateDictionaryDisplay();
        });
        span.addEventListener('mouseenter', function(e) {
            if (isSelecting) {
                const currIndex = i;
                const currLine = obj.line;
                if (currIndex <= startIndex) return;

                clearSelection();

                let selectedObjs = [];
                let inRange = false;
                let lastLine = startLine;

                for (let j = 0; j < wordSpans.length; j++) {
                    const w = wordSpans[j];
                    if (j === startIndex) {
                        inRange = true;
                    }
                    if (inRange) {
                        if (w.line > lastLine) {
                            for (let k = j-1; k >= 0 && wordSpans[k].line === lastLine; k--) {
                                if (!selectedObjs.includes(wordSpans[k])) {
                                    selectedObjs.push(wordSpans[k]);
                                }
                            }
                            lastLine = w.line;
                        }
                        selectedObjs.push(w);
                    }
                    if (j === currIndex) break;
                }

                selectedWords = selectedObjs.map(w => w.span.dataset.word);
                selectedObjs.forEach(w => w.span.classList.add('selected'));
                lastSelected = span;
                updateDictionaryDisplay();
            }
        });
        span.addEventListener('mouseup', function(e) {
            isSelecting = false;
            updateDictionaryDisplay();
        });
        span.addEventListener('selectstart', e => e.preventDefault());
    });

    wordSpans.forEach(obj => {
        obj.span.addEventListener('click', function(e) {
            if (selectedWords.length === 1) {
                updateDictionaryDisplay();
            }
        });
    });

    document.getElementById('dictionary-lookup').addEventListener('click', function() {
        if (selectedWords.length >= 1) {
            const cleanWords = selectedWords.map(w =>
                w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"")
            ).join(' ');
            const url = `https://translate.google.com/?sl=da&tl=en&text=${encodeURIComponent(cleanWords)}&op=translate`;
            window.open(
                url,
                'google_translate_popup',
                'width=800,height=400,menubar=no,toolbar=no,location=no,status=no'
            );
        }
    });
    document.getElementById('dictcc-lookup').addEventListener('click', function() {
        if (selectedWords.length >= 1) {
            const cleanWords = selectedWords.map(w =>
                w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"")
            ).join(' ');
            const url = `https://daen.dict.cc/?s=${encodeURIComponent(cleanWords)}`;
            window.open(
                url,
                'dictcc_popup',
                'width=1200,height=400,menubar=no,toolbar=no,location=no,status=no'
            );
        }
    });

    document.getElementById('user-translation-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (selectedWords.length === 1) {
            const cleanWord = selectedWords[0].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"");
            const translation = document.getElementById('user-translation').value;
            let understanding = parseInt(document.getElementById('user-understanding').value, 10);
            if (isNaN(understanding) || understanding < 0) understanding = 0;
            if (understanding > 5) understanding = 5;
            setUserData(cleanWord, { translation, understanding });
            applyUserHighlighting(selectedWords);
        }
    });

    document.getElementById('user-phrase-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (selectedWords.length > 1) {
            
            const phrase = selectedWords.map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"")).join(' ').toLowerCase();
            const translation = document.getElementById('user-phrase-translation').value;
            let understanding = parseInt(document.getElementById('user-phrase-understanding').value, 10);
            if (isNaN(understanding) || understanding < 0) understanding = 0;
            if (understanding > 5) understanding = 5;
            setUserData(phrase, { translation, understanding });
            applyUserHighlighting(selectedWords);
        }
    });

    // Initial highlight
    applyUserHighlighting(selectedWords);
}

