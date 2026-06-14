/* eslint-disable no-template-curly-in-string */

let isMonacoConfigured = false;

const snippetPlaceholder = (index, fallback = '') => `$${`{${index}${fallback ? `:${fallback}` : ''}}`}`;

const createRange = (model, position) => {
  const word = model.getWordUntilPosition(position);

  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
};

const completionSets = {
  javascript: [
    ['clg', 'console.log(${1:value});', 'Console log snippet'],
    ['fn', 'function ${1:name}(${2:params}) {\n  ${3}\n}', 'Function snippet'],
    ['afn', 'const ${1:name} = (${2:params}) => {\n  ${3}\n};', 'Arrow function snippet'],
    ['forof', 'for (const ${1:item} of ${2:items}) {\n  ${3}\n}', 'for...of loop'],
  ],
  typescript: [
    ['clg', 'console.log(${1:value});', 'Console log snippet'],
    ['interface', 'interface ${1:Name} {\n  ${2:key}: ${3:type};\n}', 'TypeScript interface'],
    ['type', 'type ${1:Name} = {\n  ${2:key}: ${3:type};\n};', 'TypeScript type alias'],
    ['fn', 'function ${1:name}(${2:params}): ${3:void} {\n  ${4}\n}', 'Typed function snippet'],
  ],
  python: [
    ['print', 'print(${1:value})', 'Print value'],
    ['def', 'def ${1:name}(${2:args}):\n    ${3:pass}', 'Function definition'],
    ['class', 'class ${1:Name}:\n    def __init__(self${2:, args}):\n        ${3:pass}', 'Class definition'],
    ['ifmain', 'if __name__ == "__main__":\n    ${1:main()}', 'Python main guard'],
    ['forin', 'for ${1:item} in ${2:items}:\n    ${3:pass}', 'for loop'],
    ['try', 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:error}:\n    ${4:pass}', 'try/except block'],
  ],
  java: [
    ['main', 'public static void main(String[] args) {\n    ${1}\n}', 'Java main method'],
    ['sout', 'System.out.println(${1:value});', 'Print line'],
    ['class', 'public class ${1:Main} {\n    ${2}\n}', 'Java class'],
    ['fori', 'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n    ${3}\n}', 'Indexed for loop'],
    ['try', 'try {\n    ${1}\n} catch (${2:Exception} ${3:e}) {\n    ${4}\n}', 'try/catch block'],
  ],
  cpp: [
    ['main', 'int main() {\n  ${1}\n  return 0;\n}', 'C/C++ main function'],
    ['cout', 'cout << ${1:value} << "\\n";', 'C++ cout line'],
    ['printf', 'printf("${1:%d}\\n"${2:, value});', 'C printf call'],
    ['fori', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n  ${3}\n}', 'Indexed for loop'],
    ['include', '#include <${1:iostream}>', 'Include header'],
  ],
  html: [
    ['html5', '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${1:Document}</title>\n</head>\n<body>\n  ${2}\n</body>\n</html>', 'HTML document'],
    ['div', '<div class="${1:className}">\n  ${2}\n</div>', 'div element'],
    ['button', '<button type="button">${1:Button}</button>', 'button element'],
    ['input', '<input type="${1:text}" name="${2:name}" />', 'input element'],
  ],
  css: [
    ['flex', 'display: flex;\nalign-items: ${1:center};\njustify-content: ${2:center};', 'Flexbox layout'],
    ['grid', 'display: grid;\ngrid-template-columns: repeat(${1:3}, minmax(0, 1fr));\ngap: ${2:16px};', 'Grid layout'],
    ['media', '@media (max-width: ${1:768px}) {\n  ${2}\n}', 'Media query'],
    ['btn', 'border: none;\nborder-radius: ${1:6px};\npadding: ${2:10px 14px};\ncursor: pointer;', 'Button styles'],
  ],
  json: [
    ['object', '{\n  "${1:key}": ${2:value}\n}', 'JSON object'],
    ['array', '[\n  ${1:value}\n]', 'JSON array'],
    ['package', '{\n  "name": "${1:app}",\n  "version": "1.0.0",\n  "scripts": {\n    "start": "${2:command}"\n  }\n}', 'package.json starter'],
  ],
};

const keywords = {
  python: ['and', 'as', 'async', 'await', 'break', 'continue', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'],
  java: ['abstract', 'boolean', 'break', 'case', 'catch', 'class', 'continue', 'default', 'double', 'else', 'extends', 'final', 'for', 'if', 'implements', 'import', 'int', 'interface', 'new', 'private', 'protected', 'public', 'return', 'static', 'String', 'super', 'switch', 'this', 'throw', 'try', 'void', 'while'],
  cpp: ['auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'continue', 'double', 'else', 'float', 'for', 'if', 'include', 'int', 'long', 'namespace', 'private', 'protected', 'public', 'return', 'std', 'string', 'struct', 'switch', 'template', 'using', 'void', 'while'],
};

const toSnippetText = (template) => template.replace(/\$\{(\d+)(?::([^}]+))?\}/g, (_, index, fallback = '') => (
  snippetPlaceholder(index, fallback)
));

const registerCompletionSet = (monaco, language) => {
  const snippets = completionSets[language] || [];
  const languageKeywords = keywords[language] || [];

  monaco.languages.registerCompletionItemProvider(language, {
    triggerCharacters: ['.', '<', '"', "'", '/', '#'],
    provideCompletionItems: (model, position) => {
      const range = createRange(model, position);
      const snippetSuggestions = snippets.map(([label, insertText, documentation]) => ({
        label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: toSnippetText(insertText),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation,
        range,
      }));
      const keywordSuggestions = languageKeywords.map((keyword) => ({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range,
      }));

      return {
        suggestions: [...snippetSuggestions, ...keywordSuggestions],
      };
    },
  });
};

export function setupMonaco(monaco) {
  if (isMonacoConfigured || !monaco?.languages) {
    return;
  }

  isMonacoConfigured = true;

  ['javascript', 'typescript', 'python', 'java', 'cpp', 'html', 'css', 'json'].forEach((language) => {
    registerCompletionSet(monaco, language);
  });
}

export function mapLanguageToMonaco(language) {
  if (typeof language === 'object' && language?.name) {
    return mapLanguageToMonaco(language.name);
  }

  switch (`${language || ''}`.toLowerCase()) {
    case 'js':
    case 'jsx':
    case 'react':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'c++':
    case 'cpp':
    case 'text/x-c++src':
      return 'cpp';
    case 'c':
    case 'text/x-csrc':
      return 'cpp';
    case 'htmlmixed':
      return 'html';
    default:
      return language || 'javascript';
  }
}
