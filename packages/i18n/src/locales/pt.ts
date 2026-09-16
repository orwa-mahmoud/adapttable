import type { TableLabels } from "@adapttable/core";

/**
 * Portuguese (`pt`) label preset.
 *
 * @public
 */
/** How this language names what became of one action. */
const RECEIPT_STATUS: Readonly<Record<string, string>> = {
  executed: "concluído",
  staged: "preparado",
  partial: "feito em parte",
  rejected: "rejeitado",
  "awaiting-approval": "aguardando você",
  cancelled: "cancelado",
  stale: "desatualizado",
  failed: "falhou",
};

/** How this language names the capabilities a reader is asked to confirm. */
const CAPABILITY: Readonly<Record<string, string>> = {
  "edit.cells": "editar células",
  "rows.add": "adicionar linhas",
  "rows.delete": "excluir linhas",
  "rows.reorder": "reordenar linhas",
  "export.run": "exportar",
};

export const pt: Required<TableLabels> = {
  table: "Tabela de dados",
  search: "Pesquisar",
  searchPlaceholder: "Pesquisar…",
  noData: "Sem dados",
  noResults: "Nenhum resultado corresponde aos filtros",
  pageSelected: (count) => `Todos os ${count} desta página selecionados`,
  selectAllMatching: (total) => `Selecionar todos os ${total} correspondentes`,
  allMatchingSelected: (total) =>
    `Todos os ${total} correspondentes selecionados`,
  expandRow: "Expandir linha",
  collapseRow: "Recolher linha",
  operator: "Operador",
  value: "Valor",
  from: "De",
  to: "Até",
  opEqual: "Igual",
  opAtLeast: "No mínimo",
  opAtMost: "No máximo",
  opBetween: "Entre",
  opOn: "Em",
  opOnOrAfter: "Em ou depois",
  opOnOrBefore: "Em ou antes",
  opNotEqual: "Diferente",
  opGreater: "Maior que",
  opLess: "Menor que",
  opContains: "Contém",
  opNotContains: "Não contém",
  opStartsWith: "Começa com",
  opEndsWith: "Termina com",
  opEmpty: "Está vazio",
  opNotEmpty: "Não está vazio",
  opIn: "É um de",
  opNotIn: "Não é nenhum de",
  opBefore: "Antes",
  opAfter: "Depois",
  opRelative: "Relativo",
  relToday: "Hoje",
  relYesterday: "Ontem",
  relTomorrow: "Amanhã",
  relThisWeek: "Esta semana",
  relThisMonth: "Este mês",
  relPreviousMonth: "Mês anterior",
  relLastN: "Últimos N dias",
  relNextN: "Próximos N dias",
  boolAny: "Qualquer",
  boolTrue: "Verdadeiro",
  boolFalse: "Falso",
  savedViews: "Visualizações salvas",
  saveView: "Salvar visualização",
  viewName: "Nome da visualização",
  deleteView: "Excluir visualização",
  renameView: "Renomear vista",
  applyView: "Aplicar vista",
  moveViewUp: "Mover para cima",
  moveViewDown: "Mover para baixo",
  setDefaultView: "Definir como padrão",
  defaultViewBadge: "Padrão",
  readOnlyViewBadge: "Somente leitura",
  loading: "Carregando…",
  loadMore: "Carregar mais",
  filters: "Filtros",
  clearAll: "Limpar tudo",
  removeFilter: (label) => `Remover filtro: ${label}`,
  filtersDone: "Concluir",
  filterTree: "Avançado",
  filterAddCondition: "Adicionar condição",
  filterAddGroup: "Adicionar grupo",
  filterCombinatorAnd: "E",
  filterCombinatorOr: "OU",
  filterRemoveCondition: "Remover condição",
  filterRemoveGroup: "Remover grupo",
  filterField: "Campo",
  checklistSearch: "Pesquisar valores",
  checklistClear: "Limpar",
  checklistNoValues: "Nenhum valor correspondente",
  headerFilters: "Filtros de coluna",
  sortBy: "Ordenar por",
  rowsPerPage: "Linhas por página",
  actions: "Ações",
  selectAll: "Selecionar tudo",
  selectRow: "Selecionar linha",
  selectColumn: "Selecionar coluna",
  cancel: "Cancelar",
  retry: "Tentar novamente",
  errorTitle: "Algo deu errado",
  errorMessage: "Não foi possível carregar estes dados.",
  previousPage: "Página anterior",
  nextPage: "Próxima página",
  goToPage: (page) => `Ir para a página ${page}`,
  selectedCount: (count) =>
    count === 1 ? "1 selecionado" : `${count} selecionados`,
  showing: ({ from, to, total }) => `Mostrando ${from}–${to} de ${total}`,
  pageOf: ({ page, total }) => `Página ${page} de ${total}`,
  columns: "Colunas",
  pinStart: "Fixar no início",
  pinEnd: "Fixar no fim",
  unpin: "Desafixar",
  moveStart: "Mover para o início",
  moveEnd: "Mover para o fim",
  resetColumns: "Redefinir colunas",
  autoSizeColumns: "Ajustar colunas ao conteúdo",
  autoSizeColumn: "Ajustar coluna ao conteúdo",
  resizeColumn: "Redimensionar coluna",
  showColumn: "Mostrar coluna",
  hideColumn: "Ocultar coluna",
  searchColumns: "Pesquisar colunas",
  showAllColumns: "Mostrar todas",
  hideAllColumns: "Ocultar todas",
  unpinAllColumns: "Desafixar todas",
  resetColumn: "Redefinir coluna",
  renameColumn: "Renomear coluna",
  columnName: "Nome da coluna",
  saveColumnName: "Salvar nome",
  cancelColumnRename: "Cancelar",
  columnNameRequired: "Digite um nome para a coluna.",
  columnRenamed: ({ previous, name }) =>
    `Coluna ${previous} renomeada para ${name}`,
  sortAscending: "Ordenar crescente",
  sortDescending: "Ordenar decrescente",
  sortedBy: ({ column, ascending }) =>
    `Ordenado por ${column}, ${ascending ? "crescente" : "decrescente"}`,
  sortingCleared: "Ordenação removida",
  filterColumn: "Filtrar coluna",
  columnActions: "Ações da coluna",
  exportCsv: "Exportar CSV",
  exportFile: (format) => `Exportar ${format.toUpperCase()}`,
  exportStarted: "Preparando exportação",
  exportProgress: (progress) => `Exportação ${progress}% concluída`,
  exportDone: "Exportação concluída",
  exportFailed: "Falha na exportação",
  exportCancelled: "Exportação cancelada",
  exportDownload: "Baixar exportação",
  exportDismiss: "Fechar exportação",
  editCell: "Editar célula",
  undoEdit: "Desfazer",
  redoEdit: "Refazer",
  editRow: "Editar linha",
  saveRow: "Salvar linha",
  pendingRows: (count) =>
    count === 1 ? "1 linha não salva" : `${String(count)} linhas não salvas`,
  saveAll: "Salvar tudo",
  cancelAll: "Cancelar tudo",
  approveProposal: "Aprovar",
  rejectProposal: "Rejeitar",
  proposalValueUnavailable: "Indisponível",
  proposalSummary: ({ changes, rows }) => {
    const left =
      changes === 1
        ? "1 alteração proposta"
        : "{c} alterações propostas".replace("{c}", String(changes));
    if (rows <= 1) return left;
    return `${left} ${"em {r} linhas".replace("{r}", String(rows))}`;
  },
  reviewAllProposals: (count) =>
    "Rever as {c} alterações".replace("{c}", String(count)),
  backToConversation: "Voltar à conversa",
  approveAllProposals: "Aprovar tudo",
  approveRemainingProposals: "Aprovar o resto",
  rejectAllProposals: "Rejeitar tudo",
  rejectRemainingProposals: "Rejeitar o resto",
  alwaysAllowProposal: "Permitir sempre",
  proposalTally: ({ pending, approved, rejected }) =>
    "{a} aprovadas · {j} rejeitadas · {p} restantes"
      .replace("{a}", String(approved))
      .replace("{j}", String(rejected))
      .replace("{p}", String(pending)),
  approvalWaitingElsewhere: "Uma alteração aguarda a sua decisão.",
  pendingProposals: (count) =>
    count === 1
      ? "1 alteração proposta"
      : `${String(count)} alterações propostas`,
  proposalChange: ({ row, column, before, after }) => {
    const field = column ? `${row} · ${column}` : row;
    if (before === undefined && after === undefined) return field;
    return `${field}: ${before ?? "—"} → ${after ?? "—"}`;
  },
  assistantTitle: "Assistente da tabela",
  assistantOpen: "Perguntar à IA",
  assistantClose: "Fechar",
  assistantSettings: "Configurações do assistente",
  assistantEmpty: "O que você quer fazer com esta tabela?",
  assistantPlaceholder: "Pergunte sobre esta tabela…",
  assistantSend: "Enviar",
  assistantStop: "Parar",
  assistantVoiceStart: "Ditar",
  assistantVoiceStop: "Parar o ditado",
  assistantVoiceListening: "A ouvir",
  assistantVoiceLanguage: "Idioma do ditado",
  assistantYou: "Você",
  assistantSpeaker: "Assistente",
  assistantNewMessages: "Novas mensagens",
  assistantUnavailable: "O assistente não está conectado.",
  assistantDetached:
    "A conexão caiu. O trabalho pode ainda estar em andamento.",
  assistantRejoin: "Reconectar",
  assistantProgress: (done, total) =>
    total === undefined
      ? `${String(done)} concluídos`
      : `${String(done)} de ${String(total)}`,
  assistantBackToTable: "Voltar à tabela",
  assistantDetail: "Detalhes",
  assistantSaveInTable: "Salve na tabela para manter esta alteração.",
  assistantUndo: "Desfazer",
  assistantUnresolved: (code) =>
    (
      ({
        "continuation-exhausted":
          "Isso exige mais etapas do que um turno permite. Peça uma parte.",
        "continuation-limit":
          "Isso exige mais etapas do que um turno permite. Peça uma parte.",
        "resume-limit":
          "Isso exige mais etapas do que um turno permite. Peça uma parte.",
        "discovery-exhausted":
          "O assistente não descobriu como fazer isso aqui.",
        "repeated-plan": "O assistente pediu a mesma coisa duas vezes e parou.",
        "question-unanswered":
          "Isso precisa de uma resposta sua para concluir.",
        "approval-unavailable":
          "Isso precisa de aprovação e não há onde pedi-la.",
        "interrupt-unsupported":
          "O assistente pediu algo que esta tabela não faz.",
        "output-denied": "Parte disso não teve permissão para executar.",
        "not-run": "Isso não foi executado.",
      }) as Record<string, string>
    )[code],
  assistantUndoBlocked: (code) =>
    (
      ({
        "table-moved": "A tabela mudou desde então.",
        "cannot-restore": "Parte disto não pode ser revertida.",
      }) as Record<string, string>
    )[code],
  assistantAnswerLabel: "Sua resposta",
  assistantAnswerPlaceholder: "Digite uma resposta",
  assistantAnswerSend: "Responder",
  assistantAlwaysAllowedTitle: "Não pergunta mais sobre",
  assistantAlwaysAllowedRevoke: (capability) =>
    `Perguntar sobre ${CAPABILITY[capability] ?? capability} novamente`,
  assistantCapabilityName: (capability) => CAPABILITY[capability],
  assistantActions: (count) =>
    count === 1 ? "1 ação" : `${String(count)} ações`,
  assistantActionsTitle: "O que esta vez mudou",
  assistantUndoAll: "Desfazer tudo",
  assistantExamples: "Atalhos",
  assistantReceiptChange: ({ before, after }) =>
    `Alterado de ${before} para ${after}`,
  assistantReceiptProposed: ({ before, after }) =>
    `Proposto: de ${before} para ${after}`,
  assistantReceiptAction: ({ kind, status, cleared }) => {
    if (!kind) return undefined;
    const scope = cleared ? `${kind}-cleared` : kind;
    return (
      {
        "filter/executed": "Filtro aplicado",
        "filter/staged": "Filtro preparado",
        "sort/executed": "Ordenado",
        "group/executed": "Agrupado",
        "pin/executed": "Coluna fixada",
        "edit/executed": "Guardado",
        "edit/staged": "Edição preparada — não guardada",
        "edit/awaiting-approval": "Edição a aguardar aprovação",
        "edit/partial": "Algumas edições guardadas, outras recusadas",
        "edit/rejected": "Edição recusada",
        "filter-cleared/executed": "Filtros removidos",
        "sort-cleared/executed": "Ordenação removida",
        "search/executed": "Pesquisa aplicada",
        "search-cleared/executed": "Pesquisa limpa",
        "group-cleared/executed": "Agrupamento removido",
        "pin-cleared/executed": "Coluna desafixada",
        "pinRow/executed": "Linha fixada",
        "pinRow-cleared/executed": "Linha desafixada",
        "page/executed": "Página alterada",
        "aggregate/executed": "Totais alterados",
        "select/executed": "Seleção alterada",
        "read/executed": "Tabela consultada",
        "operation/executed": "Executado",
        "operation/awaiting-approval": "Aguardando você",
        "operation/rejected": "Recusado",
        "export/executed": "Exportado",
        "add/executed": "Linha adicionada",
        "add/awaiting-approval": "Nova linha aguardando aprovação",
        "add/rejected": "Nova linha recusada",
        "delete/executed": "Linhas excluídas",
        "delete/awaiting-approval": "Exclusão aguardando aprovação",
        "delete/partial": "Algumas linhas excluídas, outras mantidas",
        "delete/rejected": "Exclusão recusada",
        "reorder/executed": "Linhas movidas",
      } as Record<string, string>
    )[`${scope}/${status}`];
  },
  assistantReceiptTerms: ({ kind, terms, direction }) => {
    const parts = (terms ?? [])
      .map((term) => {
        if (!term.column) return term.value;
        if (!term.value) return term.column;
        return kind === "edit"
          ? `${term.column} definido como ${term.value}`
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
      idle: "Ocioso",
      connecting: "Conectando…",
      ready: "Pronto",
      sending: "Trabalhando…",
      "awaiting-approval": "Aguardando você",
      "awaiting-user": "Aguardando você",
      error: "Erro",
      disconnected: "Sem conexão",
    })[status] ?? "Pronto",
  assistantReceipt: ({ capability, status }) => {
    const what = RECEIPT_STATUS[status] ?? status;
    return capability ? `${capability}: ${what}` : what;
  },
  assistantReceiptStatus: (status) => RECEIPT_STATUS[status] ?? status,
  addRow: "Adicionar linha",
  duplicateRow: "Duplicar linha",
  deleteRow: "Excluir linha",
  deleteRowConfirm: "Excluir esta linha? Não é possível desfazer.",
  rowActionsMenu: "Ações da linha",
  editConflict: "Esta linha mudou enquanto você a editava",
  keepMine: "Manter o meu",
  takeTheirs: "Usar o novo",
  theirsValue: (value) => `O deles: ${value}`,
  reorderRow: "Reordenar linha",
  moveRowUp: "Mover linha para cima",
  moveRowDown: "Mover linha para baixo",
  rowLifted: (position) => `Linha ${String(position)} levantada`,
  rowMoved: (from, to) => `Linha movida de ${String(from)} para ${String(to)}`,
  rowReorderCancelled: "Reordenação cancelada",
  rowMoveOptions: "Opções de movimentação da linha",
  moveToGroup: "Mover para o grupo…",
  moveUnder: "Mover para baixo de…",
  moveToTopLevel: "Mover para o nível superior",
  confirmRowMoveTitle: "Confirmar movimentação da linha",
  confirmRowMoveDescription: (row, from, to) =>
    `Mover ${row} de ${from} para ${to}?`,
  confirmRowMove: "Mover",
  rowMovedToGroup: (group) => `Linha movida para ${group}`,
  rowMovedUnder: (parent) => `Linha movida para baixo de ${parent}`,
  moveRejectedPolicyNever:
    "A movimentação de linhas entre limites está desativada",
  moveRejectedSorted: "Limpe a ordenação antes de alterar a ordem das linhas",
  moveRejectedCycle:
    "Uma linha não pode ser movida para dentro de si mesma ou de uma descendente",
  moveUnavailable: "Esta movimentação de linha não está disponível",
  rootLevel: "Nível superior",
  pinToTop: "Fixar no topo",
  pinToBottom: "Fixar no fundo",
  unpinRow: "Desafixar linha",
  pinnedSummaryRow: "Linha de resumo",
  pinnedSummaryTop: "Linhas de resumo fixadas no topo",
  pinnedSummaryBottom: "Linhas de resumo fixadas embaixo",
  rowSeparator: "Separador",
  expandColumnGroup: "Expandir grupo de colunas",
  collapseColumnGroup: "Recolher grupo de colunas",
  moreGroups: (remaining) => `Mostrar mais ${remaining} grupos`,
  moreRowsInGroup: (remaining) => `Mostrar mais ${remaining} neste grupo`,
  groupTotal: (label) => `Total ${label}`,
  expandGroup: "Expandir grupo",
  collapseGroup: "Recolher grupo",
  groupCount: (count) => `(${count})`,
  groupingPanel: "Agrupamento de linhas",
  groupingDropColumns: "Arraste colunas aqui para agrupar",
  addGroupingColumn: "Adicionar coluna de agrupamento",
  groupByColumn: (label) => `Agrupar por ${label}`,
  ungroupColumn: (label) => `Desagrupar ${label}`,
  removeGroupingColumn: (label) => `Remover ${label} do agrupamento`,
  moveGroupingColumn: (label) => `Mover o agrupamento de ${label}`,
  groupingDropToRemove: "Solte aqui para remover o agrupamento",
  groupingAggregateColumn: "Coluna de agregação",
  groupingAggregation: "Agregação do grupo",
  groupingAggregationDefault: "Padrão",
  groupingAggregationNone: "Nenhuma",
  groupingAggregations: "Agregações",
  groupingAddAggregation: "Adicionar coluna de agregação",
  groupingRestoreAggregations: "Restaurar padrões",
  groupingRemoveAggregation: (column) => `Remover agregação de ${column}`,
  groupingAggregationFor: (column) => `Agregação de ${column}`,
  groupingAggregationReadOnly: "Definida pelo aplicativo",
  groupingAggregationCustom: "Personalizada",
  groupingAggregateRemoved: (column) => `Agregação de ${column} removida`,
  groupingAggregatesRestored: "Agregações restauradas aos padrões",
  groupingAverage: "Média",
  groupingAdded: (label) => `${label} adicionado ao agrupamento`,
  groupingRemoved: (label) => `${label} removido do agrupamento`,
  groupingMoved: (label, position) =>
    `${label} movido para a posição de agrupamento ${position}`,
  groupingAggregateChanged: (label, aggregation) =>
    `Agregação de ${label} alterada para ${aggregation}`,
  gridRangeCopied: (cells) => `${cells} células copiadas`,
  gridRangeCopyFailed: "Falha ao copiar",
  gridRangePasted: (cells) => `${cells} células coladas`,
  gridRangePasteFailed: "Falha ao colar",
  gridRangeFilled: (cells) => `${cells} células preenchidas`,
  gridFillHandle: "Preencher a partir da seleção",
  selectionCount: "Contagem",
  selectionSum: "Soma",
  selectionAverage: "Média",
  selectionMin: "Mín",
  selectionMax: "Máx",
  editUndone: (cells) => `${cells} células restauradas`,
  editRedone: (cells) => `${cells} células refeitas`,
  editNothingToUndo: "Nada a desfazer",
  findInTable: "Localizar na tabela",
  findPlaceholder: "Localizar na tabela",
  findMatchCount: (current, total) =>
    total === 0 ? "Sem resultados" : `${current} de ${total}`,
  findPrevious: "Resultado anterior",
  findNext: "Próximo resultado",
  findClose: "Fechar a busca",
  sidePanel: "Configurações da tabela",
  contextMenu: "Ações da tabela",
  commandPalette: "Paleta de comandos",
  commandSearch: "Pesquisar comandos",
  commandEmpty: "Nenhum comando correspondente",
  print: "Imprimir",
  density: "Densidade",
  densityComfortable: "Confortável",
  densityCompact: "Compacta",
  enterFullscreen: "Tela cheia",
  exitFullscreen: "Sair da tela cheia",
  copyCells: "Copiar",
  cutCells: "Recortar",
  closePanel: "Fechar painel",
  pivotRows: "Linhas",
  pivotColumns: "Colunas",
  pivotMeasures: "Medidas",
  pivotAdd: "Adicionar campo",
  pivotRemove: "Remover campo",
  pivotMoveUp: "Mover para cima",
  pivotMoveDown: "Mover para baixo",
  pivotAggregation: "Agregação",
  pivotTotal: "Total",
  pivotGrandTotal: "Total geral",
  gridCellPosition: (row, total) => `linha ${row} de ${total}`,
  gridRangeSelection: ({ fromRow, toRow, fromColumn, toColumn, cells }) =>
    `Linhas ${fromRow} a ${toRow}, colunas ${fromColumn} a ${toColumn} selecionadas, ${cells} células`,
  noticeVirtualizePaged:
    "A virtualização está desligada — esta tabela paginada mostra uma página de cada vez.",
  noticePinNested:
    "A fixação de linhas está desligada com agrupamento ou árvore ativos.",
  noticeReorderNested:
    "A reordenação de linhas está desligada com agrupamento ou árvore ativos.",
  noticeGroupingUnavailable:
    "O agrupamento está desativado — esta fonte não consegue agrupar.",
  noticeExportAllPage:
    "Exportar tudo está desativado — esta fonte fornece uma página de cada vez.",
  noticeEditWithoutWriter:
    "A edição está desligada — nenhum handler de escrita está ligado.",
};
