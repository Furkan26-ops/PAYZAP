const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, 'src/app/dashboard/page.tsx'),
    path.join(__dirname, 'src/app/swap/page.tsx'),
    path.join(__dirname, 'src/app/page.tsx')
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Replace text-white with text-slate-900 dark:text-white
    content = content.replace(/(?<!dark:)text-white/g, 'text-slate-900 dark:text-white');
    
    // Replace bg-black with bg-white dark:bg-black
    content = content.replace(/(?<!dark:)bg-black/g, 'bg-white dark:bg-black');
    
    // Replace text-gray-400 with text-slate-500 dark:text-gray-400
    content = content.replace(/(?<!dark:)text-gray-400/g, 'text-slate-500 dark:text-gray-400');
    
    // Replace text-gray-300 with text-slate-600 dark:text-gray-300
    content = content.replace(/(?<!dark:)text-gray-300/g, 'text-slate-600 dark:text-gray-300');

    // Replace text-gray-500 with text-slate-400 dark:text-gray-500
    content = content.replace(/(?<!dark:)text-gray-500/g, 'text-slate-400 dark:text-gray-500');

    // Replace border-white/10 with border-slate-200 dark:border-white/10
    content = content.replace(/(?<!dark:)border-white\/10/g, 'border-slate-200 dark:border-white/10');
    
    // Replace border-white/5 with border-slate-200 dark:border-white/5
    content = content.replace(/(?<!dark:)border-white\/5/g, 'border-slate-200 dark:border-white/5');

    // Replace bg-white/5 with bg-slate-100 dark:bg-white/5
    content = content.replace(/(?<!dark:)bg-white\/5/g, 'bg-slate-100 dark:bg-white/5');
    
    // Replace bg-white/10 with bg-slate-200 dark:bg-white/10
    content = content.replace(/(?<!dark:)bg-white\/10/g, 'bg-slate-200 dark:bg-white/10');

    fs.writeFileSync(file, content);
    console.log('Processed', file);
});
