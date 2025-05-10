import { c as createComponent, m as maybeRenderHead, r as renderComponent, a as renderTemplate, e as renderSlot } from './astro/server_ckp-fZ9W.mjs';
import { a as $$Container } from './PageLayout_BiBushs7.mjs';

const $$TopLayout = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="pt-36 pb-5"> ${renderComponent($$result, "Container", $$Container, { "size": "md" }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })} </div>`;
}, "/home/deface/Desktop/orbit/src/layouts/TopLayout.astro", void 0);

const $$BottomLayout = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="flex-1 py-5"> ${renderComponent($$result, "Container", $$Container, { "size": "md" }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })} </div>`;
}, "/home/deface/Desktop/orbit/src/layouts/BottomLayout.astro", void 0);

export { $$TopLayout as $, $$BottomLayout as a };
