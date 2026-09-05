# Bright Data Perplexity Collector v1 backup

Captured: 2026-09-06 WITA

This is the rollback and audit snapshot taken before any development edit. It
contains no credential value.

## Identity and version

- Collector: `c_mtoi7ng2wyqxm8d61`
- Bright Data name: `perplexity.ai`
- Changelog: `Version 1`, `Production version`, `Currently editing`
- Known job: `j_mtoihujw1d3aop3xrf`
- Known job template: `v1 (prod)`
- Batch trigger shown by the authenticated control panel:
  `POST /dca/trigger?collector=c_mtoi7ng2wyqxm8d61&queue_next=1`
- Result read endpoint shown by the control panel: `GET /dca/dataset?id=<job>`

## Interaction code

```javascript
navigate(input.url);



// If there's a cookie consent dialog, we can dismiss it (optional, but helps with cleaner data)
if (el_exists('button:contains("Got it")')) {
    wait_timeout(500);
}

collect(parse());
```

## Parser code

```javascript
// Get the final URL after any redirects
let final_url = new URL(location.href);

// Check for login wall indicators
let login_wall_detected = !!($('input[type="email"]').length ||
                             $('input[type="password"]').length ||
                             $('button:contains("Sign in")').length ||
                             $('button:contains("Log in")').length ||
                             $('a[href*="login"]').length ||
                             $('a[href*="signin"]').length);

// Extract the answer text from the main scrollable container
// The page appears to be a landing page without an actual answer yet
let answer = $('.scrollable-container').text_sane() || null;

// Extract cited sources - look for links that might be sources
let cited_sources = [];

// Look for source citations in various possible locations
$('.scrollable-container a[href^="http"]').each(function() {
    let source_url_text = $(this).attr('href');
    let source_title = $(this).text_sane();

    if (source_url_text && source_title) {
        cited_sources.push({
            source_title: source_title,
            source_url: new URL(source_url_text)
        });
    }
});

return {
    answer: answer,
    cited_sources: cited_sources,
    final_url: final_url,
    login_wall_detected: login_wall_detected
};
```

## Output schema and settings

- `answer`: String
- `cited_sources`: Array
- `final_url`: URL
- `login_wall_detected`: Boolean
- Active scraper: on
- Take screenshots: on
- Worker per stage: on
- Parser in object mode: off
- Auto-fix parser code: on and disabled in the settings UI
- Error mode: `Fail`

## Known job receipt

- Input: one existing Perplexity `/search/<uuid>` URL.
- Stats: one input, one record, zero failed crawls, one page load,
  `42s627ms`, UI spend `$0`.
- Downloaded file: `j_mtoihujw1d3aop3xrf.json` (local evidence, not added to
  the repository)
- Downloaded file SHA-256:
  `f10a5e82f94d92951c625185967efbeb3cebd8e8849e2a69e0301ceb207348b4`
- Crawl inspector output:
  `answer: null`, `cited_sources: []`, input URL equals final URL,
  `login_wall_detected: true`, no crawl error, no children and no attached
  files.

The `$0` UI receipt is historical. It does not guarantee that another run is
free. The current public Scraper Studio pay-as-you-go rate is `$1.50 / 1,000`
page loads, or `$0.0015` per successful page load:
https://brightdata.com/pricing/web-scraper/studio

## Rollback

The control panel shows only Version 1 as the production version. If a
development edit is rejected, restore the interaction/parser blocks above and
do not promote the development version. No production change is authorized by
this backup.

## Unpublished development draft

The authenticated control panel now shows `Version Unpublished draft`. A
second tab reloaded the Collector and verified that the following code is
persisted in the draft. Version 1 remains the production version.

Interaction code:

```javascript
navigate(input.url);

wait_timeout(3000);
collect(parse());
```

The misleading cookie branch was removed. The current Collector is a code
worker, and Bright Data explicitly refused `click()` unless the worker were
changed to a browser worker. That worker change and automatic preview restart
were declined.

