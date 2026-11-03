# Procés i Arquitectura de l'Aplicació de Préstec del CRP

Aquest document detalla l'especificació funcional, l'estructura de dades, el model de privadesa i l'arquitectura tècnica per a la implementació d'una aplicació de préstec de materials del Centre de Recursos Pedagògics (CRP) utilitzant **Google Sheets**, **Google Forms**, **Looker Studio / AppSheet** i **Google Apps Script**.

## 1. Principi d'Accés i Model de Privadesa (RGPD)

Per complir amb el Reglament General de Protecció de Dades (RGPD) i oferir una experiència d'ús àgil i transparent, el sistema es divideix estrictament en dues capes:

### A. Vista Pública (Accés Lliure sense Registre)

* **Consulta anònima:** Els usuaris (docents o centres) poden consultar el catàleg i la disponibilitat del material sense necessitat de crear cap compte ni de fer *login*.

* **Ocultació total de dades personals:** La interfície pública **només mostra l'estat del recurs** (`Disponible` / `Reservat`) i els períodes ocupats (torns o setmanes).

* **Protecció de dades:** Mai es publiquen el nom, cognoms, correu, telèfon o centre educatiu de la persona o centre que té assignat un préstec.

### B. Vista Privada (Gestió Interna del CRP)

* **Base de dades centralitzada:** Totes les dades de contacte i de gestió queden emmagatzemades exclusivament al full de càlcul privat de Google Sheets.

* **Accés restringit:** Únicament el personal autoritzat del CRP té accés a les dades personals de les sol·licituds i dels usuaris sol·licitants.

## 2. Tipologies de Material i Períodes de Préstec

El catàleg organitza els materials segons la seva naturalesa i aplica dos models de préstec diferents:

### 2.1. Recursos Pedagògics

La reserva es realitza obligatòriament per **Torns de préstec tancats i prefixats** al llarg del curs escolar.

El curs es divideix en **6 Torns oficials**:

| TORN | Data d'Inici | Data de Finalització | 
| ----- | ----- | ----- | 
| **1r Torn** | 14/09/2026 | 23/10/2026 | 
| **2n Torn** | 02/11/2026 | 14/12/2026 | 
| **3r Torn** | 08/01/2027 | 10/02/2027 | 
| **4t Torn** | 15/02/2027 | 19/03/2027 | 
| **5è Torn** | 01/04/2027 | 07/05/2027 | 
| **6è Torn** | 12/05/2027 | 16/06/2027 | 

### 2.2. Maquinària i Equipament

La reserva es realitza **per setmanes naturals** (dilluns a divendres) segons les necessitats puntuals del centre i la disponibilitat de l'equip.

## 3. Disseny de la Targeta de Consulta Pública (Model Híbrid Airtable/Web)

Inspirat en el disseny de targetes/grid visual, cada element del catàleg públic inclourà els següents elements visuals i informatius:

* **Títol del Material:** Nom clar del recurs.
* **Imatge / Foto de Portada:** URL d'una imatge a Google Drive o servidor extern per a la vista en quadrícula.
* **Etiqueta d'Àmbit / Categoria:** Categoria temàtica (ex: *Ciències Pures i Naturals*, *Robòtica*, *Audiovisuals*).
* **Descripció Curta i Contingut Detallat:** Explicació del material i llistat de components que conté la maleta o equipament.
* **Enllaç a Documentació Externa / Drive:** Botó o enllaç a la guia didàctica, manual d'ús o PDF informatiu guardat a Google Drive.
* **Estat i Botó de Reserva:** Indicador de disponibilitat i botó d'acció directament a la targeta.

