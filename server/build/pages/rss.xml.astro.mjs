import rss from '@astrojs/rss';
import { g as getCollection, S as SITE } from '../chunks/consts_CHbO495B.mjs';
export { renderers } from '../renderers.mjs';

async function GET(context) {
  const posts = await getCollection("howto");
  const projects = await getCollection("projects");
  const items = [...posts, ...projects];
  items.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
  return rss({
    title: SITE.TITLE,
    description: SITE.DESCRIPTION,
    site: context.site,
    items: items.map((item) => ({
      title: item.data.title,
      description: item.data.summary,
      pubDate: item.data.date,
      link: item.slug.startsWith("howto") ? `/howto/${item.slug}/` : `/projects/${item.slug}/`
    }))
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
