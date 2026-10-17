import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeAllowedMessageUrl, renderMessageWithAllowedLinks } from './allowedMessageLinks';

test('allows signup links on both supported hostnames', () => {
  assert.equal(
    normalizeAllowedMessageUrl('https://telegramas.cc/signup?ref=000123'),
    'https://telegramas.cc/signup?ref=000123'
  );
  assert.equal(
    normalizeAllowedMessageUrl('https://www.telegramas.cc/signup?ref=123456'),
    'https://www.telegramas.cc/signup?ref=123456'
  );
});

test('allows both supported hostnames without a signup path', () => {
  assert.equal(normalizeAllowedMessageUrl('https://telegramas.cc'), 'https://telegramas.cc/');
  assert.equal(normalizeAllowedMessageUrl('https://www.telegramas.cc'), 'https://www.telegramas.cc/');
});

test('normalizes the signup link typed without a slash after the hostname', () => {
  assert.equal(
    normalizeAllowedMessageUrl('https://telegramas.ccsignup/?ref=6DK4'),
    'https://telegramas.cc/signup/?ref=6DK4'
  );
});

test('does not allow unrelated or insecure hostnames', () => {
  assert.equal(normalizeAllowedMessageUrl('https://telegramas.cc.example.com/signup'), null);
  assert.equal(normalizeAllowedMessageUrl('http://telegramas.cc/signup'), null);
});

test('renders the captured URL as a message preview instead of dropping it', () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      renderMessageWithAllowedLinks('https://www.telegramas.cc/signup?ref=6DK4')
    )
  );

  assert.match(markup, /Teggram X/);
  assert.match(markup, /href="https:\/\/www\.telegramas\.cc\/signup\?ref=6DK4"/);
});