```
+-------------------------------------------------------------------------+
|  [ IMATGE DE PORTADA DEL MATERIAL ]                                     |
|                                                                         |
|  Títol: De l'hort a casa                                                |
|  Etiqueta: 📂 Maletes pedagògiques | 🏷️ Ciències pures i naturals       |
|                                                                         |
|  Descripció: Maleta pedagògica per a l'Educació Primària i ESO...       |
|  Contingut: Inclou 5 guies de treball, mostres de llavors i compost.    |
|                                                                         |
|  📄 Enllaç Guia/Drive: [ Veure Dossier Pedagògic (Drive) ]               |
|                                                                         |
|  Disponibilitat: [ 🟢 Torn 1: Lliure | 🔴 Torn 2: Reservat ... ]         |
|                                                                         |
|  [ 🗓️ RESERVAR AQUEST MATERIAL ]                                         |
+-------------------------------------------------------------------------+
```

## 4. Flux de Navegació i Procés de Reserva

```
+-----------------------------------------------------------------------+
|  PANTALLA 1: Catàleg General (Targetes estil Airtable / Públic)       |
|  - Filtres per Àmbit i Tipologia (Recurs / Maquinària)                 |
|  - Mostra Títol, Imatge, Descripció, Contingut i Guia Drive           |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|  PANTALLA 2: Detall del Material i Disponibilitat                     |
|  - Estat visual anònim: Disponible / Reservat per Torn o Setmana      |
|  - Botó d'acció directament a la pàgina: "Reservar aquest Material"   |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|  FORMULARI DE RESERVA (Google Forms / AppSheet Form)                  |
|  - Dades de contacte: Nom, Cognoms, Centre, Municipi, Email, Telèfon |
|  - Període: Selecció entre els Torns o Setmanes disponibles           |
|  - Camp d'Observacions                                                |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|  GESTIÓ I AUTOMATITZACIÓ (Google Apps Script + Sheets)               |
|  1. Notificació immediata per correu a la bústia del CRP              |
|  2. Validació del CRP: Canvi d'estat a 'Reservat'                     |
|  3. Enviament de correu de confirmació + acord de cita de recollida   |
|  4. Recordatori automàtic de devolució en apropar-se la data          |
+-----------------------------------------------------------------------+
```

## 5. Estructura de la Base de Dades (Google Sheets)

La base de dades es centralitza en un únic llibre de Google Sheets dividit en 4 pestanyes principals:

### 5.1. Pestanya: `Materials`

Catàleg general de tots els ítems de l'inventari enriquits amb imatges i enllaços a documentació.

| Columna | Nom del Camp | Tipus | Descripció / Valors |
| ----- | ----- | ----- | ----- |
| **A** | `ID_Material` | Text | Identificador únic (ex: `MAT-001`, `MAQ-004`). |
| **B** | `Nom` | Text | Nom descriptiu del recurs o equipament. |
| **C** | `Tipus` | Desplegable | `Recurs Pedagògic` / `Maquinària i Equipament`. |
| **D** | `Àmbit` | Text | Àmbit temàtic (Robòtica, Ciències, Audiovisuals, etc.). |
| **E** | `URL_Imatge` | Text (URL) | Enllaç a la foto/imatge de portada (Google Drive / Web). |
| **F** | `Descripció` | Text | Breu descripció de l'objectiu pedagògic o tècnic. |
| **G** | `Contingut_Maleta` | Text llarg | Llistat detallat del contingut o peces que conté. |
| **H** | `URL_Guia_Drive` | Text (URL) | Enllaç al PDF de la guia didàctica o manual a Google Drive. |
| **I** | `Model_Préstec` | Text | `Torns` (Pedagògic) / `Setmanes` (Maquinària). |
| **J** | `Estat_General` | Desplegable | `Actiu` / `En Manteniment` / `Baixa`. |

### 5.2. Pestanya: `Torns_Pedagogics`

Calendari oficial dels 6 torns de préstec per als recursos pedagògics.

| ID_Torn | Nom_Torn | Data_Inici | Data_Final | 
| ----- | ----- | ----- | ----- | 
| **T-01** | 1r Torn | 14/09/2026 | 23/10/2026 | 
| **T-02** | 2n Torn | 02/11/2026 | 14/12/2026 | 
| **T-03** | 3r Torn | 08/01/2027 | 10/02/2027 | 
| **T-04** | 4t Torn | 15/02/2027 | 19/03/2027 | 
| **T-05** | 5è Torn | 01/04/2027 | 07/05/2027 | 
| **T-06** | 6è Torn | 12/05/2027 | 16/06/2027 | 

