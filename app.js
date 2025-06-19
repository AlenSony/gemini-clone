const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const chatsContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const suggestions = document.querySelectorAll(".suggestions");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const sendBtn = document.querySelector(".send-btn");
const stopBtn = document.querySelector(".stop-btn");

let userMessage = "";
let isStopped = false;
let isGenerating = false;
let abortController = null;
const chatHistory = [];

const API_KEY = "AIzaSyAX2GDjNsefrcGvHUSncGZozX-rBvAGVBU";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Element creation utility
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Scroll to bottom of chat
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Typing effect for bot response
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    const typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            botMsgDiv.classList.remove("loading");
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
        }
    }, 40);
};

// Suggestions click handling
suggestions.forEach(item => {
    item.addEventListener("click", () => {
        const text = item.querySelector(".text").textContent.trim();
        if (text) {
            promptInput.value = text;
            promptForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
    });
});

// Theme handling
const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggleBtn.querySelector('span').textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
};

// Initialize theme from localStorage or default to dark
const initializeTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
};

// Theme toggle handler
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

// Initialize theme on page load
initializeTheme();

// Add input monitoring
promptInput.addEventListener("input", () => {
    const hasText = promptInput.value.trim().length > 0;
    if (!isGenerating) {
        sendBtn.style.display = hasText ? 'flex' : 'none';
    }
});

// Toggle between send and stop buttons
const toggleButtons = (isGenerating) => {
    const hasText = promptInput.value.trim().length > 0;
    sendBtn.style.display = isGenerating ? 'none' : (hasText ? 'flex' : 'none');
    stopBtn.style.display = isGenerating ? 'flex' : 'none';
};

// Stop button handler
stopBtn.addEventListener("click", () => {
    isStopped = true;
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    toggleButtons(false);
    
    // Add a message indicating the response was stopped
    const lastBotMessage = chatsContainer.querySelector('.bot-message:last-child');
    if (lastBotMessage) {
        const textElement = lastBotMessage.querySelector('.message-text');
        if (textElement) {
            textElement.textContent = "⛔ Response was stopped.";
        }
    }
});

// Generate response from API
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    isGenerating = true;
    toggleButtons(true);

    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    abortController = new AbortController();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: abortController.signal
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .trim();

        typingEffect(responseText, textElement, botMsgDiv);

    } catch (error) {
        if (error.name === "AbortError") {
            textElement.textContent = "⛔ Response was stopped.";
        } else {
            textElement.textContent = "Something went wrong!";
            console.error("API Error:", error);
        }
    } finally {
        isGenerating = false;
        abortController = null;
        toggleButtons(false);
    }
};

// Handle prompt form submit
const handleFormSubmit = (e) => {
    e.preventDefault();
    userMessage = promptInput.value.trim();
    if (!userMessage) return;

    suggestions.forEach(suggestion => suggestion.style.display = "none");
    promptInput.value = "";

    const userMsgHTML = '<p class="message-text"></p>';
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    if (isStopped) {
        isStopped = false;
        return;
    }

    setTimeout(() => {
        const botMsgHTML = `
            <img src="./public/gemini_icon.png" alt="" class="avatar">
            <p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv);
    }, 600);
};

promptForm.addEventListener("submit", handleFormSubmit);
