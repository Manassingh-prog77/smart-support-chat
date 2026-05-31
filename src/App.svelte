<script lang="ts">
  import { onMount, tick } from 'svelte';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
  import SendHorizonal from '@lucide/svelte/icons/send-horizonal';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Workflow from '@lucide/svelte/icons/workflow';
  import Zap from '@lucide/svelte/icons/zap';
  import MessageBubble from '$components/MessageBubble.svelte';
  import PromptChips from '$components/PromptChips.svelte';
  import TypingIndicator from '$components/TypingIndicator.svelte';
  import { fetchHistory, sendChatMessage } from '$lib/api';
  import type { ChatMessage } from '$lib/types';

  const STORAGE_KEY = 'spur-chat-session-id';
  const MAX_MESSAGE_CHARS = 2000;

  let messages: ChatMessage[] = [];
  let input = '';
  let sessionId: string | undefined;
  let isSending = false;
  let isLoading = true;
  let notice = '';
  let messageList: HTMLDivElement;
  let composerInput: HTMLTextAreaElement;

  const starterPrompts = [
    'How does Spur live chat work?',
    'Can Spur connect Shopify and WhatsApp?',
    'What can AI agents automate?',
    'Which plan should I start with?',
    'How does human handoff work?',
    'Can Spur answer in 95+ languages?'
  ];

  const greeting = (): ChatMessage => ({
    id: 'greeting',
    sender: 'ai',
    text:
      "Hey, I'm Spur's AI agent. Ask me about AI agents, live chat, WhatsApp automation, integrations, pricing, or setup.",
    createdAt: new Date().toISOString()
  });

  const scrollToBottom = async () => {
    await tick();
    if (messageList) {
      messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
    }
  };

  const resetChat = () => {
    sessionId = undefined;
    localStorage.removeItem(STORAGE_KEY);
    notice = '';
    input = '';
    messages = [greeting()];
    void scrollToBottom();
  };

  const addNotice = (value: string) => {
    notice = value;
    window.setTimeout(() => {
      if (notice === value) notice = '';
    }, 4200);
  };

  $: composerPlaceholder = messages.length > 1 ? 'Ask a follow-up' : 'Ask about Spur';

  const sendMessage = async (value = input) => {
    const text = value.trim();

    if (!text || isSending) {
      composerInput?.focus();
      return;
    }
    if (text.length > MAX_MESSAGE_CHARS) {
      addNotice(`Keep messages under ${MAX_MESSAGE_CHARS} characters.`);
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: `local-${crypto.randomUUID()}`,
      sender: 'user',
      text,
      createdAt: new Date().toISOString(),
      pending: true
    };

    messages = [...messages, optimisticMessage];
    input = '';
    isSending = true;
    notice = '';
    await scrollToBottom();

    try {
      const response = await sendChatMessage(text, sessionId);
      sessionId = response.sessionId;
      localStorage.setItem(STORAGE_KEY, response.sessionId);

      const [savedUserMessage, savedAiMessage] = response.messages ?? [];
      messages = [
        ...messages.filter((message) => message.id !== optimisticMessage.id),
        savedUserMessage ?? { ...optimisticMessage, pending: false, conversationId: response.sessionId },
        savedAiMessage ?? {
          id: `ai-${crypto.randomUUID()}`,
          sender: 'ai',
          text: response.reply,
          conversationId: response.sessionId,
          createdAt: new Date().toISOString()
        }
      ];

      if (response.degraded) {
        addNotice('The AI service is temporarily degraded.');
      }
    } catch (error) {
      messages = messages.map((message) =>
        message.id === optimisticMessage.id ? { ...message, pending: false } : message
      );
      messages = [
        ...messages,
        {
          id: `error-${crypto.randomUUID()}`,
          sender: 'ai',
          text:
            error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again in a moment.',
          createdAt: new Date().toISOString()
        }
      ];
    } finally {
      isSending = false;
      await tick();
      composerInput?.focus();
      await scrollToBottom();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  onMount(async () => {
    const storedSessionId = localStorage.getItem(STORAGE_KEY) ?? undefined;

    if (!storedSessionId) {
      messages = [greeting()];
      isLoading = false;
      await scrollToBottom();
      return;
    }

    try {
      const history = await fetchHistory(storedSessionId);
      sessionId = history.sessionId;
      messages = history.messages.length ? history.messages : [greeting()];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      messages = [greeting()];
    } finally {
      isLoading = false;
      await scrollToBottom();
    }
  });
</script>

<main class="app-shell">
  <header class="topbar" aria-label="Spur">
    <div class="brand-lockup">
      <div class="brand-mark">
        <MessageCircle size={20} />
      </div>
      <span>Spur</span>
    </div>
    <nav aria-label="Product areas">
      <a href="https://www.spurnow.com/en/products/ai-agents" target="_blank" rel="noreferrer">
        AI Agents
      </a>
      <a href="https://www.spurnow.com/en/products/live-chat" target="_blank" rel="noreferrer">
        Live Chat
      </a>
      <a href="https://www.spurnow.com/en/products/whatsapp-marketing" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </nav>
  </header>

  <section class="workspace">
    <aside class="context-panel" aria-label="Spur context">
      <div class="trust-row">
        <span><ShieldCheck size={16} /> Meta Business Partner</span>
        <span>GDPR Compliant</span>
        <span>Shopify Partner</span>
      </div>

      <div class="headline-block">
        <p class="eyebrow">AI-powered customer support</p>
        <h1>Sell More. Support Better. <span>Automate Everything.</span></h1>
        <p class="hero-copy">
          A multi-channel AI agent for website chat, WhatsApp, Instagram, and shared support
          inboxes.
        </p>
      </div>

      <div class="preview-card" aria-hidden="true">
        <div class="mini-widget">
          <div class="mini-header">Your AI Agent</div>
          <div class="mini-body">
            <div class="mini-bubble inbound">My order number is #1013. Can I track it?</div>
            <div class="mini-bubble outbound">
              Order #1013 is fulfilled and should arrive soon. Anything else I can help with?
            </div>
            <div class="mini-bubble inbound small">That's all I needed, thank you!</div>
          </div>
        </div>
      </div>

      <div class="metric-strip">
        <div>
          <strong>70%</strong>
          <span>instant resolution</span>
        </div>
        <div>
          <strong>95+</strong>
          <span>languages</span>
        </div>
        <div>
          <strong>24/7</strong>
          <span>coverage</span>
        </div>
      </div>
    </aside>

    <section class="chat-card" aria-label="Spur AI chat">
      <div class="chat-header">
        <div class="agent-title">
          <div class="header-avatar" aria-hidden="true">
            <span class="portrait bot-portrait">
              <span class="hair"></span>
              <span class="eyes"></span>
              <span class="smile"></span>
            </span>
          </div>
          <div>
            <p>Spur AI Agent</p>
            <span><Zap size={13} /> Online</span>
          </div>
        </div>
        <button class="icon-button" type="button" on:click={resetChat} title="Start a new chat">
          <RefreshCcw size={18} />
        </button>
      </div>

      <div class:empty={!notice} class="notice" role="status">{notice}</div>

      <div bind:this={messageList} class="message-list" aria-live="polite">
        {#if isLoading}
          <div class="loading-state">
            <Workflow size={22} />
            <span>Loading chat</span>
          </div>
        {:else}
          {#each messages as message (message.id)}
            <MessageBubble {message} />
          {/each}

          {#if messages.length <= 1}
            <PromptChips
              prompts={starterPrompts}
              disabled={isSending}
              onPick={(prompt) => sendMessage(prompt)}
            />
          {/if}

          {#if isSending}
            <TypingIndicator />
          {/if}
        {/if}
      </div>

      <form class="composer" on:submit|preventDefault={() => sendMessage()}>
        <textarea
          bind:this={composerInput}
          bind:value={input}
          rows="1"
          maxlength={MAX_MESSAGE_CHARS}
          placeholder={composerPlaceholder}
          aria-label="Message"
          disabled={isSending}
          on:keydown={handleKeydown}
        ></textarea>
        <button
          class="send-button"
          class:empty={!input.trim()}
          type="submit"
          disabled={isSending}
          aria-disabled={!input.trim() || isSending}
          title="Send message"
        >
          <SendHorizonal size={19} />
        </button>
      </form>
    </section>
  </section>
</main>
