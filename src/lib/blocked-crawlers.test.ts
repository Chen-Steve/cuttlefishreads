import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isBlockedCrawlerUserAgent,
  isCrawlerBlockExemptPath,
} from "./blocked-crawlers.ts";

describe("isBlockedCrawlerUserAgent", () => {
  it("blocks Wayback Machine and Internet Archive agents", () => {
    assert.equal(
      isBlockedCrawlerUserAgent(
        "Mozilla/5.0 (Wayback_Machine_Firefox) Gecko/20100101 Firefox/128.0",
      ),
      true,
    );
    assert.equal(
      isBlockedCrawlerUserAgent(
        "Mozilla/5.0 (compatible; archive.org_bot +http://archive.org/details/archive.org_bot)",
      ),
      true,
    );
    assert.equal(isBlockedCrawlerUserAgent("ia_archiver"), true);
    assert.equal(
      isBlockedCrawlerUserAgent("Mozilla/5.0 (compatible; special_archiver/3.3.0)"),
      true,
    );
  });

  it("allows browsers and search crawlers", () => {
    assert.equal(
      isBlockedCrawlerUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
      ),
      false,
    );
    assert.equal(
      isBlockedCrawlerUserAgent(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      ),
      false,
    );
    assert.equal(isBlockedCrawlerUserAgent(""), false);
    assert.equal(isBlockedCrawlerUserAgent(null), false);
  });
});

describe("isCrawlerBlockExemptPath", () => {
  it("lets archive bots read robots.txt", () => {
    assert.equal(isCrawlerBlockExemptPath("/robots.txt"), true);
    assert.equal(isCrawlerBlockExemptPath("/"), false);
    assert.equal(isCrawlerBlockExemptPath("/novels"), false);
  });
});
