import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "pre", "code", "span", "div", "br", "p", "strong", "em",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
  "a", "img", "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "hr", "del", "sup", "sub",
];

const ALLOWED_ATTR = [
  "class", "style", "href", "src", "alt", "title", "target", "rel",
];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
