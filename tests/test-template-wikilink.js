// Quick test to see what's happening with template parsing
const content = `---
type: [[restaurant]]
---
# Test`;

const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const match = content.match(frontmatterRegex);

if (match) {
    const frontmatterText = match[1];
    console.log('Frontmatter text:', JSON.stringify(frontmatterText));
    
    const lines = frontmatterText.split('\n');
    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            console.log(`Key: "${key}", Value: "${value}"`);
        }
    }
}
