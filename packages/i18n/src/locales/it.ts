import type { TableLabels } from "@adapttable/core";

/**
 * Italian (`it`) label preset.
 *
 * @public
 */
/** How this language names what became of one action. */
const RECEIPT_STATUS: Readonly<Record<string, string>> = {
  executed: "eseguito",
  staged: "preparato",
  partial: "fatto in parte",
  rejected: "rifiutato",
  "awaiting-approval": "in attesa di te",
  cancelled: "annullato",
  stale: "non aggiornato",
  failed: "non riuscito",
};

/** How this language names the capabilities a reader is asked to confirm. */
const CAPABILITY: Readonly<Record<string, string>> = {
  "edit.cells": "modificare celle",
  "rows.add": "aggiungere righe",
  "rows.delete": "eliminare righe",
  "rows.reorder": "riordinare righe",
  "export.run": "esportare",
};

export const it: Required<TableLabels> = {
  table: "Tabella dati",
  search: "Cerca",
  searchPlaceholder: "Cerca…",
  noData: "Nessun dato",
  noResults: "Nessun risultato corrisponde ai filtri",
  pageSelected: (count) => `Tutti i ${count} di questa pagina selezionati`,
  selectAllMatching: (total) => `Seleziona tutti i ${total} corrispondenti`,
  allMatchingSelected: (total) => `Tutti i ${total} corrispondenti selezionati`,
  expandRow: "Espandi riga",
  collapseRow: "Comprimi riga",
  operator: "Operatore",
  value: "Valore",
  from: "Da",
  to: "A",
  opEqual: "Uguale",
  opAtLeast: "Almeno",
  opAtMost: "Al massimo",
  opBetween: "Tra",
  opOn: "Il",
  opOnOrAfter: "Il giorno o dopo",
  opOnOrBefore: "Il giorno o prima",
  opNotEqual: "Diverso",
  opGreater: "Maggiore di",
  opLess: "Minore di",
  opContains: "Contiene",
  opNotContains: "Non contiene",
  opStartsWith: "Inizia con",
  opEndsWith: "Termina con",
  opEmpty: "È vuoto",
  opNotEmpty: "Non è vuoto",
  opIn: "È uno di",
  opNotIn: "Non è nessuno di",
  opBefore: "Prima",
  opAfter: "Dopo",
  opRelative: "Relativo",
  relToday: "Oggi",
  relYesterday: "Ieri",
  relTomorrow: "Domani",
  relThisWeek: "Questa settimana",
  relThisMonth: "Questo mese",
  relPreviousMonth: "Mese precedente",
  relLastN: "Ultimi N giorni",
  relNextN: "Prossimi N giorni",
  boolAny: "Qualsiasi",
  boolTrue: "Vero",
  boolFalse: "Falso",
  savedViews: "Viste salvate",
  saveView: "Salva vista",
  viewName: "Nome della vista",
  deleteView: "Elimina vista",
  renameView: "Rinomina vista",
  applyView: "Applica vista",
  moveViewUp: "Sposta su",
  moveViewDown: "Sposta giù",
  setDefaultView: "Imposta come predefinita",
  defaultViewBadge: "Predefinita",
  readOnlyViewBadge: "Sola lettura",
  loading: "Caricamento…",
  loadMore: "Carica altro",
  filters: "Filtri",
  clearAll: "Cancella tutto",
  removeFilter: (label) => `Rimuovi filtro: ${label}`,
  filtersDone: "Fine",
  filterTree: "Avanzate",
  filterAddCondition: "Aggiungi condizione",
  filterAddGroup: "Aggiungi gruppo",
  filterCombinatorAnd: "E",
  filterCombinatorOr: "O",
  filterRemoveCondition: "Rimuovi condizione",
  filterRemoveGroup: "Rimuovi gruppo",
  filterField: "Campo",
  checklistSearch: "Cerca valori",
  checklistClear: "Cancella",
  checklistNoValues: "Nessun valore corrispondente",
  headerFilters: "Filtri colonna",
  sortBy: "Ordina per",
  rowsPerPage: "Righe per pagina",
  actions: "Azioni",
  selectAll: "Seleziona tutto",
  selectRow: "Seleziona riga",
  selectColumn: "Seleziona colonna",
  cancel: "Annulla",
  retry: "Riprova",
  errorTitle: "Qualcosa è andato storto",
  errorMessage: "Impossibile caricare questi dati.",
  previousPage: "Pagina precedente",
  nextPage: "Pagina successiva",
  goToPage: (page) => `Vai alla pagina ${page}`,
  selectedCount: (count) =>
    count === 1 ? "1 selezionato" : `${count} selezionati`,
  showing: ({ from, to, total }) => `Visualizzazione ${from}–${to} di ${total}`,
  pageOf: ({ page, total }) => `Pagina ${page} di ${total}`,
  columns: "Colonne",
  pinStart: "Blocca all'inizio",
  pinEnd: "Blocca alla fine",
  unpin: "Sblocca",
  moveStart: "Sposta all'inizio",
  moveEnd: "Sposta alla fine",
  resetColumns: "Reimposta colonne",
  autoSizeColumns: "Adatta colonne al contenuto",
  autoSizeColumn: "Adatta colonna al contenuto",
  resizeColumn: "Ridimensiona colonna",
  showColumn: "Mostra colonna",
  hideColumn: "Nascondi colonna",
  searchColumns: "Cerca colonne",
  showAllColumns: "Mostra tutte",
  hideAllColumns: "Nascondi tutte",
  unpinAllColumns: "Sblocca tutte",
  resetColumn: "Reimposta colonna",
  renameColumn: "Rinomina colonna",
  columnName: "Nome colonna",
  saveColumnName: "Salva nome",
  cancelColumnRename: "Annulla",
  columnNameRequired: "Inserisci un nome per la colonna.",
  columnRenamed: ({ previous, name }) =>
    `Colonna ${previous} rinominata in ${name}`,
  sortAscending: "Ordina crescente",
  sortDescending: "Ordina decrescente",
  sortedBy: ({ column, ascending }) =>
    `Ordinato per ${column}, ${ascending ? "crescente" : "decrescente"}`,
  sortingCleared: "Ordinamento rimosso",
  filterColumn: "Filtra colonna",
  columnActions: "Azioni colonna",
  exportCsv: "Esporta CSV",
  exportFile: (format) => `Esporta ${format.toUpperCase()}`,
  exportStarted: "Preparazione dell’esportazione",
  exportProgress: (progress) => `Esportazione completata al ${progress}%`,
  exportDone: "Esportazione completata",
  exportFailed: "Esportazione non riuscita",
  exportCancelled: "Esportazione annullata",
  exportDownload: "Scarica esportazione",
  exportDismiss: "Chiudi esportazione",
  editCell: "Modifica cella",
  undoEdit: "Annulla",
  redoEdit: "Ripeti",
  editRow: "Modifica riga",
  saveRow: "Salva riga",
  pendingRows: (count) =>
    count === 1 ? "1 riga non salvata" : `${String(count)} righe non salvate`,
  saveAll: "Salva tutto",
  cancelAll: "Annulla tutto",
  approveProposal: "Approva",
  rejectProposal: "Rifiuta",
  proposalValueUnavailable: "Non disponibile",
  proposalSummary: ({ changes, rows }) => {
    const left =
      changes === 1
        ? "1 modifica proposta"
        : "{c} modifiche proposte".replace("{c}", String(changes));
    if (rows <= 1) return left;
    return `${left} ${"su {r} righe".replace("{r}", String(rows))}`;
  },
  reviewAllProposals: (count) =>
    "Rivedi tutte le {c} modifiche".replace("{c}", String(count)),
  backToConversation: "Torna alla conversazione",
  approveAllProposals: "Approva tutto",
  approveRemainingProposals: "Approva il resto",
  rejectAllProposals: "Rifiuta tutto",
  rejectRemainingProposals: "Rifiuta il resto",
  alwaysAllowProposal: "Consenti sempre",
  proposalTally: ({ pending, approved, rejected }) =>
    "{a} approvate · {j} rifiutate · {p} rimaste"
      .replace("{a}", String(approved))
      .replace("{j}", String(rejected))
      .replace("{p}", String(pending)),
  approvalWaitingElsewhere: "Una modifica attende la tua decisione.",
  pendingProposals: (count) =>
    count === 1 ? "1 modifica proposta" : `${String(count)} modifiche proposte`,
  proposalChange: ({ row, column, before, after }) => {
    const field = column ? `${row} · ${column}` : row;
    if (before === undefined && after === undefined) return field;
    return `${field}: ${before ?? "—"} → ${after ?? "—"}`;
  },
  assistantTitle: "Assistente tabella",
  assistantOpen: "Chiedi all’IA",
  assistantClose: "Chiudi",
  assistantSettings: "Impostazioni assistente",
  assistantEmpty: "Cosa vuoi fare con questa tabella?",
  assistantPlaceholder: "Chiedi di questa tabella…",
  assistantSend: "Invia",
  assistantStop: "Ferma",
  assistantVoiceStart: "Detta",
  assistantVoiceStop: "Interrompi dettatura",
  assistantVoiceListening: "In ascolto",
  assistantVoiceLanguage: "Lingua della dettatura",
  assistantYou: "Tu",
  assistantSpeaker: "Assistente",
  assistantNewMessages: "Nuovi messaggi",
  assistantUnavailable: "L’assistente non è connesso.",
  assistantDetached:
    "La connessione è caduta. Il lavoro potrebbe essere ancora in corso.",
  assistantRejoin: "Riprendi",
  assistantBackToTable: "Torna alla tabella",
  assistantDetail: "Dettagli",
  assistantSaveInTable: "Salva nella tabella per mantenere questa modifica.",
  assistantUndo: "Annulla",
  assistantUnresolved: (code) =>
    (
      ({
        "continuation-exhausted":
          "Richiede più passaggi di quanti ne consenta un turno. Chiedine una parte.",
        "continuation-limit":
          "Richiede più passaggi di quanti ne consenta un turno. Chiedine una parte.",
        "resume-limit":
          "Richiede più passaggi di quanti ne consenta un turno. Chiedine una parte.",
        "discovery-exhausted": "L’assistente non ha capito come farlo qui.",
        "repeated-plan":
          "L’assistente ha chiesto due volte la stessa cosa e si è fermato.",
        "question-unanswered": "Serve una tua risposta per completare.",
        "approval-unavailable":
          "Serve un’approvazione e non c’è a chi chiederla.",
        "interrupt-unsupported":
          "L’assistente ha chiesto qualcosa che questa tabella non sa fare.",
        "output-denied": "Una parte non è stata autorizzata a eseguire.",
        "not-run": "Non è stato eseguito.",
      }) as Record<string, string>
    )[code],
  assistantUndoBlocked: (code) =>
    (
      ({
        "table-moved": "La tabella è cambiata da allora.",
        "cannot-restore": "Una parte non può essere ripristinata.",
      }) as Record<string, string>
    )[code],
  assistantAnswerLabel: "La tua risposta",
  assistantAnswerPlaceholder: "Scrivi una risposta",
  assistantAnswerSend: "Rispondi",
  assistantAlwaysAllowedTitle: "Non chiede più per",
  assistantAlwaysAllowedRevoke: (capability) =>
    `Chiedi di nuovo per ${CAPABILITY[capability] ?? capability}`,
  assistantCapabilityName: (capability) => CAPABILITY[capability],
  assistantActions: (count) =>
    count === 1 ? "1 azione" : `${String(count)} azioni`,
  assistantActionsTitle: "Cosa ha cambiato questo turno",
  assistantUndoAll: "Annulla tutto",
  assistantExamples: "Scorciatoie",
  assistantReceiptChange: ({ before, after }) =>
    `Modificato da ${before} a ${after}`,
  assistantReceiptProposed: ({ before, after }) =>
    `Proposto: da ${before} a ${after}`,
  assistantReceiptAction: ({ kind, status, cleared }) => {
    if (!kind) return undefined;
    const scope = cleared ? `${kind}-cleared` : kind;
    return (
      {
        "filter/executed": "Filtro applicato",
        "filter/staged": "Filtro preparato",
        "sort/executed": "Ordinato",
        "group/executed": "Raggruppato",
        "pin/executed": "Colonna bloccata",
        "edit/executed": "Salvato",
        "edit/staged": "Modifica preparata — non salvata",
        "edit/awaiting-approval": "Modifica in attesa di approvazione",
        "edit/partial": "Alcune modifiche salvate, altre rifiutate",
        "edit/rejected": "Modifica rifiutata",
        "filter-cleared/executed": "Filtri rimossi",
        "sort-cleared/executed": "Ordinamento rimosso",
        "search/executed": "Ricerca applicata",
        "search-cleared/executed": "Ricerca cancellata",
        "group-cleared/executed": "Raggruppamento rimosso",
        "pin-cleared/executed": "Colonna non più fissata",
        "pinRow/executed": "Riga fissata",
        "pinRow-cleared/executed": "Riga non più fissata",
        "page/executed": "Pagina cambiata",
        "aggregate/executed": "Totali modificati",
        "select/executed": "Selezione modificata",
        "read/executed": "Tabella letta",
        "operation/executed": "Eseguito",
        "operation/awaiting-approval": "In attesa di te",
        "operation/rejected": "Rifiutato",
        "export/executed": "Esportato",
        "add/executed": "Riga aggiunta",
        "add/awaiting-approval": "Nuova riga in attesa di approvazione",
        "add/rejected": "Nuova riga rifiutata",
        "delete/executed": "Righe eliminate",
        "delete/awaiting-approval": "Eliminazione in attesa di approvazione",
        "delete/partial": "Alcune righe eliminate, altre mantenute",
        "delete/rejected": "Eliminazione rifiutata",
        "reorder/executed": "Righe spostate",
      } as Record<string, string>
    )[`${scope}/${status}`];
  },
  assistantReceiptTerms: ({ kind, terms, direction }) => {
    const parts = (terms ?? [])
      .map((term) => {
        if (!term.column) return term.value;
        if (!term.value) return term.column;
        return kind === "edit"
          ? `${term.column} impostato su ${term.value}`
          : `${term.column}: ${term.value}`;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length === 0) return undefined;
    const joined = parts.join(", ");
    if (!direction) return joined;
    return `${joined}, ${direction === "desc" ? "decrescente" : "crescente"}`;
  },
  assistantConnection: (status) =>
    ({
      idle: "Inattivo",
      connecting: "Connessione…",
      ready: "Pronto",
      sending: "In corso…",
      "awaiting-approval": "In attesa di te",
      "awaiting-user": "In attesa di te",
      error: "Errore",
      disconnected: "Non connesso",
    })[status] ?? "Pronto",
  assistantReceipt: ({ capability, status }) => {
    const what = RECEIPT_STATUS[status] ?? status;
    return capability ? `${capability}: ${what}` : what;
  },
  assistantReceiptStatus: (status) => RECEIPT_STATUS[status] ?? status,
  addRow: "Aggiungi riga",
  duplicateRow: "Duplica riga",
  deleteRow: "Elimina riga",
  deleteRowConfirm:
    "Eliminare questa riga? L'operazione non può essere annullata.",
  rowActionsMenu: "Azioni riga",
  editConflict: "Questa riga è cambiata mentre la stavi modificando",
  keepMine: "Tieni il mio",
  takeTheirs: "Prendi il nuovo",
  theirsValue: (value) => `Il loro: ${value}`,
  reorderRow: "Riordina riga",
  moveRowUp: "Sposta riga su",
  moveRowDown: "Sposta riga giù",
  rowLifted: (position) => `Riga ${String(position)} sollevata`,
  rowMoved: (from, to) => `Riga spostata da ${String(from)} a ${String(to)}`,
  rowReorderCancelled: "Riordino annullato",
  rowMoveOptions: "Opzioni di spostamento della riga",
  moveToGroup: "Sposta nel gruppo…",
  moveUnder: "Sposta sotto…",
  moveToTopLevel: "Sposta al livello principale",
  confirmRowMoveTitle: "Conferma spostamento riga",
  confirmRowMoveDescription: (row, from, to) =>
    `Spostare ${row} da ${from} a ${to}?`,
  confirmRowMove: "Sposta",
  rowMovedToGroup: (group) => `Riga spostata in ${group}`,
  rowMovedUnder: (parent) => `Riga spostata sotto ${parent}`,
  moveRejectedPolicyNever:
    "Gli spostamenti di riga tra limiti sono disattivati",
  moveRejectedSorted:
    "Rimuovi l’ordinamento prima di modificare l’ordine delle righe",
  moveRejectedCycle:
    "Una riga non può essere spostata dentro se stessa o un suo discendente",
  moveUnavailable: "Questo spostamento di riga non è disponibile",
  rootLevel: "Livello principale",
  pinToTop: "Fissa in alto",
  pinToBottom: "Fissa in basso",
  unpinRow: "Sblocca riga",
  pinnedSummaryRow: "Riga di riepilogo",
  pinnedSummaryTop: "Righe di riepilogo fissate in alto",
  pinnedSummaryBottom: "Righe di riepilogo fissate in basso",
  rowSeparator: "Separatore",
  expandColumnGroup: "Espandi gruppo di colonne",
  collapseColumnGroup: "Comprimi gruppo di colonne",
  moreGroups: (remaining) => `Mostra altri ${remaining} gruppi`,
  moreRowsInGroup: (remaining) => `Mostra altri ${remaining} in questo gruppo`,
  groupTotal: (label) => `Totale ${label}`,
  expandGroup: "Espandi gruppo",
  collapseGroup: "Comprimi gruppo",
  groupCount: (count) => `(${count})`,
  groupingPanel: "Raggruppamento righe",
  groupingDropColumns: "Trascina qui le colonne per raggruppare",
  addGroupingColumn: "Aggiungi colonna di raggruppamento",
  groupByColumn: (label) => `Raggruppa per ${label}`,
  ungroupColumn: (label) => `Annulla raggruppamento di ${label}`,
  removeGroupingColumn: (label) => `Rimuovi ${label} dal raggruppamento`,
  moveGroupingColumn: (label) => `Sposta il raggruppamento ${label}`,
  groupingDropToRemove: "Rilascia qui per rimuovere il raggruppamento",
  groupingAggregateColumn: "Colonna di aggregazione",
  groupingAggregation: "Aggregazione gruppo",
  groupingAggregationDefault: "Predefinita",
  groupingAggregationNone: "Nessuna",
  groupingAggregations: "Aggregazioni",
  groupingAddAggregation: "Aggiungi colonna di aggregazione",
  groupingRestoreAggregations: "Ripristina valori predefiniti",
  groupingRemoveAggregation: (column) => `Rimuovi aggregazione di ${column}`,
  groupingAggregationFor: (column) => `Aggregazione di ${column}`,
  groupingAggregationReadOnly: "Impostata dall’app",
  groupingAggregationCustom: "Personalizzata",
  groupingAggregateRemoved: (column) => `Aggregazione di ${column} rimossa`,
  groupingAggregatesRestored: "Aggregazioni ripristinate ai valori predefiniti",
  groupingAverage: "Media",
  groupingAdded: (label) =>
    `La colonna ${label} è stata aggiunta al raggruppamento`,
  groupingRemoved: (label) =>
    `La colonna ${label} è stata rimossa dal raggruppamento`,
  groupingMoved: (label, position) =>
    `La colonna ${label} è stata spostata alla posizione di raggruppamento ${position}`,
  groupingAggregateChanged: (label, aggregation) =>
    `Aggregazione di ${label} cambiata in ${aggregation}`,
  gridRangeCopied: (cells) => `${cells} celle copiate`,
  gridRangeCopyFailed: "Copia non riuscita",
  gridRangePasted: (cells) => `${cells} celle incollate`,
  gridRangePasteFailed: "Incolla non riuscito",
  gridRangeFilled: (cells) => `${cells} celle riempite`,
  gridFillHandle: "Riempi dalla selezione",
  selectionCount: "Conteggio",
  selectionSum: "Somma",
  selectionAverage: "Media",
  selectionMin: "Min",
  selectionMax: "Max",
  editUndone: (cells) => `${cells} celle ripristinate`,
  editRedone: (cells) => `${cells} celle ripetute`,
  editNothingToUndo: "Niente da annullare",
  findInTable: "Cerca nella tabella",
  findPlaceholder: "Cerca nella tabella",
  findMatchCount: (current, total) =>
    total === 0 ? "Nessun risultato" : `${current} di ${total}`,
  findPrevious: "Risultato precedente",
  findNext: "Risultato successivo",
  findClose: "Chiudi la ricerca",
  sidePanel: "Impostazioni tabella",
  contextMenu: "Azioni tabella",
  commandPalette: "Riquadro comandi",
  commandSearch: "Cerca comandi",
  commandEmpty: "Nessun comando corrispondente",
  print: "Stampa",
  density: "Densità",
  densityComfortable: "Comoda",
  densityCompact: "Compatta",
  enterFullscreen: "Schermo intero",
  exitFullscreen: "Esci da schermo intero",
  copyCells: "Copia",
  cutCells: "Taglia",
  closePanel: "Chiudi pannello",
  pivotRows: "Righe",
  pivotColumns: "Colonne",
  pivotMeasures: "Misure",
  pivotAdd: "Aggiungi campo",
  pivotRemove: "Rimuovi campo",
  pivotMoveUp: "Sposta su",
  pivotMoveDown: "Sposta giù",
  pivotAggregation: "Aggregazione",
  pivotTotal: "Totale",
  pivotGrandTotal: "Totale generale",
  gridCellPosition: (row, total) => `riga ${row} di ${total}`,
  gridRangeSelection: ({ fromRow, toRow, fromColumn, toColumn, cells }) =>
    `Righe da ${fromRow} a ${toRow}, colonne da ${fromColumn} a ${toColumn} selezionate, ${cells} celle`,
  noticeVirtualizePaged:
    "La virtualizzazione è disattivata: questa tabella paginata mostra una pagina alla volta.",
  noticePinNested:
    "Il blocco delle righe è disattivato con raggruppamento o albero attivi.",
  noticeReorderNested:
    "Il riordino delle righe è disattivato con raggruppamento o albero attivi.",
  noticeGroupingUnavailable:
    "Il raggruppamento è disattivato: questa origine non può raggruppare.",
  noticeExportAllPage:
    "Esporta tutto è disattivato: questa origine fornisce una pagina alla volta.",
  noticeEditWithoutWriter:
    "La modifica è disattivata: nessun gestore di scrittura è collegato.",
};
