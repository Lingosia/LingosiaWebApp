import { languageFlags } from '../languages.js';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

const username = getCookie('username');
const language = getCookie('language');

// Map language to flag emoji (add more as needed)
function getFlag(lang) {
    if (!lang) return '';
    const flag = languageFlags[lang.toLowerCase()];
    return flag || '';
}

document.getElementById('main-header').innerHTML = `
    <div class="header-flex" id="header-clickable">
        <div>
            <h1>Lingosia</h1>
        </div>
        <div class="header-user-area">
            ${
                username
                    ? `<span class="welcome-msg">Welcome, ${username}!</span>
                       <span class="user-flag" style="font-size:1.5em;margin-left:0.4em;">${getFlag(language)}</span>
                       <span class="settings-cog" id="settings-cog">&#9881;</span>
                       <div id="settings-dropdown" class="settings-dropdown">
                           <a href="../user_settings" class="settings-dropdown-item">Settings</a>
                           <a href="#" id="logout-link" class="settings-dropdown-item">Logout</a>
                       </div>`
                    : `<a href="../user_signup" class="login-btn">Signup</a><a href="../user_login" class="login-btn">Login</a>`
            }
        </div>
    </div>
`;

if (username) {
    const cog = document.getElementById('settings-cog');
    const dropdown = document.getElementById('settings-dropdown');
    cog.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', function() {
        dropdown.style.display = 'none';
    });
    dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        document.cookie = 'sessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        window.location.href = 'index';
    });
}

document.getElementById('header-clickable').addEventListener('click', function(e) {
    // Prevent header click if clicking on settings cog or dropdown
    if (
        e.target.id === 'settings-cog' ||
        e.target.classList.contains('settings-dropdown-item') ||
        e.target.closest('.settings-dropdown')
    ) {
        return;
    }
    if (username) {
        window.location.href = '../article_list';
    } else {
        window.location.href = '../index';
    }
});