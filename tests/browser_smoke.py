"""Browser regression: local assets, contacts, safe live data, themes and static hosting."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:3000/')
ID = '601356351263997952'
PAYLOAD = {'success': True, 'data': {'discord_user': {'id': ID, 'username': 'demo'}, 'discord_status': 'online', 'spotify': {'song': '<img src=x onerror=alert(1)>', 'artist': 'Artist', 'album': 'Album', 'album_art_url': 'javascript:alert(1)', 'timestamps': {'start': 1, 'end': 2}}, 'activities': [{'type': 0, 'name': '<script>alert(1)</script>', 'details': 'Developing'}, {'type': 4, 'state': '<img src=x onerror=alert(1)>'}]}}

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, reduced_motion='reduce')
    page = context.new_page()
    errors, bad_assets, external = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: bad_assets.append(response.url) if response.status >= 400 and '/api/discord' not in response.url else None)
    def route(request):
        if '/api/discord' in request.request.url:
            request.fulfill(status=200, content_type='application/json', body=json.dumps(PAYLOAD))
        elif request.request.url.startswith(BASE):
            request.continue_()
        else:
            external.append(request.request.url)
            request.abort()
    page.route('**/*', route)
    page.goto(BASE, wait_until='networkidle')
    assert page.locator('#profileName').inner_text().strip() == 'Geist-dev'
    assert page.locator('.track-title').inner_text() == PAYLOAD['data']['spotify']['song']
    assert page.locator('#activityContent script').count() == 0
    assert page.locator('#activityContent img').count() == 0
    assert page.locator('.album-art').get_attribute('src') == 'assets/avatar.svg'
    assert page.locator('a[href="https://t.me/flipgood"]').count() == 1
    assert page.locator('a[href="mailto:aeromax.live@mail.ru"]').count() == 1
    assert page.locator('a[href="https://discord.com/users/' + ID + '"]').count() == 1
    assert page.evaluate('document.fonts.check("16px boxicons")')
    page.locator('#themeToggle').click()
    assert 'light-theme' in page.locator('body').get_attribute('class')
    assert page.locator('#profileName').evaluate('(node) => getComputedStyle(node).color') == 'rgb(46, 51, 56)'
    page.reload(wait_until='networkidle')
    assert page.locator('#themeToggle').get_attribute('aria-pressed') == 'true'
    # Updates clear obsolete activities and music rather than leave stale state.
    PAYLOAD['data']['activities'] = []
    PAYLOAD['data']['spotify'] = None
    page.reload(wait_until='networkidle')
    assert not page.locator('#activitySection').is_visible()
    assert page.locator('.player-content').inner_text() == 'Сейчас музыка не играет'
    # Context menu and copy events remain usable.
    assert page.evaluate("document.dispatchEvent(new MouseEvent('contextmenu', {cancelable:true}))")
    assert page.evaluate("document.dispatchEvent(new Event('copy', {cancelable:true}))")
    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 950})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow: {width}'
    assert not errors, errors
    assert not bad_assets, bad_assets
    assert not external, external
    context.close()

    # Denied localStorage must not break initialization or theme changes.
    context = browser.new_context()
    context.add_init_script("Object.defineProperty(window, 'localStorage', {get(){throw new Error('denied')}})")
    page = context.new_page()
    page.route('**/api/discord', lambda route: route.fulfill(status=503, content_type='application/json', body='{}'))
    page.goto(BASE, wait_until='networkidle')
    assert page.locator('#presenceStatus').inner_text() == 'Discord временно недоступен'
    page.locator('#themeToggle').click()
    assert page.locator('#themeToggle').get_attribute('aria-pressed') == 'true'
    context.close()

    # GitHub Pages has no Node API; use the public Lanyard endpoint after a 404.
    context = browser.new_context()
    page = context.new_page()
    page.route('**/api/discord', lambda route: route.fulfill(status=404, body='Not found'))
    page.route('https://api.lanyard.rest/v1/users/*', lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps(PAYLOAD)))
    page.goto(BASE, wait_until='networkidle')
    assert page.locator('#presenceStatus').inner_text() == 'demo · В сети'
    context.close()

    # Portfolio content remains readable with JavaScript disabled.
    context = browser.new_context(java_script_enabled=False)
    page = context.new_page()
    page.goto(BASE, wait_until='networkidle')
    assert page.locator('#profileName').is_visible()
    assert page.locator('a.server-item').count() == 3
    context.close()
    browser.close()
print('PASS: contacts, safe presence data, themes, local assets, 4 widths, storage denial, static fallback, no-JS')
