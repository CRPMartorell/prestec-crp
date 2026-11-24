import { expect, test } from '@playwright/test';
import { reiniciarBd } from './helpers';

test.beforeEach(async ({ page }) => {
  await reiniciarBd(page);
  await page.goto('/');
});

test.describe('Catàleg públic', () => {
  test('mostra el catàleg anònim amb tots els materials', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Catàleg de Préstec de Recursos Pedagògics i Maquinària' })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Reservar aquest Material' })).toHaveCount(10);
    // Cap dada personal al catàleg públic
    await expect(page.getByText('msoler@escolaeldrac.cat')).toHaveCount(0);
    // Cap accés al panell intern: no existeix al bundle públic
    await expect(page.getByText(/Gestió Interna/)).toHaveCount(0);
    await expect(page.getByText(/Panell de Gestió/)).toHaveCount(0);
  });

  test('cerca pel nom del material', async ({ page }) => {
    await expect(page.getByText('Nanokit')).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder(/Cerca per nom/).fill('Nanokit');

    await expect(page.getByText('Nanokit')).toBeVisible();
    await expect(page.getByText("De l'hort a casa")).toBeHidden();
    await expect(page.getByRole('button', { name: 'Reservar aquest Material' })).toHaveCount(1);
  });

  test('filtra per maquinària i per disponibilitat', async ({ page }) => {
    await expect(page.getByText('Nanokit')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Maquinària', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reservar aquest Material' })).toHaveCount(4);

    await page.getByRole('checkbox', { name: /Mostrar només materials/ }).check();
    await expect(page.getByRole('button', { name: 'Reservar aquest Material' })).toHaveCount(4);

    await page.getByRole('button', { name: /Restablir filtres/ }).click();
    await expect(page.getByRole('button', { name: 'Reservar aquest Material' })).toHaveCount(10);
  });

  test('mostra l’estat buit quan no hi ha coincidències', async ({ page }) => {
    await expect(page.getByText('Nanokit')).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder(/Cerca per nom/).fill('material inexistent');

    await expect(page.getByText('Cap recurs trobat')).toBeVisible();
  });

  test('només ofereix els tres àmbits temàtics', async ({ page }) => {
    await expect(page.getByText('Nanokit')).toBeVisible({ timeout: 15000 });

    const select = page.getByRole('combobox');
    await expect(select.locator('option')).toHaveCount(4); // «Tots» + 3 àmbits
    await expect(select.locator('option')).toHaveText([
      'Tots els àmbits temàtics',
      'Tècnic i audiovisual',
      'Impuls a la lectura',
      'STEAM',
    ]);

    await select.selectOption({ label: 'Tècnic i audiovisual' });
    await expect(page.getByRole('button', { name: 'Reservar aquest Material' })).toHaveCount(4);

    await select.selectOption({ label: 'STEAM' });
    await expect(page.getByRole('button', { name: 'Reservar aquest Material' })).toHaveCount(5);
  });
});
