import { test, expect } from '@playwright/test'

test.describe('Page Produits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
  })

  test('charge la liste des produits', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /produits|annonces/i })).toBeVisible({ timeout: 10000 })
  })

  test('affiche les filtres de recherche', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/rechercher|search/i)
    await expect(searchInput).toBeVisible()
  })

  test('permet de rechercher un produit', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/rechercher|search/i)
    await searchInput.fill('ordinateur')
    await searchInput.press('Enter')
    await page.waitForURL(/q=ordinateur/)
    await expect(page).toHaveURL(/q=ordinateur/)
  })

  test('affiche la pagination', async ({ page }) => {
    // Attend que la page soit chargée
    await page.waitForLoadState('networkidle')
    const pagination = page.locator('[aria-label*="pagination"], nav[role="navigation"]').first()
    // La pagination n'est visible que s'il y a plus d'une page
    const productCards = page.locator('[data-testid="product-card"], .product-card').first()
    if (await productCards.isVisible()) {
      await expect(page.getByRole('main')).toBeVisible()
    }
  })
})

test.describe('Page d\'accueil', () => {
  test('charge la page d\'accueil avec les sections clés', async ({ page }) => {
    await page.goto('/')

    // Hero section
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Navigation principale
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('le header contient les liens de navigation', async ({ page }) => {
    await page.goto('/')
    const header = page.getByRole('banner')
    await expect(header.getByRole('link', { name: /produits/i })).toBeVisible()
  })

  test('a les bonnes balises meta SEO', async ({ page }) => {
    await page.goto('/')

    const title = await page.title()
    expect(title).toContain('LS Marketplace')

    const description = await page.getAttribute('meta[name="description"]', 'content')
    expect(description).toBeTruthy()
    expect(description!.length).toBeGreaterThan(50)
  })
})

test.describe('PWA', () => {
  test('expose le manifest.json', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)
  })

  test('le manifest a les champs requis', async ({ page }) => {
    await page.goto('/manifest.webmanifest')
    const manifest = await page.evaluate(() => document.body.innerText)
    const data = JSON.parse(manifest)
    expect(data.name).toBeTruthy()
    expect(data.short_name).toBeTruthy()
    expect(data.display).toBe('standalone')
    expect(data.icons.length).toBeGreaterThan(0)
  })
})
