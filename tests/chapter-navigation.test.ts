import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ChapterNavigation } from "../src/components/chapter-navigation.tsx";

function renderNavigation(props: ComponentProps<typeof ChapterNavigation>) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ChapterNavigation, props)));
}

test("chapter navigation exposes labeled links with caller-resolved destinations", () => {
  for (const section of ["novela", "manga"]) {
    const previous = { to: `/${section}/obra/volumen-01/capitulo-02`, title: "El encuentro" };
    const next = { to: `/${section}/obra/volumen-02/capitulo-01`, title: "Otro comienzo" };
    const html = renderNavigation({ previous, next });

    assert.match(html, /^<nav aria-label="Navegación entre capítulos"/);
    assert.ok(html.includes(`href="${previous.to}"`));
    assert.ok(html.includes(`href="${next.to}"`));
    assert.match(html, />Anterior: El encuentro<\/a>/);
    assert.match(html, />Siguiente: Otro comienzo<\/a>/);
    assert.ok(html.indexOf(previous.to) < html.indexOf(next.to));
  }
});

test("first and last chapters retain the empty navigation side without a dead link", () => {
  const destination = { to: "/manga/obra/serie/capitulo-02", title: "El regreso" };
  const first = renderNavigation({ previous: null, next: destination });
  assert.match(first, /<span><\/span><a /);
  assert.match(first, />Siguiente: El regreso<\/a>/);
  assert.equal((first.match(/<a /g) ?? []).length, 1);

  const last = renderNavigation({ previous: destination, next: null });
  assert.match(last, />Anterior: El regreso<\/a><span><\/span><\/nav>$/);
  assert.equal((last.match(/<a /g) ?? []).length, 1);

  const only = renderNavigation({ previous: null, next: null });
  assert.match(only, /<span><\/span><span><\/span><\/nav>$/);
  assert.doesNotMatch(only, /<a /);
});
