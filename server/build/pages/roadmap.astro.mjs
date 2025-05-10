import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_ckp-fZ9W.mjs';
import { g as getCollection, R as ROADMAP } from '../chunks/consts_CHbO495B.mjs';
import { $ as $$PageLayout } from '../chunks/PageLayout_BiBushs7.mjs';
import { $ as $$TopLayout, a as $$BottomLayout } from '../chunks/BottomLayout_B4YPI3z1.mjs';
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const collection = await getCollection("roadmap");
  collection.sort((a, b) => new Date(b.data.dateStart).getTime() - new Date(a.data.dateStart).getTime());
  const roadmap = await Promise.all(
    collection.map(async (item) => {
      const { Content } = await item.render();
      return { ...item, Content };
    })
  );
  function formatWorkDate(input) {
    if (typeof input === "string") return input;
    const month = input.toLocaleDateString("en-US", {
      month: "short"
    });
    const year = new Date(input).getFullYear();
    return `${month} ${year}`;
  }
  return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, { "title": ROADMAP.TITLE, "description": ROADMAP.DESCRIPTION }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "TopLayout", $$TopLayout, {}, { "default": async ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="animate page-heading"> ${ROADMAP.TITLE} </div> ` })} ${renderComponent($$result2, "BottomLayout", $$BottomLayout, {}, { "default": async ($$result3) => renderTemplate` <ul> ${roadmap.map((entry) => renderTemplate`<li class="animate border-b border-black/10 dark:border-white/25 mt-4 py-8 first-of-type:mt-0 first-of-type:pt-0 last-of-type:border-none"> <div class="text-black dark:text-white font-semibold"> ${entry.data.company} </div> <div class="text-sm uppercase"> ${formatWorkDate(entry.data.dateStart)} - ${formatWorkDate(entry.data.dateEnd)} </div> <div class="text-sm font-semibold"> ${entry.data.role} </div> <article class="prose dark:prose-invert"> ${renderComponent($$result3, "entry.Content", entry.Content, {})} </article> </li>`)} </ul> ` })} ` })}`;
}, "/home/deface/Desktop/orbit/src/pages/roadmap/index.astro", void 0);

const $$file = "/home/deface/Desktop/orbit/src/pages/roadmap/index.astro";
const $$url = "/roadmap";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
