import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.use({
  breaks: true,
  gfm: true
});

export const renderMarkdown = (text: string) => {
  const html = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};
