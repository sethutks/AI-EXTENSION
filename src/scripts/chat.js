import { getPrompt } from '../scripts/prompts.js';

// Constants
const INITIAL_SYSTEM_MESSAGE = ``;

class ChatUI {
    constructor() {
        // Grab references
        this.messagesContainer     = document.getElementById('chatMessages');
        //this.inputField            = document.getElementById('chatInput');
        this.sendButton            = document.getElementById('sendMessage');
        this.inspectorButton       = document.getElementById('inspectorButton');
        this.resetButton           = document.getElementById('resetChat');

        // Language / Browser dropdown
        this.languageBindingSelect = document.getElementById('languageBinding');
        this.browserEngineSelect   = document.getElementById('browserEngine');

        // Additional states
        this.selectedDomContent    = null;
        this.isInspecting          = false;
        this.markdownReady         = false;
        this.codeGeneratorType     = 'SELENIUM_JAVA_PAGE_ONLY'; // default 
        this.selectedModel         = '';
        this.selectedProvider      = '';
        
        // Clear existing messages + add initial system message
        this.messagesContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
            </div>
        `;
        this.addMessage(INITIAL_SYSTEM_MESSAGE, 'system');

        // Initialize everything
        this.initialize();
        this.initializeMarkdown();
        this.initializeCodeGeneratorType();
        this.setupDropdowns();
    }

    initialize() {
        // Reset chat
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                this.messagesContainer.innerHTML = '';
                this.addMessage(INITIAL_SYSTEM_MESSAGE, 'system');

                // Reset DOM selection
                this.selectedDomContent = null;
                this.inspectorButton.classList.remove('has-content','active');
                this.inspectorButton.innerHTML = `
                    <i class="fas fa-mouse-pointer"></i>
                    <span>Inspect</span>
                `;
                this.isInspecting = false;
            });
        }

        // Load stored keys
        chrome.storage.sync.get(
          ['groqApiKey','openaiApiKey','selectedModel','selectedProvider'],
          (result) => {
            if (result.groqApiKey)   this.groqAPI   = new GroqAPI(result.groqApiKey);
            if (result.openaiApiKey) this.openaiAPI = new OpenAIAPI(result.openaiApiKey);
            this.selectedModel    = result.selectedModel    || '';
            this.selectedProvider = result.selectedProvider || '';
        });

        // Listen for changes
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.groqApiKey)       this.groqAPI   = new GroqAPI(changes.groqApiKey.newValue);
            if (changes.openaiApiKey)     this.openaiAPI = new OpenAIAPI(changes.openaiApiKey.newValue);
            if (changes.selectedModel)    this.selectedModel = changes.selectedModel.newValue;
            if (changes.selectedProvider) this.selectedProvider = changes.selectedProvider.newValue;
        });

        // Listen for SELECTED_DOM_CONTENT from content.js
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === 'SELECTED_DOM_CONTENT') {
                this.selectedDomContent = msg.content;
                this.inspectorButton.classList.add('has-content');
            }
        });

        // Send button
        this.sendButton.addEventListener('click', () => this.sendMessage());

        // Inspector button
        this.inspectorButton.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) return;

                if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                    console.log('Cannot use inspector on this page');
                    return;
                }

                // Try to inject content script
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['src/content/content.js']
                    });
                } catch (error) {
                    if (!error.message.includes('already been injected')) {
                        throw error;
                    }
                }

                const port = chrome.tabs.connect(tab.id);
                port.postMessage({ type: 'TOGGLE_INSPECTOR', reset: true });

                this.isInspecting = !this.isInspecting;
                this.updateInspectorButtonState();
            } catch (error) {
                console.error('Inspector error:', error);
                this.addMessage('Failed to activate inspector. Please refresh and try again.', 'system');
                this.isInspecting = false;
                this.updateInspectorButtonState();
            }
        });
    }

    // ===================
    // Markdown / Parsing
    // ===================
    initializeMarkdown() {
        const checkLibraries = setInterval(() => {
            if (window.marked && window.Prism) {
                window.marked.setOptions({
                    highlight: (code, lang) => {
                        if (lang && Prism.languages[lang]) {
                            try {
                                return Prism.highlight(code, Prism.languages[lang], lang);
                            } catch (e) {
                                console.error('Prism highlight error:', e);
                                return code;
                            }
                        }
                        return code;
                    },
                    langPrefix: 'language-',
                    breaks: true,
                    gfm: true
                });

                const renderer = new marked.Renderer();
                renderer.code = (code, language) => {
                    // If code is an object, extract the actual code from the text property
                    if (typeof code === 'object') {
                        if (code.text) {
                            code = code.text;
                        } else if (code.raw) {
                            code = code.raw.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
                        } else {
                            code = JSON.stringify(code, null, 2);
                        }
                    }
                    
                    // Clean up the language string
                    const validLanguage = language?.toLowerCase().trim() || 'typescript';
                    
                    let highlighted = code;
                    if (validLanguage && Prism.languages[validLanguage]) {
                        try {
                            highlighted = Prism.highlight(code, Prism.languages[validLanguage], validLanguage);
                        } catch (e) {
                            console.error('Highlighting failed:', e);
                        }
                    }

                    return `<pre class="language-${validLanguage}"><code class="language-${validLanguage}">${highlighted}</code></pre>`;
                };

                marked.setOptions({ renderer });
                this.markdownReady = true;
                clearInterval(checkLibraries);
            }
        }, 100);
    }

    parseMarkdown(content) {
        if (!this.markdownReady) {
            return `<pre>${content}</pre>`;
        }

        // Handle different content formats
        let textContent;
        if (typeof content === 'string') {
            const match = content.match(/^```(\w+)/);
            textContent = content.replace(/^```\w+/, '```');
        } else if (typeof content === 'object') {
            textContent = content.content || 
                         content.message?.content ||
                         content.choices?.[0]?.message?.content ||
                         JSON.stringify(content, null, 2);
        } else {
            textContent = String(content);
        }

