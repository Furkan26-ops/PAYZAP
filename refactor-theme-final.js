const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, 'src/app/dashboard/page.tsx'),
    path.join(__dirname, 'src/app/swap/page.tsx')
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Text replacements
    content = content.replace(/text-slate-900 dark:text-white/g, 'text-arc-text');
    content = content.replace(/text-slate-500 dark:text-gray-400/g, 'text-arc-textMuted');
    content = content.replace(/text-slate-600 dark:text-gray-300/g, 'text-arc-text'); // Fallback
    content = content.replace(/text-slate-400 dark:text-gray-500/g, 'text-arc-textMuted');
    content = content.replace(/text-cyan-400/g, 'text-arc-cyan');
    content = content.replace(/text-cyan-100/g, 'text-white');
    content = content.replace(/text-gray-400/g, 'text-arc-textMuted');
    content = content.replace(/text-gray-300/g, 'text-arc-text');
    content = content.replace(/text-gray-500/g, 'text-arc-textMuted');

    // Background replacements
    content = content.replace(/bg-white dark:bg-black\/40/g, 'bg-arc-panel');
    content = content.replace(/bg-white dark:bg-black\/60/g, 'bg-arc-panelStrong');
    content = content.replace(/bg-white dark:bg-black\/50/g, 'bg-arc-panelStrong');
    content = content.replace(/bg-white dark:bg-black/g, 'bg-arc-bg');
    
    // Border replacements
    content = content.replace(/border-slate-200 dark:border-white\/10/g, 'border-arc-border');
    content = content.replace(/border-slate-200 dark:border-white\/5/g, 'border-arc-border');
    content = content.replace(/border-white\/10/g, 'border-arc-border');
    content = content.replace(/border-white\/5/g, 'border-arc-border');

    // Misc bg replacements
    content = content.replace(/bg-slate-100 dark:bg-white\/5/g, 'bg-arc-panelStrong');
    content = content.replace(/bg-slate-200 dark:bg-white\/10/g, 'bg-arc-panel');
    content = content.replace(/bg-white\/5/g, 'bg-arc-panel');
    content = content.replace(/bg-white\/10/g, 'bg-[var(--arc-border)]');

    fs.writeFileSync(file, content);
    console.log('Processed final', file);
});