### 5.3. Pestanya: `Disponibilitat_i_Reserves` (Privada)

Registre privat on es gestionen totes les reserves i es guarden les dades personals dels sol·licitants.

| Columna | Nom del Camp | Descripció / Valors | 
| ----- | ----- | ----- | 
| **A** | `ID_Reserva` | Codi únic de sol·licitud (ex: `RES-2026-001`). | 
| **B** | `ID_Material` | Relacionat amb la pestanya `Materials`. | 
| **C** | `Tipus` | `Recurs Pedagògic` / `Maquinària i Equipament`. | 
| **D** | `Torn_Assignat` | `T-01` a `T-06` (si és Recurs Pedagògic) o `N/A`. | 
| **E** | `Data_Inici_Setmana` | Data d'inici (si és Maquinària/Equipament). | 
| **F** | `Data_Fi_Setmana` | Data de finalització (si és Maquinària/Equipament). | 
| **G** | `Nom_Sol·licitant` | Nom i cognoms del docent sol·licitant. | 
| **H** | `Centre_Educatiu` | Nom del centre educatiu. | 
| **I** | `Municipi` | Població del centre educatiu. | 
| **J** | `Correu` | Correu electrònic de contacte. | 
| **K** | `Telèfon` | Telèfon de contacte. | 
| **L** | `Observacions` | Comentaris afegits per l'usuari. | 
| **M** | `Estat_Reserva` | `Pendent de Validació` / `Concedida` / `Denegada` / `Finalitzada`. | 
| **N** | `Data_Hora_Recollida` | Data i hora acordada per a la recollida del material. | 

### 5.4. Dades d'Exemple Ampliades per a les Proves de Programació

#### Exemple Pestanya `Materials`:

| ID_Material | Nom | Tipus | Àmbit | URL_Imatge | Descripció | Contingut_Maleta | URL_Guia_Drive | Model_Préstec | Estat_General |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| **MAT-001** | De l'hort a casa | Recurs Pedagògic | Ciències Naturals | `https://drive.google.com/uc?id=img1` | Maleta pedagògica sobre l'hort escolar. | 5 guies, kits de llavors, eines petites, quadern de camp. | `https://drive.google.com/file/d/doc1` | Torns | Actiu |
| **MAT-002** | Nanokit | Recurs Pedagògic | Ciències Socials / STEM | `https://drive.google.com/uc?id=img2` | Material sobre nanociència i tecnologia. | Superfícies hidròfobes, filferro de nitinol, mostres. | `https://drive.google.com/file/d/doc2` | Torns | Actiu |
| **MAT-003** | El diari de l'Arlet | Recurs Pedagògic | Ciències Pures i Naturals | `https://drive.google.com/uc?id=img3` | Projecte sobre energies renovables. | 1 diari de lectura, plaques solars petites, jocs de taula. | `https://drive.google.com/file/d/doc3` | Torns | Actiu |
| **MAQ-001** | Impressora 3D Ender | Maquinària i Equipament | Fabricació Digital | `https://drive.google.com/uc?id=img4` | Impressora 3D de filament PLA. | Impressora, bobina PLA, alicates, targeta SD. | `https://drive.google.com/file/d/doc4` | Setmanes | Actiu |

## 6. Codi i Automatitzacions en Google Apps Script

A continuació es detalla el codi complet que s'ha d'inserir a **Extensions > Apps Script** del full de càlcul.

### 6.1. Notificació Automàtica a la Bústia del CRP (En enviar formulari)

