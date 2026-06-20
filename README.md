# Hustota

Interaktivní webová aplikace pro vizualizaci hustoty míčků v čtverci (nebo mřížce čtverců).

**Online verze:** https://frantisekvvb.github.io/Hustota/

## Spuštění lokálně

Potřebuješ [Node.js](https://nodejs.org/) 18 nebo novější.

```bash
npm start
```

Aplikace poběží na adrese **http://localhost:3472**.

Alternativa bez Node.js:

```bash
python3 -m http.server 3472
```

## Ovládání

- **Posuvník vpravo** — počet míčků v každém čtverci (1–90)
- **Táhni za hranu** — změna velikosti čtverce (obsah 1–36 cm², krok 1 cm²)
- **Tlačítko + vpravo** — zkopíruje celou plochu doprava
- **Tlačítko + dole** — zkopíruje celou plochu dolů
- **Reset** — vrátí úvodní nastavení (4 cm², 4 míčky, jeden čtverec)
- **Kliknutí do čtverce** — změna směru nejbližšího míčku

Vlevo se zobrazuje počet míčků, obsah plochy a hustota.

## Licence

MIT
