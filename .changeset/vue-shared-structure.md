---
"@adapttable/vue": minor
"@adapttable/vuetify": patch
---

The Vue desktop table and card chrome take `hosts`, so a kit draws the binding's table with its own components: `DesktopTableHosts` gives the table, row, header and cell elements (`DesktopTableTag`), and `MobileCardsHosts` the card list, each card (arranging the binding-built `MobileCardRegions`), a card's field list, extra rows and spacers. Vuetify's desktop table and phone cards come from that chrome inside Vuetify's table and card surfaces.
