import { test, expect } from '@playwright/test'

test.describe('Authentification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('affiche le formulaire de connexion', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
  })

  test('affiche une erreur avec des credentials invalides', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalide@test.com')
    await page.getByLabel(/mot de passe/i).fill('mauvais-mdp')
    await page.getByRole('button', { name: /se connecter/i }).click()

    await expect(page.getByText(/email ou mot de passe incorrect/i)).toBeVisible({ timeout: 5000 })
  })

  test('valide le format email côté client', async ({ page }) => {
    await page.getByLabel(/email/i).fill('pas-un-email')
    await page.getByLabel(/mot de passe/i).fill('Password@123')
    await page.getByRole('button', { name: /se connecter/i }).click()

    // Le navigateur ou la validation zod doit bloquer
    const emailInput = page.getByLabel(/email/i)
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBeTruthy()
  })

  test('redirige vers /auth/register depuis le lien', async ({ page }) => {
    await page.getByRole('link', { name: /créer un compte/i }).click()
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('redirige vers /auth/forgot-password', async ({ page }) => {
    await page.getByRole('link', { name: /mot de passe oublié/i }).click()
    await expect(page).toHaveURL(/\/auth\/forgot-password/)
  })
})

test.describe('Inscription', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register')
  })

  test('affiche le formulaire d\'inscription', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /inscription|créer/i })).toBeVisible()
    await expect(page.getByLabel(/prénom/i)).toBeVisible()
    await expect(page.getByLabel(/nom/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('affiche les options de rôle (acheteur/vendeur)', async ({ page }) => {
    await expect(page.getByText(/acheteur|vendeur/i)).toBeVisible()
  })
})