Parser code:

```javascript
let final_url = new URL(location.href);

let answer_root = null;
let answer = null;
let answer_selectors = [
    '[data-testid="answer-content"]',
    '[data-testid*="answer"]',
    'main article',
    'main [class*="prose"]',
    '.scrollable-container'
];

answer_selectors.some(function(selector) {
    let best_text = null;
    let best_root = null;
    $(selector).each(function() {
        let candidate_text = $(this).text_sane();
        if (candidate_text && (!best_text || candidate_text.length > best_text.length)) {
            best_text = candidate_text;
            best_root = $(this);
        }
    });
    if (best_text) {
        answer = best_text;
        answer_root = best_root;
        return true;
    }
    return false;
});

let blocking_login_form = !!($('form input[type="email"]').length ||
                              $('form input[type="password"]').length ||
                              $('[role="dialog"] input[type="email"]').length ||
                              $('[role="dialog"] input[type="password"]').length);
let blocking_login_dialog = !!($('[role="dialog"] button:contains("Sign in")').length ||
                                $('[role="dialog"] button:contains("Log in")').length ||
                                $('[aria-modal="true"] button:contains("Sign in")').length ||
                                $('[aria-modal="true"] button:contains("Log in")').length);
let login_wall_detected = !answer && (blocking_login_form || blocking_login_dialog);

let cited_sources = [];
let seen_source_urls = {};
if (answer_root) {
    answer_root.find('a[href^="http"]').each(function() {
        let source_url_text = $(this).attr('href');
        let source_title = $(this).text_sane();
        if (!source_url_text || !source_title) return;

        let source_url = new URL(source_url_text, location.href);
        if (source_url.hostname === 'perplexity.ai' || source_url.hostname.endsWith('.perplexity.ai')) return;
        if (seen_source_urls[source_url.href]) return;

        seen_source_urls[source_url.href] = true;
        cited_sources.push({
            source_title: source_title,
            source_url: source_url
        });
    });
}

return {
    answer: answer,
    cited_sources: cited_sources,
    final_url: final_url,
    login_wall_detected: login_wall_detected
};
```

The draft removes the link-only login-wall false positive, refuses to label a
page blocked when an answer is present, adds ordered answer fallbacks, limits
citations to the selected answer region, removes Perplexity-internal links and
deduplicates external sources.

Saving the first edit caused the IDE to start its built-in Preview automatically
against `https://perplexity.ai/`. It received preview id
`preview_mtolhhbt1sl8gguj6z`, then stopped at the code-worker/`click()`
compatibility prompt. The worker switch and restart were declined. With
`Include test runs` enabled, the Runs page still lists only
`j_mtoihujw1d3aop3xrf`; there is no new `j_*` job, page-load or spend receipt.
No second Preview was started after making the draft code-worker-compatible.

The draft is persisted but not accepted: it has not produced a real answer and
must be run with `version=dev` under the explicit provider-run gate.

## Prepared Browser-worker diagnostic change (not saved)

The development step editor was opened read-only after the draft reload. It
confirms the current value `Worker: Code` and offers `Browser` as the only
alternative. The menu was closed with Cancel; production and development
worker settings remain unchanged.

Bright Data's worker-type documentation says Code worker performs HTTP-style
requests, while dynamic waits/input and browser evidence require Browser
worker. The browser-safe interaction prepared for the same unpublished draft
is:

```javascript
navigate(input.url);
wait('[data-testid="answer-content"], [data-testid*="answer"], main article, main [class*="prose"], .scrollable-container', {timeout: 90000});
wait_network_idle();
wait_timeout(2000);
collect(parse());
```

This block is not represented as accepted syntax or runtime proof until the
single authorized diagnostic produces a `j_*` receipt. Saving the worker
change may restart Preview, so that Preview must count as the one diagnostic
page load; if the platform attempts an additional run, stop before it and do
not consume the acceptance package. `Self-Healing` and schedules must be
verified off before the diagnostic.
