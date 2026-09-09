import {test,expect} from '@playwright/test';
test('PDF + GoJS + JSON, correction, persistence and exports',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Charger l’exemple',exact:true}).click();
 await expect(page.getByRole('cell',{name:'wrong_text',exact:true})).toBeVisible();
 await expect(page.locator('pdf-view canvas')).toBeVisible();
 await page.getByRole('button',{name:'Corriger N17',exact:true}).click();
 await page.getByRole('button',{name:'Valider et appliquer',exact:true}).click();
 await expect(page.getByText('Correction appliquée et ajoutée au dataset.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Valide',exact:true}).click();
 await expect(page.getByText('Statut enregistré : Valide',{exact:true})).toBeVisible();
 await page.reload();await expect(page.locator('.document-toolbar .badge.valid')).toBeVisible();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'JSON corrigé ↓',exact:true}).click();expect((await dl).suggestedFilename()).toContain('corrected.json');
 await page.getByRole('button',{name:'Dataset ML',exact:false}).first().click();
 await page.getByLabel('Format dataset').selectOption('jsonl');const dl2=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter ↓',exact:true}).click();expect((await dl2).suggestedFilename()).toBe('training_dataset.jsonl');
 await page.getByRole('button',{name:'Rapports',exact:false}).first().click();const dl3=page.waitForEvent('download');await page.getByRole('button',{name:'PDF ↓',exact:true}).click();expect((await dl3).suggestedFilename()).toContain('report.pdf');
 expect(errors).toEqual([]);
});
test('Invalid JSON import surfaces errors without destroying existing project',async({page})=>{
 await page.goto('/');await page.locator('input[type=file]').first().setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"nodeDataArray":[],"linkDataArray":[{"from":"missing","to":"missing"}]}')});
 await expect(page.getByRole('alert')).toContainText('source ou cible absente');await expect(page.getByRole('heading',{name:'Votre premier diagramme'})).toBeVisible();
});
