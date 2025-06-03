// Simple footer for Lingosia

document.getElementById('main-footer').innerHTML = `
    <div class="footer-content">
        <span>&copy; ${new Date().getFullYear()} Lingosia</span>
        <span style="margin-left:1em;"><a href="https://github.com/Lingosia/LingosiaWebApp" target="_blank" rel="noopener">GitHub</a></span>
        <span style="margin-left:1em;"><a href="legal_about">About</a></span>
        <span style="margin-left:1em;"><a href="legal_terms">Terms</a></span>
        <span style="margin-left:1em;"><a href="legal_privacy">Privacy</a></span>
    </div>
`;
