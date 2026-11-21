# Canada & Amerika 2027 · Riksja

Website van het reisvoorstel van Riksja Travel: rondreis van Toronto naar New York, 10–30 juli 2027, 4 volwassenen.
20 nachten (19 hotelnachten en de nachtvlucht terug).

Live: https://mvaneeten.github.io/Vakantie2027R/

## Onderdelen

- Kalender "Waar zijn we wanneer?" met per dag de plek en de reistijd, plus een overzicht van alle reistijden tussen de plaatsen.
- Dag voor dag: foto, reistijd, programma, tips, het verblijf van die nacht en de link naar de Riksja-bouwsteen.
- Kaart (OpenStreetMap) met de autoroute en de treinreis Boston → New York.
- Verblijven: per stop de in- en uitcheckdatum, het type hotel en wat er inbegrepen is.
- Vluchten en het volledige reisschema ("Jouw reis in het kort").
- Praktische informatie, punten om na te vragen bij Riksja, en informatie over Riksja Travel.

## Bestanden

- index.html: pagina-opbouw.
- vakantie.json: alle reisgegevens uit het voorstel. Dit is de enige gegevensbron.
- app.js: leest vakantie.json, controleert de gegevens en bouwt de pagina op.
- styles.css: basisopmaak, met onderaan het eigen thema van deze site.

## Lokaal bekijken

Start een webserver in deze map en open http://localhost:8767:

    py -m http.server 8767

Rechtstreeks openen van index.html werkt niet, omdat de browser dan vakantie.json niet mag ophalen.

## Bronnen

- Reisvoorstel Riksja Travel (pdf), opgesteld door Sophie, amerika@riksjatravel.nl.
- Bouwstenen: https://www.riksjatravel.nl/amerika/bouwstenen/ en https://www.riksjatravel.nl/canada/bouwstenen/
- Rijtijden: berekend via OpenStreetMap (OSRM), zonder pauzes en verkeer. Vlucht- en treintijden komen uit het voorstel.
- Foto's: Wikimedia Commons; maker en licentie staan bij elke foto en onderaan de site.
