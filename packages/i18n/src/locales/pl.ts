import type { TableLabels } from "@adapttable/core";

/**
 * Polish (`pl`) label preset.
 *
 * @public
 */
/** How this language names what became of one action. */
const RECEIPT_STATUS: Readonly<Record<string, string>> = {
  executed: "wykonano",
  staged: "przygotowano",
  partial: "wykonano częściowo",
  rejected: "odrzucono",
  "awaiting-approval": "oczekuje na zatwierdzenie",
  cancelled: "anulowano",
  stale: "przestarzałe",
  failed: "niepowodzenie",
};

/** How this language names the capabilities a reader is asked to confirm. */
const CAPABILITY: Readonly<Record<string, string>> = {
  "edit.cells": "edytuj komórki",
  "rows.add": "dodaj wiersze",
  "rows.delete": "usuń wiersze",
  "rows.reorder": "zmień kolejność wierszy",
  "export.run": "eksportuj",
};

export const pl: Required<TableLabels> = {
  table: "Tabela danych",
  search: "Szukaj",
  searchPlaceholder: "Szukaj…",
  noData: "Brak danych",
  noResults: "Brak wyników pasujących do filtrów",
  pageSelected: (count) => `Zaznaczono ${count} na tej stronie`,
  selectAllMatching: (total) => `Zaznacz ${total} pasujących`,
  allMatchingSelected: (total) => `Wybrano wszystkie ${total} pasujące`,
  expandRow: "Rozwiń wiersz",
  collapseRow: "Zwiń wiersz",
  operator: "Operator",
  value: "Wartość",
  from: "Od",
  to: "Do",
  opEqual: "Równe",
  opAtLeast: "Co najmniej",
  opAtMost: "Co najwyżej",
  opBetween: "Pomiędzy",
  opOn: "Dnia",
  opOnOrAfter: "Dnia lub później",
  opOnOrBefore: "Dnia lub wcześniej",
  opNotEqual: "Różne",
  opGreater: "Większe niż",
  opLess: "Mniejsze niż",
  opContains: "Zawiera",
  opNotContains: "Nie zawiera",
  opStartsWith: "Zaczyna się od",
  opEndsWith: "Kończy się na",
  opEmpty: "Jest puste",
  opNotEmpty: "Nie jest puste",
  opIn: "Jest jednym z",
  opNotIn: "Nie jest żadnym z",
  opBefore: "Przed",
  opAfter: "Po",
  opRelative: "Względne",
  relToday: "Dziś",
  relYesterday: "Wczoraj",
  relTomorrow: "Jutro",
  relThisWeek: "Ten tydzień",
  relThisMonth: "Ten miesiąc",
  relPreviousMonth: "Poprzedni miesiąc",
  relLastN: "Ostatnie N dni",
  relNextN: "Następne N dni",
  boolAny: "Dowolne",
  boolTrue: "Prawda",
  boolFalse: "Fałsz",
  savedViews: "Zapisane widoki",
  saveView: "Zapisz widok",
  viewName: "Nazwa widoku",
  deleteView: "Usuń widok",
  renameView: "Zmień nazwę widoku",
  applyView: "Zastosuj widok",
  moveViewUp: "Przenieś widok wyżej",
  moveViewDown: "Przenieś widok niżej",
  setDefaultView: "Ustaw jako domyślny",
  defaultViewBadge: "Domyślny",
  readOnlyViewBadge: "Tylko do odczytu",
  loading: "Ładowanie…",
  loadMore: "Załaduj więcej",
  filters: "Filtry",
  clearAll: "Wyczyść wszystko",
  removeFilter: (label) => `Usuń filtr: ${label}`,
  filtersDone: "Gotowe",
  filterTree: "Zaawansowane",
  filterAddCondition: "Dodaj warunek",
  filterAddGroup: "Dodaj grupę",
  filterCombinatorAnd: "I",
  filterCombinatorOr: "LUB",
  filterRemoveCondition: "Usuń warunek",
  filterRemoveGroup: "Usuń grupę",
  filterField: "Pole",
  checklistSearch: "Szukaj wartości",
  checklistClear: "Wyczyść",
  checklistNoValues: "Brak pasujących wartości",
  headerFilters: "Filtry kolumn",
  sortBy: "Sortuj według",
  rowsPerPage: "Wierszy na stronę",
  actions: "Akcje",
  selectAll: "Zaznacz wszystko",
  selectRow: "Zaznacz wiersz",
  selectColumn: "Zaznacz kolumnę",
  cancel: "Anuluj",
  retry: "Spróbuj ponownie",
  errorTitle: "Wystąpił błąd",
  errorMessage: "Nie udało się załadować tych danych.",
  previousPage: "Poprzednia strona",
  nextPage: "Następna strona",
  goToPage: (page) => `Przejdź do strony ${page}`,
  selectedCount: (count) =>
    count === 1 ? "1 zaznaczony" : `${count} zaznaczonych`,
  showing: ({ from, to, total }) => `Wyświetlanie ${from}–${to} z ${total}`,
  pageOf: ({ page, total }) => `Strona ${page} z ${total}`,
  columns: "Kolumny",
  pinStart: "Przypnij na początku",
  pinEnd: "Przypnij na końcu",
  unpin: "Odepnij",
  moveStart: "Przenieś na początek",
  moveEnd: "Przenieś na koniec",
  resetColumns: "Resetuj kolumny",
  autoSizeColumns: "Dopasuj kolumny do treści",
  autoSizeColumn: "Dopasuj kolumnę do treści",
  resizeColumn: "Zmień rozmiar kolumny",
  showColumn: "Pokaż kolumnę",
  hideColumn: "Ukryj kolumnę",
  searchColumns: "Szukaj kolumn",
  showAllColumns: "Pokaż wszystkie",
  hideAllColumns: "Ukryj wszystkie",
  unpinAllColumns: "Odepnij wszystkie",
  resetColumn: "Resetuj kolumnę",
  renameColumn: "Zmień nazwę kolumny",
  columnName: "Nazwa kolumny",
  saveColumnName: "Zapisz nazwę",
  cancelColumnRename: "Anuluj",
  columnNameRequired: "Wprowadź nazwę kolumny.",
  columnRenamed: ({ previous, name }) =>
    `Kolumna ${previous} została zmieniona na ${name}`,
  sortAscending: "Sortuj rosnąco",
  sortDescending: "Sortuj malejąco",
  sortedBy: ({ column, ascending }) =>
    `Sortowane według ${column}, ${ascending ? "rosnąco" : "malejąco"}`,
  sortingCleared: "Usunięto sortowanie",
  filterColumn: "Filtruj kolumnę",
  columnActions: "Akcje kolumny",
  exportCsv: "Eksportuj CSV",
  exportFile: (format) => `Eksportuj ${format.toUpperCase()}`,
  exportStarted: "Przygotowywanie eksportu",
  exportProgress: (progress) => `Eksport ukończony w ${progress}%`,
  exportDone: "Eksport ukończony",
  exportFailed: "Błąd eksportu",
  exportCancelled: "Eksport anulowany",
  exportDownload: "Pobierz eksport",
  exportDismiss: "Zamknij eksport",
  editCell: "Edytuj komórkę",
  undoEdit: "Cofnij",
  redoEdit: "Ponów",
  editRow: "Edytuj wiersz",
  saveRow: "Zapisz wiersz",
  pendingRows: (count) =>
    count === 1
      ? "1 niezapisany wiersz"
      : `${String(count)} niezapisanych wierszy`,
  saveAll: "Zapisz wszystko",
  cancelAll: "Anuluj wszystko",
  approveProposal: "Zatwierdź",
  rejectProposal: "Odrzuć",
  proposalValueUnavailable: "Niedostępne",
  proposalSummary: ({ changes, rows }) => {
    const left =
      changes === 1
        ? "1 zaproponowana zmiana"
        : "{c} zaproponowanych zmian".replace("{c}", String(changes));
    if (rows <= 1) return left;
    return `${left} ${"w {r} wierszach".replace("{r}", String(rows))}`;
  },
  reviewAllProposals: (count) =>
    "Przejrzyj {c} zmian".replace("{c}", String(count)),
  backToConversation: "Wróć do rozmowy",
  approveAllProposals: "Zatwierdź wszystko",
  approveRemainingProposals: "Zatwierdź pozostałe",
  rejectAllProposals: "Odrzuć wszystko",
  rejectRemainingProposals: "Odrzuć pozostałe",
  alwaysAllowProposal: "Zawsze zezwalaj",
  proposalTally: ({ pending, approved, rejected }) =>
    "{a} zatwierdzono · {j} odrzucono · {p} oczekuje"
      .replace("{a}", String(approved))
      .replace("{j}", String(rejected))
      .replace("{p}", String(pending)),
  approvalWaitingElsewhere: "Zmiana czeka na Twoją decyzję.",
  pendingProposals: (count) =>
    count === 1
      ? "1 zaproponowana zmiana"
      : `${String(count)} zaproponowanych zmian`,
  proposalChange: ({ row, column, before, after }) => {
    const field = column ? `${row} · ${column}` : row;
    if (before === undefined && after === undefined) return field;
    return `${field}: ${before ?? "—"} → ${after ?? "—"}`;
  },
  assistantTitle: "Asystent tabeli",
  assistantOpen: "Zapytaj AI",
  assistantClose: "Zamknij",
  assistantSettings: "Ustawienia asystenta",
  assistantEmpty: "Co chcesz zrobić z tą tabelą?",
  assistantPlaceholder: "Zadaj pytanie o tej tabeli…",
  assistantSend: "Wyślij",
  assistantStop: "Zatrzymaj",
  assistantVoiceStart: "Dyktuj",
  assistantVoiceStop: "Zatrzymaj dyktowanie",
  assistantVoiceListening: "Słucham",
  assistantVoiceLanguage: "Język dyktowania",
  assistantYou: "Ty",
  assistantSpeaker: "Asystent",
  assistantNewMessages: "Nowe wiadomości",
  assistantUnavailable: "Asystent nie jest podłączony.",
  assistantDetached:
    "Połączenie zostało utracone. Praca może być nadal w toku.",
  assistantRejoin: "Wznów",
  assistantProgress: (done, total) =>
    total === undefined
      ? `${String(done)} wykonano`
      : `${String(done)} z ${String(total)}`,
  assistantBackToTable: "Wróć do tabeli",
  assistantDetail: "Szczegóły",
  assistantSaveInTable: "Zapisz w tabeli, aby zachować tę zmianę.",
  assistantUndo: "Cofnij",
  assistantUnresolved: (code) =>
    (
      ({
        "continuation-exhausted":
          "To wymaga więcej kroków niż pozwala na to jeden cykl. Poproś o część.",
        "continuation-limit":
          "To wymaga więcej kroków niż pozwala na to jeden cykl. Poproś o część.",
        "resume-limit":
          "To wymaga więcej kroków niż pozwala na to jeden cykl. Poproś o część.",
        "discovery-exhausted": "Asystent nie wiedział, jak tego tutaj dokonać.",
        "repeated-plan": "Asystent prosił o to samo dwa razy i się zatrzymał.",
        "question-unanswered": "To wymaga Twojej odpowiedzi, aby zakończyć.",
        "approval-unavailable":
          "To wymaga zatwierdzenia, a nie ma miejsca, aby o nie poprosić.",
        "interrupt-unsupported":
          "Asystent poprosił o coś, czego ta tabela nie potrafi zrobić.",
        "output-denied": "Część tego nie została wykonana.",
        "not-run": "To nie zostało uruchomione.",
      }) as Record<string, string>
    )[code],
  assistantUndoBlocked: (code) =>
    (
      ({
        "table-moved": "Tabela od tego czasu się zmieniła.",
        "cannot-restore": "Część tego nie może zostać cofnięta.",
      }) as Record<string, string>
    )[code],
  assistantAnswerLabel: "Twoja odpowiedź",
  assistantAnswerPlaceholder: "Napisz odpowiedź",
  assistantAnswerSend: "Odpowiedz",
  assistantAlwaysAllowedTitle: "Nie pytaj już o",
  assistantAlwaysAllowedRevoke: (capability) =>
    `Zapytaj ponownie o ${CAPABILITY[capability] ?? capability}`,
  assistantCapabilityName: (capability) => CAPABILITY[capability],
  assistantActions: (count) =>
    count === 1 ? "1 akcja" : `${String(count)} akcji`,
  assistantActionsTitle: "Co zostało zmienione w tej turze",
  assistantUndoAll: "Cofnij wszystko",
  assistantExamples: "Skróty",
  assistantReceiptChange: ({ before, after }) =>
    `Zmieniono z ${before} na ${after}`,
  assistantReceiptProposed: ({ before, after }) =>
    `Proponowane: z ${before} na ${after}`,
  assistantReceiptAction: ({ kind, status, cleared }) => {
    if (!kind) return undefined;
    const scope = cleared ? `${kind}-cleared` : kind;
    return (
      {
        "filter/executed": "Filtr zastosowany",
        "filter/staged": "Filtr przygotowany",
        "sort/executed": "Posortowano",
        "group/executed": "Zgrupowano",
        "pin/executed": "Kolumna przypięta",
        "edit/executed": "Zapisano",
        "edit/staged": "Edycja przygotowana — bez zapisywania",
        "edit/awaiting-approval": "Edycja oczekuje na zatwierdzenie",
        "edit/partial": "Część edycji została zapisana, a część odrzucona",
        "edit/rejected": "Edycja odrzucona",
        "filter-cleared/executed": "Wyczyszczono filtry",
        "sort-cleared/executed": "Usunięto sortowanie",
        "search/executed": "Zastosowano wyszukiwanie",
        "search-cleared/executed": "Wyczyszczono wyszukiwanie",
        "group-cleared/executed": "Usunięto grupowanie",
        "pin-cleared/executed": "Odepnij kolumnę",
        "pinRow/executed": "Wiersz przypięty",
        "pinRow-cleared/executed": "Wiersz odpięty",
        "page/executed": "Zmieniono stronę",
        "aggregate/executed": "Zmieniono sumy",
        "select/executed": "Zmieniono zaznaczenie",
        "read/executed": "Tabela została sprawdzona",
        "operation/executed": "Wykonano",
        "operation/awaiting-approval": "Czeka na Ciebie",
        "operation/rejected": "Odrzucono",
        "export/executed": "Wyeksportowano",
        "add/executed": "Dodano wiersz",
        "add/awaiting-approval": "Nowy wiersz oczekuje na zatwierdzenie",
        "add/rejected": "Nowy wiersz odrzucony",
        "delete/executed": "Usunięto wiersze",
        "delete/awaiting-approval": "Usunięcie oczekuje na zatwierdzenie",
        "delete/partial": "Część wierszy usunięto, a część zachowano",
        "delete/rejected": "Usunięcie odrzucone",
        "reorder/executed": "Przeniesiono wiersze",
      } as Record<string, string>
    )[`${scope}/${status}`];
  },
  assistantReceiptTerms: ({ kind, terms, direction }) => {
    const parts = (terms ?? [])
      .map((term) => {
        if (!term.column) return term.value;
        if (!term.value) return term.column;
        return kind === "edit"
          ? `${term.column} ustawiono na ${term.value}`
          : `${term.column}: ${term.value}`;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length === 0) return undefined;
    const joined = parts.join(", ");
    if (!direction) return joined;
    return `${joined}, ${direction === "desc" ? "malejąco" : "rosnąco"}`;
  },
  assistantConnection: (status) =>
    ({
      idle: "Bezczynny",
      connecting: "Łączenie…",
      ready: "Gotowe",
      sending: "Pracuję…",
      "awaiting-approval": "Oczekuje na zatwierdzenie",
      "awaiting-user": "Oczekuje na Ciebie",
      error: "Błąd",
      disconnected: "Brak połączenia",
    })[status] ?? "Gotowe",
  assistantReceipt: ({ capability, status }) => {
    const what = RECEIPT_STATUS[status] ?? status;
    return capability ? `${capability}: ${what}` : what;
  },
  assistantReceiptStatus: (status) => RECEIPT_STATUS[status] ?? status,
  addRow: "Dodaj wiersz",
  duplicateRow: "Duplikuj wiersz",
  deleteRow: "Usuń wiersz",
  deleteRowConfirm: "Usunąć ten wiersz? Tej akcji nie da się cofnąć.",
  rowActionsMenu: "Akcje wiersza",
  editConflict: "Ten wiersz zmienił się, gdy go edytowałeś",
  keepMine: "Zachowaj moje",
  takeTheirs: "Weź nowe",
  theirsValue: (value) => `Nowe: ${value}`,
  reorderRow: "Zmień kolejność wiersza",
  moveRowUp: "Przenieś wiersz wyżej",
  moveRowDown: "Przenieś wiersz niżej",
  rowLifted: (position) => `Wiersz ${String(position)} podniesiony`,
  rowMoved: (from, to) =>
    `Wiersz przeniesiono z ${String(from)} do ${String(to)}`,
  rowReorderCancelled: "Anulowano zmianę kolejności",
  rowMoveOptions: "Opcje przenoszenia wiersza",
  moveToGroup: "Przenieś do grupy…",
  moveUnder: "Przenieś pod…",
  moveToTopLevel: "Przenieś do najwyższego poziomu",
  confirmRowMoveTitle: "Potwierdź przeniesienie wiersza",
  confirmRowMoveDescription: (row, from, to) =>
    `Przenieść ${row} z ${from} do ${to}?`,
  confirmRowMove: "Przenieś",
  rowMovedToGroup: (group) => `Wiersz przeniesiono do ${group}`,
  rowMovedUnder: (parent) => `Wiersz przeniesiono pod ${parent}`,
  moveRejectedPolicyNever:
    "Przenoszenie wierszy pomiędzy limitami jest wyłączone",
  moveRejectedSorted: "Wyczyść sortowanie przed zmianą kolejności wierszy",
  moveRejectedCycle:
    "Wiersz nie może zostać przeniesiony do samego siebie ani do swojego potomka",
  moveUnavailable: "To przeniesienie wiersza jest niedostępne",
  rootLevel: "Poziom najwyższy",
  pinToTop: "Przypnij na górze",
  pinToBottom: "Przypnij na dole",
  unpinRow: "Odepnij wiersz",
  pinnedSummaryRow: "Wiersz podsumowania",
  pinnedSummaryTop: "Wiersze podsumowania przypięte na górze",
  pinnedSummaryBottom: "Wiersze podsumowania przypięte na dole",
  rowSeparator: "Separator",
  expandColumnGroup: "Rozwiń grupę kolumn",
  collapseColumnGroup: "Zwiń grupę kolumn",
  moreGroups: (remaining) => `Pokaż ${remaining} więcej grup`,
  moreRowsInGroup: (remaining) => `Pokaż ${remaining} więcej w tej grupie`,
  groupTotal: (label) => `Suma ${label}`,
  expandGroup: "Rozwiń grupę",
  collapseGroup: "Zwiń grupę",
  groupCount: (count) => `(${count})`,
  groupingPanel: "Grupowanie wierszy",
  groupingDropColumns: "Przeciągnij kolumny tutaj, aby pogrupować",
  addGroupingColumn: "Dodaj kolumnę grupującą",
  groupByColumn: (label) => `Grupuj według ${label}`,
  ungroupColumn: (label) => `Rozgrupuj ${label}`,
  removeGroupingColumn: (label) => `Usuń ${label} z grupowania`,
  moveGroupingColumn: (label) => `Przenieś grupowanie ${label}`,
  groupingDropToRemove: "Upuść tutaj, aby usunąć grupowanie",
  groupingAggregateColumn: "Kolumna agregacji",
  groupingAggregation: "Agregacja grupy",
  groupingAggregationDefault: "Domyślna",
  groupingAggregationNone: "Brak",
  groupingAggregations: "Agregacje",
  groupingAddAggregation: "Dodaj kolumnę agregacji",
  groupingRestoreAggregations: "Przywróć wartości domyślne",
  groupingRemoveAggregation: (column) => `Usuń agregację z ${column}`,
  groupingAggregationFor: (column) => `Agregacja dla ${column}`,
  groupingAggregationReadOnly: "Zdefiniowane przez aplikację",
  groupingAggregationCustom: "Niestandardowe",
  groupingAggregateRemoved: (column) => `Usunięto agregację z ${column}`,
  groupingAggregatesRestored: "Przywrócono agregacje do wartości domyślnych",
  groupingAverage: "Średnia",
  groupingAdded: (label) => `Dodano ${label} do grupowania`,
  groupingRemoved: (label) => `Usunięto ${label} z grupowania`,
  groupingMoved: (label, position) =>
    `Przeniesiono ${label} na pozycję grupowania ${position}`,
  groupingAggregateChanged: (label, aggregation) =>
    `Agregacja dla ${label} zmieniona na ${aggregation}`,
  gridRangeCopied: (cells) => `${cells} komórek skopiowanych`,
  gridRangeCopyFailed: "Błąd kopiowania",
  gridRangePasted: (cells) => `${cells} komórek wklejonych`,
  gridRangePasteFailed: "Błąd wklejania",
  gridRangeFilled: (cells) => `${cells} komórek wypełnionych`,
  gridFillHandle: "Wypełnij z zaznaczenia",
  selectionCount: "Liczba",
  selectionSum: "Suma",
  selectionAverage: "Śr.",
  selectionMin: "Min",
  selectionMax: "Maks",
  editUndone: (cells) => `${cells} komórek przywróconych`,
  editRedone: (cells) => `${cells} komórek ponowionych`,
  editNothingToUndo: "Nic do cofnięcia",
  findInTable: "Szukaj w tabeli",
  findPlaceholder: "Szukaj w tabeli",
  findMatchCount: (current, total) =>
    total === 0 ? "Brak wyników" : `${current} z ${total}`,
  findPrevious: "Poprzedni wynik",
  findNext: "Następny wynik",
  findClose: "Zamknij wyszukiwanie",
  sidePanel: "Ustawienia tabeli",
  contextMenu: "Akcje tabeli",
  commandPalette: "Paleta poleceń",
  commandSearch: "Szukaj poleceń",
  commandEmpty: "Brak pasujących poleceń",
  print: "Drukuj",
  density: "Gęstość",
  densityComfortable: "Wygodna",
  densityCompact: "Kompaktowa",
  enterFullscreen: "Pełny ekran",
  exitFullscreen: "Wyjdź z pełnego ekranu",
  copyCells: "Kopiuj",
  cutCells: "Wytnij",
  closePanel: "Zamknij panel",
  pivotRows: "Wiersze",
  pivotColumns: "Kolumny",
  pivotMeasures: "Miary",
  pivotAdd: "Dodaj pole",
  pivotRemove: "Usuń pole",
  pivotMoveUp: "W górę",
  pivotMoveDown: "W dół",
  pivotAggregation: "Agregacja",
  pivotTotal: "Suma",
  pivotGrandTotal: "Suma ogólna",
  gridCellPosition: (row, total) => `wiersz ${row} z ${total}`,
  gridRangeSelection: ({ fromRow, toRow, fromColumn, toColumn, cells }) =>
    `Wybrano wiersze od ${fromRow} do ${toRow}, kolumny od ${fromColumn} do ${toColumn}, ${cells} komórek`,
  noticeVirtualizePaged:
    "Wirtualizacja jest wyłączona: ta tabela paginowana wyświetla po jednej stronie na raz.",
  noticePinNested:
    "Przypinanie wierszy jest wyłączone podczas grupowania lub drzewa.",
  noticeReorderNested:
    "Zmiana kolejności wierszy jest wyłączona podczas grupowania lub drzewa.",
  noticeGroupingUnavailable:
    "Grupowanie jest wyłączone: to źródło nie obsługuje grupowania.",
  noticeExportAllPage:
    "Eksport wszystkich stron jest wyłączony: to źródło dostarcza dane strona po stronie.",
  noticeEditWithoutWriter: "Edycja jest wyłączona: brak kontrolera zapisu.",
};
