import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { Button, ButtonLink } from "../src/components/button.tsx";

test("actions remain native buttons and do not submit forms by default", () => {
  const html = renderToStaticMarkup(createElement("form", null,
    createElement(Button, { variant: "ghost", size: "icon", shape: "pill", disabled: true, "aria-label": "Cerrar" }, "✕"),
  ));

  assert.match(html, /<button\b[^>]*type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-label="Cerrar"/);
  assert.doesNotMatch(html, /<(?:a|button)\b[^>]*\s(?:variant|size|shape)=/);
});

test("a deliberate submit action preserves native form attributes", () => {
  const html = renderToStaticMarkup(createElement(Button, {
    type: "submit", form: "example-form", name: "action", value: "confirm",
  }, "Confirmar"));

  for (const attribute of ['type="submit"', 'form="example-form"', 'name="action"', 'value="confirm"']) {
    assert.ok(html.includes(attribute));
  }
});

test("navigation remains a React Router link, not a button with a click handler", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/estilos"] },
    createElement(ButtonLink, {
      to: "#tipografia", variant: "outline", size: "sm", shape: "pill", "aria-label": "Ver tipografía",
    }, "Ver tipografía"),
  ));

  assert.match(html, /<a\b[^>]*href="\/estilos#tipografia"/);
  assert.match(html, /aria-label="Ver tipografía"/);
  assert.doesNotMatch(html, /<button\b|\s(?:variant|size|shape|type)=/);
});
