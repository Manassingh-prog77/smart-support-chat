<script lang="ts">
  import Sparkles from '@lucide/svelte/icons/sparkles';

  export let prompts: string[] = [];
  export let disabled = false;
  export let onPick: (prompt: string) => void;
</script>

<div class="prompt-chips" aria-label="Suggested prompts">
  {#each prompts as prompt}
    <button type="button" {disabled} on:click={() => onPick(prompt)}>
      <Sparkles size={14} />
      <span>{prompt}</span>
    </button>
  {/each}
</div>
