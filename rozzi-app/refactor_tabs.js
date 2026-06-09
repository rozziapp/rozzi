const fs = require('fs');

const filesToRefactor = [
  'q:/Niratma/Setuna/setuna-app/app/(tabs)/inbox.tsx',
  'q:/Niratma/Setuna/setuna-app/app/(tabs)/index.tsx',
  'q:/Niratma/Setuna/setuna-app/app/chat.tsx'
];

function refactorFile(file) {
  if (!fs.existsSync(file)) {
    console.log('Skipping ' + file + ' (not found)');
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');

  // Skip if already refactored
  if (content.includes('const getStyles = (colors: any) => StyleSheet.create({')) {
    console.log('Already refactored getStyles in ' + file);
    return;
  }

  const isStyles = content.includes('const styles = StyleSheet.create({');
  const isS = content.includes('const s = StyleSheet.create({');
  
  if (isStyles) {
    content = content.replace(/const styles = StyleSheet\.create\(\{/g, 'const getStyles = (colors: any) => StyleSheet.create({');
  } else if (isS) {
    content = content.replace(/const s = StyleSheet\.create\(\{/g, 'const getStyles = (colors: any) => StyleSheet.create({');
  } else {
    console.log('No StyleSheet.create found in ' + file);
    return;
  }

  // Inject useAppTheme and useMemo
  // Look for the default export component
  const exportMatch = content.match(/export default function ([A-Za-z0-9_]+)\([^)]*\) \{/);
  if (exportMatch) {
    const componentName = exportMatch[1];
    
    // Check if it already has styles memoized
    if (!content.includes('React.useMemo(() => getStyles')) {
      // Check if colors is already destructured
      if (content.includes('const { colors')) {
        // Just inject the styles memo after useAppTheme
        content = content.replace(/const \{ colors[^}]*\} = useAppTheme\(\);/, 'const { colors, colorScheme } = useAppTheme();\n  const ' + (isStyles ? 'styles' : 's') + ' = React.useMemo(() => getStyles(colors), [colors]);');
      } else {
        const injectionStr = `export default function ${componentName}() {\n  const { colors, colorScheme } = useAppTheme();\n  const ${isStyles ? 'styles' : 's'} = React.useMemo(() => getStyles(colors), [colors]);`;
        content = content.replace(exportMatch[0], injectionStr);
      }
    }
  }

  // Check imports
  if (!content.includes('useAppTheme')) {
    content = content.replace(/import { router/g, "import { useAppTheme } from '@/contexts/ThemeContext';\nimport { router");
  }

  fs.writeFileSync(file, content);
  console.log('Refactored ' + file);
}

filesToRefactor.forEach(refactorFile);