        // Clean up and normalize code blocks
        let processedContent = textContent
            .replace(/&#x60;/g, '`')
            .replace(/&grave;/g, '`')
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/```(\w*)/g, '\n```$1\n')
            .replace(/```\s*$/g, '\n```\n')
            .replace(/\n{3,}/g, '\n\n');

        try {
            const renderer = new marked.Renderer();
            renderer.code = (code, language) => {
                if (typeof code === 'object') {
                    if (code.text) {
                        code = code.text;
                    } else if (code.raw) {
                        code = code.raw.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
                    } else {
                        code = JSON.stringify(code, null, 2);
                    }
                }
                
                const validLanguage = language?.toLowerCase().trim() || 'typescript';

                let highlighted = code;
                if (validLanguage && Prism.languages[validLanguage]) {
                    try {
                        highlighted = Prism.highlight(code, Prism.languages[validLanguage], validLanguage);
                    } catch (e) {
                        console.error('Highlighting failed:', e);
                    }
                }

                return `<pre class="language-${validLanguage}"><code class="language-${validLanguage}">${highlighted}</code></pre>`;
            };

            marked.setOptions({ renderer });
            const parsed = marked.parse(processedContent);
            
            setTimeout(() => {
                const codeBlocks = document.querySelectorAll('pre code[class*="language-"]');
                codeBlocks.forEach(block => Prism.highlightElement(block));
            }, 0);

            return parsed;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return `<pre>${textContent}</pre>`;
        }
    }

    // =============
    // Send Message
    // =============
    async sendMessage() {
        let apiRef = null;
        if (this.selectedProvider === 'groq')   apiRef = this.groqAPI;
        else apiRef = this.openaiAPI;

        if (!apiRef) {
            this.addMessage(`Please set your ${this.selectedProvider} API key in the Settings tab.`, 'system');
            return;
        }

        if (!this.selectedDomContent) {
            const { combinedDomSnippet } = await chrome.storage.local.get(['combinedDomSnippet']);
            if (typeof combinedDomSnippet === 'string' && combinedDomSnippet.length > 0) {
                this.selectedDomContent = combinedDomSnippet;
            }
            if (!this.selectedDomContent) {
                this.addMessage('Please select DOM elements first using Inspect.', 'system');
                return;
            }
        }

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const pageUrl = tab?.url || 'unknown';

            let javaGenMode = 'TEST';
            const lang = this.languageBindingSelect.value;
            const eng  = this.browserEngineSelect.value;
            this.codeGeneratorType = this.getPromptKey(lang, eng);

            if (this.codeGeneratorType.includes('SELENIUM_JAVA')) {
                const selectedRadio = document.querySelector('input[name="javaGenerationMode"]:checked');
                if (selectedRadio) javaGenMode = selectedRadio.value;
            }

            const finalSnippet = typeof this.selectedDomContent === 'string'
              ? this.selectedDomContent
              : JSON.stringify(this.selectedDomContent, null, 2);

            const finalPrompt = getPrompt(this.codeGeneratorType, {
                domContent: finalSnippet,
                pageUrl: pageUrl,
                javaMode: javaGenMode
            });

            this.sendButton.disabled = true;
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const response = await apiRef.sendMessage(finalPrompt, this.selectedModel);

            const loader = this.messagesContainer.querySelector('.loading-indicator.active');
            if (loader) loader.remove();

            const messageContent =
                response?.content ||
                response?.message?.content ||
                response?.choices?.[0]?.message?.content ||
                response;

            
            this.addMessageWithMetadata(messageContent, 'assistant');

            this.selectedDomContent = null;
            this.inspectorButton.classList.remove('has-content','active');
            this.inspectorButton.innerHTML = `
                <i class="fas fa-mouse-pointer"></i>
                <span>Inspect</span>
            `;
            this.isInspecting = false;

            if (tab) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_SELECTION' });
                } catch (err) {
                    const port = chrome.tabs.connect(tab.id);
                    port.postMessage({ type: 'CLEAR_SELECTION' });
                    port.disconnect();
                }
            }

        } catch (err) {
            const loader = this.messagesContainer.querySelector('.loading-indicator.active');
            if (loader) loader.remove();
            this.addMessage(`Error: ${err.message}`, 'system');
        } finally {
            this.sendButton.disabled = false;
            this.sendButton.innerHTML = 'Generate';
        }
    }

    // ==============
    // addMessage UI
    // ==============
    addMessage(content, type) {
        if (!content) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${type}-message`;

        if (type === 'system') {
            msgDiv.innerHTML = content;
        } else {
            const markdownDiv = document.createElement('div');
            markdownDiv.className = 'markdown-content';
            markdownDiv.innerHTML = this.parseMarkdown(content);
            msgDiv.appendChild(markdownDiv);
        }
        this.messagesContainer.appendChild(msgDiv);

        if (type === 'user') {
            const loader = document.createElement('div');
            loader.className = 'loading-indicator';
            const genType = 'Selenium';
            loader.innerHTML = `
              <div class="loading-spinner"></div>
              <span class="loading-text">Generating ${genType} Code</span>
            `;
            this.messagesContainer.appendChild(loader);
            setTimeout(() => loader.classList.add('active'), 0);
        }
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        const msgCount = this.messagesContainer.querySelectorAll('.chat-message').length;
        if (msgCount > 1 && this.resetButton) {
            this.resetButton.classList.add('visible');
        }
    }

    addMessageWithMetadata(content, type, metadata) {
        if (type !== 'assistant') {
            this.addMessage(content, type);
            return;
        }

        const container = document.createElement('div');
        container.className = 'assistant-message';

        const mdDiv = document.createElement('div');
        mdDiv.className = 'markdown-content';
        mdDiv.innerHTML = this.parseMarkdown(content);
        container.appendChild(mdDiv);

        const metaContainer = document.createElement('div');
        metaContainer.className = 'message-metadata collapsed';

        const actions = document.createElement('div');
        actions.className = 'message-actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'metadata-toggle';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'metadata-toggle';
        copyBtn.innerHTML = `<i class="fas fa-copy"></i> Copy`;
        copyBtn.onclick = () => {
            const codeBlocks = mdDiv.querySelectorAll('pre code');
            if (codeBlocks.length === 0) {
                copyBtn.innerHTML = `<i class="fas fa-times"></i> No content found`;
                setTimeout(() => { copyBtn.innerHTML = `<i class="fas fa-copy"></i> Copy code`; }, 2000);
                return;
            }
            let combinedCode = Array.from(codeBlocks).map(block => block.textContent.trim()).join('\n\n');
            combinedCode = combinedCode.replace(/^```[\w-]*\n/, '').replace(/\n```$/, '');

            navigator.clipboard.writeText(combinedCode)
                .then(() => {
                    copyBtn.innerHTML = `<i class="fas fa-check"></i> Copied!`;
                    setTimeout(() => { copyBtn.innerHTML = `<i class="fas fa-copy"></i> Copy code`; }, 2000);
                })
                .catch(err => {
                    console.error('Copy failed:', err);
                    copyBtn.innerHTML = `<i class="fas fa-times"></i> Failed to copy`;
                    setTimeout(() => { copyBtn.innerHTML = `<i class="fas fa-copy"></i> Copy code`; }, 2000);
                });
        };
    
        actions.appendChild(toggleBtn);
        actions.appendChild(copyBtn);
        metaContainer.appendChild(actions);
        container.appendChild(metaContainer);
        this.messagesContainer.appendChild(container);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

         // If there's a reset button, show it
         if (this.resetButton) {
            this.resetButton.classList.add('visible');
        }

    }

    // ================
    // Inspector Button
    // ================
    updateInspectorButtonState() {
        if (this.isInspecting) {
            this.inspectorButton.classList.add('active');
            this.inspectorButton.innerHTML = `
                <i class="fas fa-mouse-pointer"></i>
                <span>Stop</span>
            `;
        } else {
            this.inspectorButton.classList.remove('active');
            if (!this.selectedDomContent) {
                this.inspectorButton.classList.remove('has-content');
            }
            this.inspectorButton.innerHTML = `
                <i class="fas fa-mouse-pointer"></i>
                <span>Inspect</span>
            `;
        }
    }

    // ================
    // Dropdown / Setup
    // ================
    setupDropdowns() {
        if (!this.languageBindingSelect || !this.browserEngineSelect) return;

        const updateDropdowns = () => {
            const lang = this.languageBindingSelect.value;
            const eng  = this.browserEngineSelect.value;

            if (lang === 'typescript') {
                this.browserEngineSelect.value = 'playwright';
                const selOpt = this.browserEngineSelect.querySelector('option[value="selenium"]');
                if (selOpt) selOpt.disabled = true;
            } else {
                const selOpt = this.browserEngineSelect.querySelector('option[value="selenium"]');
                if (selOpt) selOpt.disabled = false;
            }

            this.codeGeneratorType = this.getPromptKey(lang, eng);
            chrome.storage.sync.set({ codeGeneratorType: this.codeGeneratorType });
        };

        updateDropdowns();

        this.languageBindingSelect.addEventListener('change', updateDropdowns);
        this.browserEngineSelect.addEventListener('change', updateDropdowns);
    }

    getPromptKey(language, engine) {
        if (language === 'java' && engine === 'selenium') {
          const selectedRadio = document.querySelector('input[name="javaGenerationMode"]:checked');
          if (!selectedRadio) return 'SELENIUM_JAVA_TEST_ONLY';
          if (selectedRadio.value === 'PAGE') return 'SELENIUM_JAVA_PAGE_ONLY';
          if (selectedRadio.value === 'TEST') return 'SELENIUM_JAVA_TEST_ONLY';
        }
        if (language === 'java' && engine === 'playwright') {
            return 'PLAYWRIGHT_JAVA_PAGE_ONLY';
        }

        return 'CUCUMBER_ONLY';
    }

    async initializeCodeGeneratorType() {
        const { codeGeneratorType } = await chrome.storage.sync.get(['codeGeneratorType']);
        if (codeGeneratorType) {
            this.codeGeneratorType = codeGeneratorType;
            const codeGenDrop = document.getElementById('codeGeneratorType');
            if (codeGenDrop) codeGenDrop.value = this.codeGeneratorType;
        }
    }

    // ================
    // Reset Chat
    // ================
    async resetChat() {
        try {
            this.messagesContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                </div>
            `;

            this.selectedDomContent = null;
            this.isInspecting       = false;
            this.markdownReady      = false;

            this.inspectorButton.classList.remove('has-content','active');
            this.inspectorButton.innerHTML = `
                <i class="fas fa-mouse-pointer"></i>
                <span>Inspect</span>
            `;

            this.sendButton.disabled = false;
            this.sendButton.textContent = 'Generate';

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && !tab.url.startsWith('chrome://')) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'CLEANUP' });
                } catch (err) {
                    console.log('Cleanup error:', err);
                }
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['src/content/content.js']
                    });
                } catch (err) {
                    if (!err.message.includes('already been injected')) {
                        console.error('Re-inject error:', err);
                    }
                }
            }
            if (this.resetButton) {
                this.resetButton.classList.remove('visible');
            }

            this.addMessage(INITIAL_SYSTEM_MESSAGE, 'system');

        } catch (err) {
            console.error('Error resetting chat:', err);
            this.addMessage('Error resetting chat. Please close and reopen.', 'system');
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ChatUI();
});
