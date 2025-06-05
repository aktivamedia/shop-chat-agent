/**
 * Shop AI Chat - Client-side implementation
 *
 * This module handles the chat interface for the Shopify AI Chat application.
 * It manages the UI interactions, API communication, and message rendering.
 */
(function () {
  "use strict";

  // Generate or retrieve a session ID for this browser session/tab
  const getOrCreateSessionId = () => {
    let sessionId = sessionStorage.getItem("shopAiSessionId");
    if (!sessionId) {
      sessionId =
        "sess_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      sessionStorage.setItem("shopAiSessionId", sessionId);
    }
    return sessionId;
  };
  const shopAiSessionId = getOrCreateSessionId();

  /**
   * Application namespace to prevent global scope pollution
   */
  const ShopAIChat = {
    /**
     * Message storage in sessionStorage for persistence within tab
     */
    sessionMessages: {
      getKey: () => `shopAiChatHistory_${shopAiSessionId}`,
      get: function () {
        try {
          return JSON.parse(sessionStorage.getItem(this.getKey())) || [];
        } catch {
          return [];
        }
      },
      set: function (messages) {
        sessionStorage.setItem(this.getKey(), JSON.stringify(messages));
      },
      add: function (message) {
        const messages = this.get();
        messages.push(message);
        this.set(messages);
      },
      clear: function () {
        sessionStorage.removeItem(this.getKey());
      },
    },

    /**
     * UI-related elements and functionality
     */
    UI: {
      elements: {},
      isMobile: false,

      /**
       * Initialize UI elements and event listeners
       * @param {HTMLElement} container - The main container element
       */
      init: function (container) {
        if (!container) return;

        // Cache DOM elements
        this.elements = {
          container: container,
          chatBubble: container.querySelector(".shop-ai-chat-bubble"),
          chatWindow: container.querySelector(".shop-ai-chat-window"),
          closeButton: container.querySelector(".shop-ai-chat-close"),
          chatInput: container.querySelector(".shop-ai-chat-input input"),
          sendButton: container.querySelector(".shop-ai-chat-send"),
          messagesContainer: container.querySelector(".shop-ai-chat-messages"),
        };

        // Detect mobile device
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Set up event listeners
        this.setupEventListeners();

        // Fix for iOS Safari viewport height issues
        if (this.isMobile) {
          this.setupMobileViewport();
        }
      },

      /**
       * Set up all event listeners for UI interactions
       */
      setupEventListeners: function () {
        const {
          chatBubble,
          closeButton,
          chatInput,
          sendButton,
          messagesContainer,
        } = this.elements;

        // Toggle chat window visibility
        chatBubble.addEventListener("click", () => this.toggleChatWindow());

        // Close chat window
        closeButton.addEventListener("click", () => this.closeChatWindow());

        // Send message when pressing Enter in input
        chatInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter" && chatInput.value.trim() !== "") {
            ShopAIChat.Message.send(chatInput, messagesContainer);

            // On mobile, handle keyboard
            if (this.isMobile) {
              chatInput.blur();
              setTimeout(() => chatInput.focus(), 300);
            }
          }
        });

        // Send message when clicking send button
        sendButton.addEventListener("click", () => {
          if (chatInput.value.trim() !== "") {
            ShopAIChat.Message.send(chatInput, messagesContainer);

            // On mobile, focus input after sending
            if (this.isMobile) {
              setTimeout(() => chatInput.focus(), 300);
            }
          }
        });

        // Handle window resize to adjust scrolling
        window.addEventListener("resize", () => this.scrollToBottom());

        // Add global click handler for auth links
        document.addEventListener("click", function (event) {
          if (
            event.target &&
            event.target.classList.contains("shop-auth-trigger")
          ) {
            event.preventDefault();
            if (window.shopAuthUrl) {
              ShopAIChat.Auth.openAuthPopup(window.shopAuthUrl);
            }
          }
        });
      },

      /**
       * Setup mobile-specific viewport adjustments
       */
      setupMobileViewport: function () {
        const setViewportHeight = () => {
          document.documentElement.style.setProperty(
            "--viewport-height",
            `${window.innerHeight}px`,
          );
        };
        window.addEventListener("resize", setViewportHeight);
        setViewportHeight();
      },

      /**
       * Toggle chat window visibility
       */
      toggleChatWindow: function () {
        const { chatWindow, chatInput } = this.elements;

        chatWindow.classList.toggle("active");

        if (chatWindow.classList.contains("active")) {
          // On mobile, prevent body scrolling and delay focus
          if (this.isMobile) {
            document.body.classList.add("shop-ai-chat-open");
            setTimeout(() => chatInput.focus(), 500);
          } else {
            chatInput.focus();
          }
          // Always scroll messages to bottom when opening
          this.scrollToBottom();
        } else {
          // Remove body class when closing
          document.body.classList.remove("shop-ai-chat-open");
        }
      },

      /**
       * Close chat window
       */
      closeChatWindow: function () {
        const { chatWindow, chatInput } = this.elements;

        chatWindow.classList.remove("active");

        // On mobile, blur input to hide keyboard and enable body scrolling
        if (this.isMobile) {
          chatInput.blur();
          document.body.classList.remove("shop-ai-chat-open");
        }
      },

      /**
       * Scroll messages container to bottom
       */
      scrollToBottom: function () {
        const { messagesContainer } = this.elements;
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      },

      /**
       * Show typing indicator in the chat
       */
      showTypingIndicator: function () {
        const { messagesContainer } = this.elements;

        const typingIndicator = document.createElement("div");
        typingIndicator.classList.add("shop-ai-typing-indicator");
        typingIndicator.innerHTML = "<span></span><span></span><span></span>";
        messagesContainer.appendChild(typingIndicator);
        this.scrollToBottom();
      },

      /**
       * Remove typing indicator from the chat
       */
      removeTypingIndicator: function () {
        const { messagesContainer } = this.elements;

        const typingIndicator = messagesContainer.querySelector(
          ".shop-ai-typing-indicator",
        );
        if (typingIndicator) {
          typingIndicator.remove();
        }
      },

      /**
       * Display product results in the chat
       * @param {Array} products - Array of product data objects
       */
      displayProductResults: function (products) {
        const { messagesContainer } = this.elements;

        // Create a wrapper for the product section
        const productSection = document.createElement("div");
        productSection.classList.add("shop-ai-product-section");
        messagesContainer.appendChild(productSection);

        // Add a header for the product results
        const header = document.createElement("div");
        header.classList.add("shop-ai-product-header");
        header.innerHTML = "<h4>Top Matching Products</h4>";
        productSection.appendChild(header);

        // Create the product grid container
        const productsContainer = document.createElement("div");
        productsContainer.classList.add("shop-ai-product-grid");
        productSection.appendChild(productsContainer);

        if (!products || !Array.isArray(products) || products.length === 0) {
          const noProductsMessage = document.createElement("p");
          noProductsMessage.textContent = "No products found";
          noProductsMessage.style.padding = "10px";
          productsContainer.appendChild(noProductsMessage);
        } else {
          products.forEach((product) => {
            const productCard = ShopAIChat.Product.createCard(product);
            productsContainer.appendChild(productCard);
          });
        }

        this.scrollToBottom();
      },
    },

    /**
     * Message handling and display functionality
     */
    Message: {
      /**
       * Send a message to the API
       * @param {HTMLInputElement} chatInput - The input element
       * @param {HTMLElement} messagesContainer - The messages container
       */
      send: async function (chatInput, messagesContainer) {
        const userMessage = chatInput.value.trim();
        const conversationId = sessionStorage.getItem("shopAiConversationId");

        // Add user message to chat
        this.add(userMessage, "user", messagesContainer);

        // Clear input
        chatInput.value = "";

        // Show typing indicator
        ShopAIChat.UI.showTypingIndicator();

        try {
          ShopAIChat.API.streamResponse(
            userMessage,
            conversationId,
            messagesContainer,
          );
        } catch (error) {
          console.error("Error communicating with Claude API:", error);
          ShopAIChat.UI.removeTypingIndicator();
          this.add(
            "Sorry, I couldn't process your request at the moment. Please try again later.",
            "assistant",
            messagesContainer,
          );
        }
      },

      /**
       * Add a message to the chat
       * @param {string} text - Message content
       * @param {string} sender - Message sender ('user' or 'assistant')
       * @param {HTMLElement} messagesContainer - The messages container
       * @returns {HTMLElement} The created message element
       */
      add: function (text, sender, messagesContainer, saveToSession = true) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("shop-ai-message", sender);

        if (sender === "assistant") {
          messageElement.dataset.rawText = text;
          ShopAIChat.Formatting.formatMessageContent(messageElement);
          // Convert product JSON blocks to HTML
          const productsJson = ShopAIChat.Formatting.extractProductsJsonBlock(
            messageElement.dataset.rawText,
          );
          if (productsJson && Array.isArray(productsJson)) {
            // Create a product results section
            ShopAIChat.UI.displayProductResults(productsJson);
          }
        } else {
          messageElement.textContent = text;
        }

        messagesContainer.appendChild(messageElement);
        ShopAIChat.UI.scrollToBottom();

        // Save to sessionStorage as well, only if saveToSession is true
        if (saveToSession) {
          ShopAIChat.sessionMessages.add({
            role: sender,
            content: text,
            timestamp: Date.now(),
          });
        }

        return messageElement;
      },
    },

    /**
     * Text formatting and markdown handling
     */
    Formatting: {
      /**
       * Format message content with markdown and links
       * @param {HTMLElement} element - The element to format
       */
      formatMessageContent: function (element) {
        if (!element || !element.dataset.rawText) return;

        const rawText = element.dataset.rawText;

        // Process the text with various Markdown features
        let processedText = rawText;

        // Detect and render code blocks (e.g., ```json ... ```)
        processedText = processedText.replace(
          /```(\w+)?\n?([\s\S]*?)```/g,
          (match, lang, code) => {
            // Escape HTML special chars inside code blocks
            const escapedCode = code
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            // Add language class if present for syntax highlight libraries (like Prism.js)
            const languageClass = lang ? ` class="language-${lang}"` : "";
            return `<pre><code${languageClass} tabindex="0" aria-label="Code block">${escapedCode}</code></pre>`;
          },
        );

        // Remove '!' from image markdown to treat as normal links
        processedText = processedText.replace(/!\[([^\]]*)\]/g, "[$1]");
        // Process Markdown links
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        processedText = processedText.replace(
          markdownLinkRegex,
          (match, text, url) => {
            // Check if it's an auth URL
            if (
              url.includes("shopify.com/authentication") &&
              (url.includes("oauth/authorize") ||
                url.includes("authentication"))
            ) {
              // Store the auth URL in a global variable for later use - this avoids issues with onclick handlers
              window.shopAuthUrl = url;
              // Just return normal link that will be handled by the document click handler
              return (
                '<a href="#auth" class="shop-auth-trigger">' + text + "</a>"
              );
            }
            // If it's a checkout link, replace the text
            else if (url.includes("/cart") || url.includes("checkout")) {
              return (
                '<a href="' +
                url +
                '" target="_blank" rel="noopener noreferrer">click here to proceed to checkout</a>'
              );
            }
            // If it's an image link (.webp, .png, .jpg), render as image thumbnail
            else if (url.match(/\.(webp|png|jpg)(\?.*)?$/i)) {
              return (
                '<img src="' +
                url +
                '&width=400" alt="' +
                text +
                '" class="shop-ai-thumbnail-image" />'
              );
            } else {
              // For normal links, preserve the original text
              return (
                '<a href="' +
                url +
                '" target="_blank" rel="noopener noreferrer">' +
                text +
                "</a>"
              );
            }
          },
        );
        // Convert text to HTML with proper list handling
        processedText = this.convertMarkdownToHtml(processedText);

        // Apply the formatted HTML
        element.innerHTML = processedText;
      },

      extractProductsJsonBlock: function (text) {
        const jsonBlockRegex = /```json\s*([\s\S]*?)```/i;
        const match = text.match(jsonBlockRegex);
        if (match) {
          try {
            // Parse and return the JSON array
            return JSON.parse(match[1]);
          } catch (e) {
            console.warn("Invalid JSON code block in AI response", e);
          }
        }
        return null;
      },

      /**
       * Convert Markdown text to HTML with list support
       * @param {string} text - Markdown text to convert
       * @returns {string} HTML content
       */
      convertMarkdownToHtml: function (text) {
        // Convert headings
        text = text.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
        text = text.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
        text = text.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
        text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
        text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
        text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");

        // Convert bold
        text = text.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

        // Convert italic
        text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Convert images
        text = text.replace(
          /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
          function (match, alt, src, title) {
            const titleAttr = title ? ` title="${title}"` : "";
            return `<img src="${src}" alt="${alt}"${titleAttr} style="max-width:100%;border-radius:10px;margin:10px 0;" aria-label="${alt}">`;
          },
        );

        // Convert links (after images to avoid conflict)
        text = text.replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          function (match, text, url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          },
        );

        // List parsing (improved for blocks)
        const lines = text.split("\n");
        let htmlContent = "";
        let inOl = false;
        let inLi = false;
        let inUl = false;
        let startNumber = 1;

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].replace(/^ {0,3}/, ""); // Remove up to 3 leading spaces

          // Ordered list item (e.g., '1. Title')
          const orderedMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);

          // Nested unordered list item (indented, e.g., '- description')
          const nestedUnorderedMatch = line.match(/^-\s+(.*)/);

          if (orderedMatch) {
            // Close previous list elements if needed
            if (!inOl) {
              htmlContent += `<ol start="${parseInt(orderedMatch[1], 10)}">`;
              inOl = true;
            }
            if (inLi) {
              if (inUl) {
                htmlContent += "</ul>";
                inUl = false;
              }
              htmlContent += "</li>";
            }
            // If the content contains <img, add style to <li>
            if (orderedMatch[2].includes("<img")) {
              htmlContent += `<li style="list-style-type: none">${orderedMatch[2]}`;
            } else {
              htmlContent += `<li>${orderedMatch[2]}`;
            }
            inLi = true;
          } else if (nestedUnorderedMatch) {
            // Nested unordered list (under a <li>)
            if (!inUl) {
              htmlContent += "<ul>";
              inUl = true;
            }
            // If the content contains <img, add style to <li>
            if (nestedUnorderedMatch[1].includes("<img")) {
              htmlContent += `<li style="list-style-type: none">${nestedUnorderedMatch[1]}</li>`;
            } else {
              htmlContent += `<li>${nestedUnorderedMatch[1]}</li>`;
            }
          } else if (line.trim() === "") {
            // Empty line: just continue
            continue;
          } else {
            // Paragraph, image, or other text outside list
            // Close lists if open
            if (inUl) {
              htmlContent += "</ul>";
              inUl = false;
            }
            if (inLi) {
              htmlContent += "</li>";
              inLi = false;
            }
            if (inOl) {
              htmlContent += "</ol>";
              inOl = false;
            }
            // Strip leading '!' from HTML img tags
            if (line.startsWith("<img")) {
              htmlContent += line;
            } else {
              htmlContent += `<p>${line}</p>`;
            }
          }
        }
        // Close any remaining open tags
        if (inUl) htmlContent += "</ul>";
        if (inLi) htmlContent += "</li>";
        if (inOl) htmlContent += "</ol>";

        return htmlContent;
      },
    },

    /**
     * API communication and data handling
     */
    API: {
      /**
       * Stream a response from the API
       * @param {string} userMessage - User's message text
       * @param {string} conversationId - Conversation ID for context
       * @param {HTMLElement} messagesContainer - The messages container
       */
      streamResponse: function (
        userMessage,
        conversationId,
        messagesContainer,
      ) {
        let currentMessageElement = document.createElement("div");
        currentMessageElement.classList.add("shop-ai-message", "assistant");
        currentMessageElement.textContent = "";
        currentMessageElement.dataset.rawText = "";
        messagesContainer.appendChild(currentMessageElement);

        // Build the EventSource URL with query params
        const params = new URLSearchParams();
        params.append("message", userMessage);
        if (conversationId && conversationId !== "null")
          params.append("responseId", conversationId);
        if (window.shopId) params.append("userId", window.shopId);
        // Real URL should be used in production https://og-ai-chatbot-production.up.railway.app/agent/stream?
        // for local testing use http://0.0.0.0:8000/agent/stream
        const sseUrl = `https://og-ai-chatbot-production.up.railway.app/agent/stream?${params.toString()}`;
        // const sseUrl = `http://0.0.0.0:8000/agent/stream?${params.toString()}`;
        const es = new EventSource(sseUrl);

        let hasReceivedChunk = false;

        es.addEventListener("response.chunk", (e) => {
          if (!hasReceivedChunk) {
            ShopAIChat.UI.removeTypingIndicator();
            hasReceivedChunk = true;
          }
          const data = JSON.parse(e.data);
          const chunk = data.delta || data.chunk;
          currentMessageElement.dataset.rawText += chunk;
          // Render partial markdown as HTML
          ShopAIChat.Formatting.formatMessageContent(currentMessageElement);
          ShopAIChat.UI.scrollToBottom();
        });

        es.addEventListener("response.done", (e) => {
          ShopAIChat.Formatting.formatMessageContent(currentMessageElement);
          // Convert product JSON blocks to HTML
          const productsJson = ShopAIChat.Formatting.extractProductsJsonBlock(
            currentMessageElement.dataset.rawText,
          );
          if (productsJson && Array.isArray(productsJson)) {
            // Create a product results section
            ShopAIChat.UI.displayProductResults(productsJson);
          }
          ShopAIChat.UI.scrollToBottom();
          ShopAIChat.UI.removeTypingIndicator();
          es.close();

          const data = JSON.parse(e.data);
          if (data.responseId) {
            sessionStorage.setItem("shopAiConversationId", data.responseId);
          }

          // Save assistant message to sessionStorage
          // (use rawText so it's unformatted, matching how user messages are stored)
          ShopAIChat.sessionMessages.add({
            role: "assistant",
            content:
              currentMessageElement.dataset.rawText ||
              currentMessageElement.textContent ||
              "",
            timestamp: Date.now(),
          });
        });

        es.addEventListener("error", (e) => {
          ShopAIChat.UI.removeTypingIndicator();
          currentMessageElement.textContent =
            "Sorry, I couldn't process your request. Please try again later.";
          es.close();
        });

        es.addEventListener("guardrail.triggered", (e) => {
          if (currentMessageElement) {
            // Replace the message content with the guardrail message
            const data = JSON.parse(e.data);
            currentMessageElement.dataset.rawText =
              data.message ||
              "Sorry, your message could not be processed due to policy restrictions.";
            ShopAIChat.Formatting.formatMessageContent(currentMessageElement);
            ShopAIChat.UI.scrollToBottom();
          }
          es.close();
        });

        // Add more event listeners as needed (auth_required, guardrail.triggered, etc.)
      },

      /**
       * Fetch chat history from the server
       * @param {string} conversationId - Conversation ID
       * @param {HTMLElement} messagesContainer - The messages container
       */
      fetchChatHistory: async function (conversationId, messagesContainer) {
        try {
          // Show a loading message
          const loadingMessage = document.createElement("div");
          loadingMessage.classList.add("shop-ai-message", "assistant");
          loadingMessage.textContent = "Loading conversation history...";
          messagesContainer.appendChild(loadingMessage);

          // Fetch history from the server
          const historyUrl = `https://localhost:3458/chat?history=true&conversation_id=${encodeURIComponent(conversationId)}`;
          console.log("Fetching history from:", historyUrl);

          const response = await fetch(historyUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            mode: "cors",
          });

          if (!response.ok) {
            console.error(
              "History fetch failed:",
              response.status,
              response.statusText,
            );
            throw new Error("Failed to fetch chat history: " + response.status);
          }

          const data = await response.json();

          // Remove loading message
          messagesContainer.removeChild(loadingMessage);

          // No messages, show welcome message
          if (!data.messages || data.messages.length === 0) {
            const welcomeMessage =
              window.shopChatConfig?.welcomeMessage ||
              "👋 Hi there! How can I help you today?";
            ShopAIChat.Message.add(
              welcomeMessage,
              "assistant",
              messagesContainer,
            );
            return;
          }

          // Add messages to the UI - filter out tool results
          data.messages.forEach((message) => {
            // Handle tool results (stored as JSON strings)
            if (message.role === "user" && message.content.startsWith("{")) {
              try {
                const toolData = JSON.parse(message.content);
                if (toolData.type === "tool_result") {
                  // Skip tool result messages entirely
                  return;
                }
              } catch (e) {
                // Not valid JSON, treat as regular message
              }
            }

            // Regular message
            ShopAIChat.Message.add(
              message.content,
              message.role,
              messagesContainer,
            );
          });

          // Scroll to bottom
          ShopAIChat.UI.scrollToBottom();
        } catch (error) {
          console.error("Error fetching chat history:", error);

          // Remove loading message if it exists
          const loadingMessage = messagesContainer.querySelector(
            ".shop-ai-message.assistant",
          );
          if (
            loadingMessage &&
            loadingMessage.textContent === "Loading conversation history..."
          ) {
            messagesContainer.removeChild(loadingMessage);
          }

          // Show error and welcome message
          const welcomeMessage =
            window.shopChatConfig?.welcomeMessage ||
            "👋 Hi there! How can I help you today?";
          ShopAIChat.Message.add(
            welcomeMessage,
            "assistant",
            messagesContainer,
          );

          // Clear the conversation ID since we couldn't fetch this conversation
          sessionStorage.removeItem("shopAiConversationId");
        }
      },
    },

    /**
     * Authentication-related functionality
     */
    Auth: {
      /**
       * Opens an authentication popup window
       * @param {string|HTMLElement} authUrlOrElement - The auth URL or link element that was clicked
       */
      openAuthPopup: function (authUrlOrElement) {
        let authUrl;
        if (typeof authUrlOrElement === "string") {
          // If a string URL was passed directly
          authUrl = authUrlOrElement;
        } else {
          // If an element was passed
          authUrl = authUrlOrElement.getAttribute("data-auth-url");
          if (!authUrl) {
            console.error("No auth URL found in element");
            return;
          }
        }

        // Open the popup window centered in the screen
        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2 + window.screenX;
        const top = (window.innerHeight - height) / 2 + window.screenY;

        const popup = window.open(
          authUrl,
          "ShopifyAuth",
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
        );

        // Focus the popup window
        if (popup) {
          popup.focus();
        } else {
          // If popup was blocked, show a message
          alert(
            "Please allow popups for this site to authenticate with Shopify.",
          );
        }

        // Start polling for token availability
        const conversationId = sessionStorage.getItem("shopAiConversationId");
        if (conversationId) {
          const messagesContainer = document.querySelector(
            ".shop-ai-chat-messages",
          );

          // Add a message to indicate authentication is in progress
          ShopAIChat.Message.add(
            "Authentication in progress. Please complete the process in the popup window.",
            "assistant",
            messagesContainer,
          );

          this.startTokenPolling(conversationId, messagesContainer);
        }
      },

      /**
       * Start polling for token availability
       * @param {string} conversationId - Conversation ID
       * @param {HTMLElement} messagesContainer - The messages container
       */
      startTokenPolling: function (conversationId, messagesContainer) {
        if (!conversationId) return;

        console.log("Starting token polling for conversation:", conversationId);
        const pollingId = "polling_" + Date.now();
        sessionStorage.setItem("shopAiTokenPollingId", pollingId);

        let attemptCount = 0;
        const maxAttempts = 30;

        const poll = async () => {
          if (sessionStorage.getItem("shopAiTokenPollingId") !== pollingId) {
            console.log(
              "Another polling session has started, stopping this one",
            );
            return;
          }

          if (attemptCount >= maxAttempts) {
            console.log("Max polling attempts reached, stopping");
            return;
          }

          attemptCount++;

          try {
            const tokenUrl =
              "https://localhost:3458/auth/token-status?conversation_id=" +
              encodeURIComponent(conversationId);
            const response = await fetch(tokenUrl);

            if (!response.ok) {
              throw new Error("Token status check failed: " + response.status);
            }

            const data = await response.json();

            if (data.status === "authorized") {
              console.log("Token available, resuming conversation");
              const message = sessionStorage.getItem("shopAiLastMessage");

              if (message) {
                sessionStorage.removeItem("shopAiLastMessage");
                setTimeout(() => {
                  ShopAIChat.Message.add(
                    "Authorization successful! I'm now continuing with your request.",
                    "assistant",
                    messagesContainer,
                  );
                  ShopAIChat.API.streamResponse(
                    message,
                    conversationId,
                    messagesContainer,
                  );
                }, 500);
              }

              sessionStorage.removeItem("shopAiTokenPollingId");
              return;
            }

            console.log("Token not available yet, polling again in 10s");
            setTimeout(poll, 10000);
          } catch (error) {
            console.error("Error polling for token status:", error);
            setTimeout(poll, 10000);
          }
        };

        setTimeout(poll, 2000);
      },
    },

    /**
     * Product-related functionality
     */
    Product: {
      /**
       * Create a product card element
       * @param {Object} product - Product data
       * @returns {HTMLElement} Product card element
       */
      createCard: function (product) {
        const card = document.createElement("div");
        card.classList.add("shop-ai-product-card");

        // Create image container
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("shop-ai-product-image");

        // Add product image or placeholder
        const image = document.createElement("img");
        image.src =
          product.image_url + "&width=400" ||
          "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
        image.alt = product.title;
        image.onerror = function () {
          // If image fails to load, use a fallback placeholder
          this.src =
            "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
        };
        imageContainer.appendChild(image);
        card.appendChild(imageContainer);

        // Add product info
        const info = document.createElement("div");
        info.classList.add("shop-ai-product-info");

        // Add product title
        const title = document.createElement("h3");
        title.classList.add("shop-ai-product-title");
        title.textContent = product.title;

        // If product has a URL, make the title a link
        if (product.url) {
          const titleLink = document.createElement("a");
          titleLink.href = product.url;
          titleLink.target = "_blank";
          titleLink.textContent = product.title;
          title.textContent = "";
          title.appendChild(titleLink);
        }

        info.appendChild(title);

        // Add product price
        const price = document.createElement("p");
        price.classList.add("shop-ai-product-price");
        price.textContent = product.price;
        info.appendChild(price);

        // Add add-to-cart button
        const button = document.createElement("button");
        button.classList.add("shop-ai-add-to-cart");
        button.textContent = "Add to Cart";
        button.dataset.variantId = product.id;

        // Add click handler for the button
        button.addEventListener("click", function () {
          // add loading state
          button.disabled = true;
          button.textContent = "Adding...";
          // add by variant ID to cart
          const variantId = this.dataset.variantId;
          const data = {
            items: [
              {
                id: variantId,
                quantity: 1,
              },
            ],
          };

          if (
            window.Shopify &&
            window.Shopify.routes &&
            window.Shopify.routes.root
          ) {
            fetch(window.Shopify.routes.root + "cart/add.js", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            })
              .then((response) => response.json())
              .then((result) => {
                console.log("Success:", result);
                // Reset button state
                button.disabled = false;
                button.textContent = "Add to Cart";
                // Send cart update event this specific for original grain client adjust as needed
                publish(PUB_SUB_EVENTS.cartUpdate, {
                  source: "chat-ai-add-to-cart",
                  productVariantId: result.id,
                  cartData: result,
                });
              })
              .catch((error) => {
                console.error("Error:", error);
                // Reset button state on error as well
                button.disabled = false;
                button.textContent = "Add to Cart";
              });
          } else {
            console.error("Shopify object not found on window.");
            button.disabled = false;
            button.textContent = "Add to Cart";
          }
        });

        info.appendChild(button);
        card.appendChild(info);

        return card;
      },
    },

    /**
     * Initialize the chat application
     */
    init: function () {
      // Initialize UI
      const container = document.querySelector(".shop-ai-chat-container");
      if (!container) return;

      this.UI.init(container);

      // Load chat history from sessionStorage first
      const sessionMsgs = this.sessionMessages.get();
      if (sessionMsgs.length > 0) {
        sessionMsgs.forEach((msg) => {
          this.Message.add(
            msg.content,
            msg.role,
            this.UI.elements.messagesContainer,
            false,
          );
        });
        this.UI.scrollToBottom();
        return;
      }

      // Check for existing conversation
      const conversationId = sessionStorage.getItem("shopAiConversationId");

      if (conversationId) {
        // Fetch conversation history
        this.API.fetchChatHistory(
          conversationId,
          this.UI.elements.messagesContainer,
        );
      } else {
        // No previous conversation, show welcome message
        const welcomeMessage =
          window.shopChatConfig?.welcomeMessage ||
          "👋 Hi there! How can I help you today?";
        this.Message.add(
          welcomeMessage,
          "assistant",
          this.UI.elements.messagesContainer,
        );
      }
    },
  };

  // Initialize the application when DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    ShopAIChat.init();
  });
})();
