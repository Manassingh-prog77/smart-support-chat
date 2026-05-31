<script lang="ts">
  import { renderMarkdown } from '$lib/markdown';
  import type { ChatMessage } from '$lib/types';

  export let message: ChatMessage;

  $: isAi = message.sender === 'ai';
  $: rendered = isAi ? renderMarkdown(message.text) : '';
</script>

<article class:ai={isAi} class:user={!isAi} class:pending={message.pending} class="message-row">
  <div class:avatar-ai={isAi} class:avatar-user={!isAi} class="avatar" aria-hidden="true">
    {#if isAi}
      <span class="portrait bot-portrait">
        <span class="hair"></span>
        <span class="eyes"></span>
        <span class="smile"></span>
      </span>
    {:else}
      <span class="portrait user-portrait">
        <span class="hair"></span>
        <span class="eyes"></span>
        <span class="smile"></span>
      </span>
    {/if}
  </div>

  <div class="bubble">
    {#if isAi}
      <div class="markdown">{@html rendered}</div>
    {:else}
      <p>{message.text}</p>
    {/if}
  </div>
</article>
