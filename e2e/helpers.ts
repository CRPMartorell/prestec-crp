import { expect, Page } from '@playwright/test';

export const ADMIN = {
  correu: 'crp@example.cat',
  contrasenya: 'prova-segura-2026',
};

/** Reinicia la base de dades als dati d'exemple (només entorn de prova). */
export async function reiniciarBd(page: Page): Promise<void> {
  const resposta = await page.request.post('/api/test/reset');
  expect(resposta.ok()).toBeTruthy();
}

/** Inicia sessió al panell intern. */
export async function login(page: Page): Promise<void> {
  await page.getByLabel('Correu electrònic').fill(ADMIN.correu);
  await page.getByLabel('Contrasenya').fill(ADMIN.contrasenya);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Panell de Gestió del Personal del CRP' })
  ).toBeVisible();
}
