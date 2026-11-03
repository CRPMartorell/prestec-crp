import { expect, test } from '@playwright/test';

test.describe('Flux complet de reserva', () => {
  test('un docent reserva un torn i el CRP el valida', async ({ page }) => {
    await page.goto('/');

    // 1. El docent troba el material i obre el formulari
    await page.getByPlaceholder(/Cerca per nom/).fill('Nanokit');
    await page.getByRole('button', { name: 'Reservar aquest Material' }).click();
    await expect(page.getByRole('heading', { name: 'Nanokit', level: 2 })).toBeVisible();

    // 2. Selecciona el 3r torn i omple les dades de contacte
    await page.getByRole('button', { name: /T-03/ }).click();
    await page.getByPlaceholder('Ex: Montserrat Soler i Puig').fill('Marta Soler');
    await page
      .getByPlaceholder('Ex: Escola El Pi Gros / Institut Ramon Muntaner')
      .fill('Escola El Drac');
    await page.getByPlaceholder('Ex: Terrassa, Sabadell, Rubí...').fill('Terrassa');
    await page
      .getByPlaceholder('Ex: nom@xtec.cat o nom@centre.cat')
      .fill('marta@escolaeldrac.cat');
    await page.getByPlaceholder('Ex: 612345678').fill('611223344');
    await page.getByRole('button', { name: /Enviar Sol·licitud de Préstec/ }).click();

    // 3. Confirma i obté el codi de seguiment
    await expect(page.getByText('Sol·licitud Enregistrada!')).toBeVisible();
    const codi = await page.getByText(/RES-\d{4}-\d{3}/).textContent();
    const idReserva = codi!.match(/RES-\d{4}-\d{3}/)![0];
    await page.getByRole('button', { name: 'Tancar i tornar al catàleg' }).click();

    // 4. El CRP veu la sol·licitud al panell intern
    await page.getByRole('banner').getByRole('button', { name: /Gestió Interna CRP/ }).click();
    const fila = page.getByRole('row').filter({ hasText: idReserva });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('Pendent de Validació');
    await expect(fila).toContainText('Escola El Drac');

    // 5. El CRP aprova la reserva i acorda la recollida
    await fila.getByRole('button', { name: /Aprovar/ }).click();
    await page
      .getByPlaceholder('Ex: Dilluns 15 de setembre a les 10:30 h a la seu del CRP')
      .fill('Dimarts 3 de novembre a les 09:30 h');
    await page.getByRole('button', { name: /Aprovar i Notificar Docent/ }).click();

    await expect(fila).toContainText('Concedida');
    await expect(fila).toContainText('Dimarts 3 de novembre a les 09:30 h');

    // 6. El correu de confirmació queda al registre d'automatitzacions
    await page.getByRole('button', { name: /Automatitzacions & Correu/ }).click();
    await expect(page.getByText('marta@escolaeldrac.cat', { exact: true })).toBeVisible();
    await expect(page.getByText(/Confirmació de Reserva i Acord de Recollida/).first()).toBeVisible();
  });

  test('el formulari valida les dades obligatòries', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder(/Cerca per nom/).fill('Bee-Bot');
    await page.getByRole('button', { name: 'Reservar aquest Material' }).click();
    await page.getByRole('button', { name: /Enviar Sol·licitud de Préstec/ }).click();

    await expect(page.getByText('Cal seleccionar un dels torns disponibles.')).toBeVisible();
    await expect(page.getByText('El nom i cognoms són obligatoris.')).toBeVisible();
    await expect(page.getByText('Cal un correu electrònic vàlid.')).toBeVisible();
  });
});
