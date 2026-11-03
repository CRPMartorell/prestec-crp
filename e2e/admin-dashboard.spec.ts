import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: /Gestió Interna CRP/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Panell de Gestió del Personal del CRP' })
  ).toBeVisible();
});

test.describe('Panell intern del CRP', () => {
  test('mostra les dades privades i compta les sol·licituds pendents', async ({ page }) => {
    // Segona capa RGPD: el correu i el telèfon només són aquí
    await expect(page.getByRole('row').filter({ hasText: 'RES-2026-002' })).toContainText(
      'jrius@iesbrossa.cat'
    );
    await expect(page.getByRole('banner').getByRole('button', { name: /Gestió Interna CRP/ })).toContainText('2');

    await page.getByRole('button', { name: 'Concedida', exact: true }).click();
    await expect(page.getByRole('row')).toHaveCount(4); // capçalera + 3 concedides
  });

  test('denega una sol·licitud i envia el correu', async ({ page }) => {
    const fila = page.getByRole('row').filter({ hasText: 'RES-2026-005' });
    await fila.getByRole('button', { name: 'Denegar' }).click();

    await expect(fila).toContainText('Denegada');
    await page.getByRole('button', { name: /Automatitzacions & Correu/ }).click();
    await expect(page.getByText('nbosch@paucasals.cat')).toBeVisible();
    await expect(page.getByText(/Sol·licitud no disponible/)).toBeVisible();
  });

  test('afegeix i elimina material de l’inventari', async ({ page }) => {
    await page.getByRole('button', { name: /Inventari de Materials/ }).click();
    await expect(page.getByRole('row')).toHaveCount(11); // capçalera + 10 materials

    await page.getByRole('button', { name: /Afegir Nou Material/ }).click();
    await page.getByPlaceholder('Ex: Maleta de Robòtica Bee-Bot').fill('Maleta de prova');
    await page.locator('form textarea').nth(0).fill('Material creat des de la prova E2E.');
    await page
      .getByPlaceholder('Llistat detallat de peces, guies i components...')
      .fill('1 guia, 2 mostres.');
    await page.getByRole('button', { name: 'Guardar Material' }).click();

    await expect(page.getByRole('row')).toHaveCount(12);
    const fila = page.getByRole('row').filter({ hasText: 'Maleta de prova' });
    await expect(fila).toBeVisible();

    await fila.getByTitle('Eliminar material').click();
    await expect(page.getByRole('row')).toHaveCount(11);
    await expect(page.getByText('Maleta de prova')).toHaveCount(0);
  });

  test('exporta l’inventari i les reserves a CSV', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Exportar CSV \(Google Sheets\)/ }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^CRP_Inventari_Reserves_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('executa el trigger de recordatoris manualment', async ({ page }) => {
    await page.getByRole('button', { name: /Automatitzacions & Correu/ }).click();
    await page.getByRole('button', { name: /Executar Trigger Manualment/ }).click();

    await expect(page.getByText(/Trigger executat: S'han revisat 3 reserves actives/)).toBeVisible();
  });
});
