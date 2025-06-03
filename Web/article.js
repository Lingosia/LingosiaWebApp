// Responsible for loading and rendering the article text

function wrapWords(text) {
    // Split by line, then by word, preserving line breaks
    return text.split('\n').map(line =>
        line.split(/(\s+)/).map(token =>
            /\S/.test(token)
                ? `<span class="word" data-word="${token.replace(/"/g, '&quot;')}">${token}</span>`
                : token
        ).join('')
    ).join('<br>');
}

function hasCJK(text) {
    return /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\u31f0-\u31ff\u3000-\u303f]/.test(text);
}

function insertSpacesBetweenCJK(text) {
    // Add a space between each CJK character
    return text.replace(/([\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\u31f0-\u31ff\u3000-\u303f])/g, '$1 ').replace(/ +/g, ' ');
}

function loadArticle(callback, id = null) {
    let url = '/api/article';
    if (id) {
        url += `?id=${encodeURIComponent(id)}`;
    }
    // Check localStorage first
    if (id) {
        const localKey = `article_${id}`;
        const cached = localStorage.getItem(localKey);
        if (cached) {
            let text = cached;
            if (hasCJK(text)) {
                text = insertSpacesBetweenCJK(text);
            }
            document.getElementById('article').innerHTML = wrapWords(text);
            if (callback) callback();
            return;
        }
    }
    fetch(url)
        .then(response => response.text())
        .then(text => {
            if (id) {
                localStorage.setItem(`article_${id}`, text);
            }
            if (hasCJK(text)) {
                text = insertSpacesBetweenCJK(text);
            }
            document.getElementById('article').innerHTML = wrapWords(text);
            if (callback) callback();
        })
        .catch(() => {
            document.getElementById('article').textContent = 'Failed to load article.';
        });
}