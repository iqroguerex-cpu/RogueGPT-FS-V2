(function() {
  "use strict";

  const dom = {
    chatBox: document.getElementById("chat-box"),
    chatForm: document.getElementById("chat-form"),
    messageInput: document.getElementById("message-input"),
    sendBtn: document.getElementById("send-btn"),
    stopBtn: document.getElementById("stop-btn"),
    clearBtn: document.getElementById("clear-btn"),
    themeToggle: document.getElementById("theme-toggle"),
    modelSelector: document.getElementById("model-selector"),
  };

  let abortController = null;

  function scrollToBottom() {
    dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createMessageElement(role, htmlContent) {
    const el = document.createElement("div");
    el.className = `message ${role}`;
    
    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = htmlContent;
    el.appendChild(content);

    const timestamp = document.createElement("span");
    timestamp.className = "timestamp";
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    el.appendChild(timestamp);

    dom.chatBox.appendChild(el);
    scrollToBottom();
    return el;
  }

  function addCopyButtons(messageElement) {
    const preBlocks = messageElement.querySelectorAll("pre");
    preBlocks.forEach(pre => {
      if (pre.parentNode.classList.contains("code-block-wrapper")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      
      const copyButton = document.createElement("button");
      copyButton.className = "copy-btn";
      copyButton.textContent = "Copy";
      wrapper.appendChild(copyButton);

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(pre.querySelector("code").innerText).then(() => {
          copyButton.textContent = "Copied!";
          setTimeout(() => { copyButton.textContent = "Copy"; }, 2000);
        });
      });
    });
  }
  
  function setFormState(isGenerating) {
    dom.messageInput.disabled = isGenerating;
    dom.modelSelector.disabled = isGenerating;
    dom.sendBtn.style.display = isGenerating ? 'none' : 'flex';
    dom.stopBtn.style.display = isGenerating ? 'flex' : 'none';
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const message = dom.messageInput.value.trim();
    const selectedModel = dom.modelSelector.value;
    if (!message || !selectedModel) return;
    
    console.log('Sending message with model:', selectedModel);

    const intro = dom.chatBox.querySelector('.intro');
    if (intro) intro.remove();

    createMessageElement("user", escapeHtml(message).replace(/\n/g, "<br>"));
    dom.messageInput.value = "";
    dom.messageInput.style.height = 'auto';
    
    setFormState(true);
    abortController = new AbortController();

    const aiMessageElement = createMessageElement("ai", '<div class="typing-dots"><span></span><span></span><span></span></div>');
    const aiContentDiv = aiMessageElement.querySelector('.message-content');
    
    let fullResponse = "";
    let isFirstChunk = true; // Flag to track the first data chunk

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, model: selectedModel }),
            signal: abortController.signal,
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Server error: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6);
                    if (dataStr === '[DONE]') {
                      if (abortController.signal.aborted) {
                        fullResponse += "\n\n*Generation stopped.*";
                      }
                      return;
                    }

                    const data = JSON.parse(dataStr);
                    if (data.error) throw new Error(data.error);
                    
                    if (data.content) {
                        // When the first chunk with content arrives, clear the animation
                        if (isFirstChunk) {
                            aiContentDiv.innerHTML = "";
                            isFirstChunk = false;
                        }
                        fullResponse += data.content;
                        aiContentDiv.innerHTML = marked.parse(fullResponse + "▋");
                        scrollToBottom();
                    }
                }
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            fullResponse += "\n\n*Generation stopped.*";
            console.log('Stream stopped by user.');
        } else {
            // Overwrite animation with error message
            aiContentDiv.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
        }
    } finally {
        // If the stream ended cleanly but was empty, ensure dots are cleared.
        if (isFirstChunk) {
            aiContentDiv.innerHTML = "";
        }
        aiContentDiv.innerHTML = marked.parse(fullResponse);
        addCopyButtons(aiMessageElement);
        hljs.highlightAll();
        setFormState(false);
        dom.messageInput.focus();
        abortController = null;
        scrollToBottom();
    }
  }

  function handleThemeToggle() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
  }

  function applySavedTheme() {
    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.add('light-mode');
    }
  }
  
  async function handleClearChat() {
    await fetch('/clear', { method: 'POST' });
    window.location.reload();
  }

  function handleTextareaInput() {
    dom.messageInput.style.height = 'auto';
    dom.messageInput.style.height = `${dom.messageInput.scrollHeight}px`;
  }
  
  async function loadModels() {
    const response = await fetch('/models');
    const models = await response.json();
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        dom.modelSelector.appendChild(option);
    });
  }

  function init() {
    applySavedTheme();
    loadModels();
    
    document.querySelectorAll('.message.ai').forEach(addCopyButtons);
    hljs.highlightAll();

    dom.chatForm.addEventListener("submit", handleFormSubmit);
    dom.clearBtn.addEventListener("click", handleClearChat);
    dom.stopBtn.addEventListener("click", () => abortController?.abort());
    dom.themeToggle.addEventListener("click", handleThemeToggle);

    dom.messageInput.addEventListener('input', handleTextareaInput);
    
    dom.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        dom.chatForm.requestSubmit();
      }
    });
    scrollToBottom();
  }

  init();
})();