```javascript
/**
 * S'executa quan un usuari envia el formulari de sol·licitud.
 * Envia una notificació immediata a la bústia del CRP.
 */
function enEnviarSollicitud(e) {
  var bustiaCRP = "crp@centre-recursos.cat"; // Canviar pel correu real del CRP
  var respostes = e.values;
  
  var idMaterial = respostes[2];
  var nomUsuari = respostes[3] + " " + respostes[4];
  var centre = respostes[5];
  var periode = respostes[9];
  var observacions = respostes[10] || "Cap";
  
  var assumpte = " Nova Sol·licitud de Préstec: " + idMaterial + " - " + centre;
  var cos = "S'ha rebut una nova petició de préstec:\n\n" +
            "• Material: " + idMaterial + "\n" +
            "• Sol·licitant: " + nomUsuari + "\n" +
            "• Centre Educatiu: " + centre + "\n" +
            "• Període/Torn sol·licitat: " + periode + "\n" +
            "• Observacions: " + observacions + "\n\n" +
            "Accedeix al full de càlcul per revisar i validar aquesta reserva.";
            
  MailApp.sendEmail(bustiaCRP, assumpte, cos);
}
```

### 6.2. Validació pel CRP i Notificació a l'Usuari

```javascript
/**
 * S'executa quan el personal del CRP canvia l'estat a 'Concedida' a la pestanya 'Disponibilitat_i_Reserves'.
 */
function alEditarValidacio(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Disponibilitat_i_Reserves") return;
  
  var fila = e.range.getRow();
  var columna = e.range.getColumn();
  
  // Columna M (13) correspon a Estat_Reserva
  if (columna === 13 && e.value === "Concedida") {
    var emailUsuari = sheet.getRange(fila, 10).getValue(); // Columna J
    var nomUsuari = sheet.getRange(fila, 7).getValue();    // Columna G
    var idMaterial = sheet.getRange(fila, 2).getValue();   // Columna B
    var dataRecollida = sheet.getRange(fila, 14).getValue(); // Columna N
    
    var assumpte = " Confirmació de Reserva i Acord de Recollida - CRP";
    var cos = "Hola " + nomUsuari + ",\n\n" +
              "La teva sol·licitud de préstec per al material (" + idMaterial + ") ha estat APROVADA.\n\n" +
              "• Data i hora prevista de recollida: " + (dataRecollida ? dataRecollida : "A concretar amb el CRP") + "\n\n" +
              "Si necessites proposar un altre horari de recollida, respon directament a aquest correu.\n\n" +
              "Atentament,\nEquip del Centre de Recursos Pedagògics";
              
    MailApp.sendEmail(emailUsuari, assumpte, cos);
  }
}
```

### 6.3. Recordatori Automàtic de Finalització del Préstec

```javascript
/**
 * Funció programada (Trigger diari) per enviar un correu de recordatori 2 dies abans de la devolució.
 */
function enviarRecordatoriDevolucio() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Disponibilitat_i_Reserves");
  var dades = sheet.getDataRange().getValues();
  var avui = new Date();
  
  for (var i = 1; i < dades.length; i++) {
    var estat = dades[i][12]; // Columna M (Estat_Reserva)
    var dataFi = new Date(dades[i][5]); // Columna F (Data_Fi_Setmana o Data Fi de Torn)
    var emailUsuari = dades[i][9]; // Columna J
    var nomUsuari = dades[i][6]; // Columna G
    var idMaterial = dades[i][1]; // Columna B
    
    if (estat === "Concedida" && dataFi) {
      var diesRestants = Math.ceil((dataFi - avui) / (1000 * 60 * 60 * 24));
      
      if (diesRestants === 2) {
        var assumpte = " Recordatori: Finalització del préstec de " + idMaterial;
        var cos = "Hola " + nomUsuari + ",\n\n" +
                  "Et recordem que el préstec del material " + idMaterial + 
                  " finalitza d'aquí a 2 dies (Data límit de devolució: " + dataFi.toLocaleDateString() + ").\n\n" +
                  "Si us plau, assegura't de tenir tot el contingut a punt per al retorn al CRP.\n\n" +
                  "Moltes gràcies per la teva col·laboració.";
                  
        MailApp.sendEmail(emailUsuari, assumpte, cos);
      }
    }
  }
}
```