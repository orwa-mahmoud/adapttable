import type { TableLabels } from "@adapttable/core";

/**
 * Indonesian (`id`) label preset.
 *
 * @public
 */
/** How this language names what became of one action. */
const RECEIPT_STATUS: Readonly<Record<string, string>> = {
  executed: "selesai",
  staged: "disiapkan",
  partial: "selesai sebagian",
  rejected: "ditolak",
  "awaiting-approval": "menunggu persetujuan",
  cancelled: "dibatalkan",
  stale: "kedaluwarsa",
  failed: "gagal",
};

/** How this language names the capabilities a reader is asked to confirm. */
const CAPABILITY: Readonly<Record<string, string>> = {
  "edit.cells": "mengedit sel",
  "rows.add": "menambah baris",
  "rows.delete": "menghapus baris",
  "rows.reorder": "mengurutkan ulang baris",
  "export.run": "mengekspor",
};

export const id: Required<TableLabels> = {
  table: "Tabel data",
  search: "Cari",
  searchPlaceholder: "Cari…",
  noData: "Tidak ada data",
  noResults: "Tidak ada hasil yang cocok dengan filter",
  pageSelected: (count) => `Semua ${count} di halaman ini dipilih`,
  selectAllMatching: (total) => `Pilih semua ${total} yang cocok`,
  allMatchingSelected: (total) => `Semua ${total} yang cocok dipilih`,
  expandRow: "Bentangkan baris",
  collapseRow: "Lipatkan baris",
  operator: "Operator",
  value: "Nilai",
  from: "Dari",
  to: "Hingga",
  opEqual: "Sama dengan",
  opAtLeast: "Minimal",
  opAtMost: "Maksimal",
  opBetween: "Antara",
  opOn: "Pada",
  opOnOrAfter: "Pada tanggal atau setelahnya",
  opOnOrBefore: "Pada tanggal atau sebelumnya",
  opNotEqual: "Tidak sama dengan",
  opGreater: "Lebih besar dari",
  opLess: "Lebih kecil dari",
  opContains: "Mengandung",
  opNotContains: "Tidak mengandung",
  opStartsWith: "Dimulai dengan",
  opEndsWith: "Diakhiri dengan",
  opEmpty: "Kosong",
  opNotEmpty: "Tidak kosong",
  opIn: "Salah satu dari",
  opNotIn: "Bukan salah satu dari",
  opBefore: "Sebelum",
  opAfter: "Setelah",
  opRelative: "Relatif",
  relToday: "Hari ini",
  relYesterday: "Kemarin",
  relTomorrow: "Besok",
  relThisWeek: "Minggu ini",
  relThisMonth: "Bulan ini",
  relPreviousMonth: "Bulan sebelumnya",
  relLastN: "N hari terakhir",
  relNextN: "N hari berikutnya",
  filterAll: "Semua",
  boolAny: "Apa saja",
  boolTrue: "Benar",
  boolFalse: "Salah",
  savedViews: "Tampilan tersimpan",
  saveView: "Simpan tampilan",
  viewName: "Nama tampilan",
  deleteView: "Hapus tampilan",
  renameView: "Ganti nama tampilan",
  applyView: "Terapkan tampilan",
  moveViewUp: "Naikkan tampilan",
  moveViewDown: "Turunkan tampilan",
  setDefaultView: "Jadikan tampilan bawaan",
  defaultViewBadge: "Bawaan",
  readOnlyViewBadge: "Hanya baca",
  loading: "Memuat…",
  loadMore: "Muat lebih banyak",
  filters: "Filter",
  clearAll: "Hapus semua",
  removeFilter: (label) => `Hapus filter: ${label}`,
  filtersDone: "Selesai",
  filterTree: "Lanjutan",
  filterAddCondition: "Tambah kondisi",
  filterAddGroup: "Tambah grup",
  filterCombinatorAnd: "Dan",
  filterCombinatorOr: "Atau",
  filterRemoveCondition: "Hapus kondisi",
  filterRemoveGroup: "Hapus grup",
  filterField: "Bidang",
  checklistSearch: "Cari nilai",
  checklistClear: "Bersihkan",
  checklistNoValues: "Tidak ada nilai yang cocok",
  headerFilters: "Filter kolom",
  sortBy: "Urutkan berdasarkan",
  rowsPerPage: "Baris per halaman",
  actions: "Tindakan",
  selectAll: "Pilih semua",
  selectRow: "Pilih baris",
  selectColumn: "Pilih kolom",
  cancel: "Batal",
  retry: "Coba lagi",
  errorTitle: "Terjadi kesalahan",
  errorMessage: "Data ini gagal dimuat.",
  previousPage: "Halaman sebelumnya",
  nextPage: "Halaman berikutnya",
  goToPage: (page) => `Ke halaman ${page}`,
  selectedCount: (count) => (count === 1 ? "1 dipilih" : `${count} dipilih`),
  showing: ({ from, to, total }) => `Menampilkan ${from}–${to} dari ${total}`,
  pageOf: ({ page, total }) => `Halaman ${page} dari ${total}`,
  columns: "Kolom",
  pinStart: "Sematkan di awal",
  pinEnd: "Sematkan di akhir",
  unpin: "Lepaskan sematan",
  moveStart: "Pindah ke awal",
  moveEnd: "Pindah ke akhir",
  resetColumns: "Atur ulang kolom",
  autoSizeColumns: "Sesuaikan kolom dengan isi",
  autoSizeColumn: "Sesuaikan kolom dengan isi",
  resizeColumn: "Ubah ukuran kolom",
  showColumn: "Tampilkan kolom",
  hideColumn: "Sembunyikan kolom",
  searchColumns: "Cari kolom",
  showAllColumns: "Tampilkan semua",
  hideAllColumns: "Sembunyikan semua",
  unpinAllColumns: "Lepaskan semua sematan",
  resetColumn: "Atur ulang kolom",
  renameColumn: "Ganti nama kolom",
  columnName: "Nama kolom",
  saveColumnName: "Simpan nama",
  cancelColumnRename: "Batal",
  columnNameRequired: "Masukkan nama kolom.",
  columnRenamed: ({ previous, name }) =>
    `Kolom ${previous} diganti menjadi ${name}`,
  sortAscending: "Urutkan menaik",
  sortDescending: "Urutkan menurun",
  sortedBy: ({ column, ascending }) =>
    `Diurutkan berdasarkan ${column}, ${ascending ? "menaik" : "menurun"}`,
  sortingCleared: "Pengurutan dihapus",
  filterColumn: "Filter kolom",
  columnActions: "Tindakan kolom",
  exportCsv: "Ekspor CSV",
  exportFile: (format) => `Ekspor ${format.toUpperCase()}`,
  exportStarted: "Menyiapkan ekspor",
  exportProgress: (progress) => `Ekspor selesai ${progress}%`,
  exportDone: "Ekspor selesai",
  exportFailed: "Gagal mengekspor",
  exportCancelled: "Ekspor dibatalkan",
  exportDownload: "Unduh hasil ekspor",
  exportDismiss: "Tutup",
  editCell: "Edit sel",
  undoEdit: "Urungkan",
  redoEdit: "Ulangi",
  editRow: "Edit baris",
  saveRow: "Simpan baris",
  pendingRows: (count) =>
    count === 1
      ? "1 baris belum disimpan"
      : `${String(count)} baris belum disimpan`,
  saveAll: "Simpan semua",
  cancelAll: "Batal semua",
  approveProposal: "Setujui",
  rejectProposal: "Tolak",
  proposalValueUnavailable: "Tidak tersedia",
  proposalSummary: ({ changes, rows }) => {
    const left =
      changes === 1
        ? "1 perubahan diusulkan"
        : "{c} perubahan diusulkan".replace("{c}", String(changes));
    if (rows <= 1) return left;
    return `${left} ${"di {r} baris".replace("{r}", String(rows))}`;
  },
  reviewAllProposals: (count) =>
    "Tinjau {c} perubahan".replace("{c}", String(count)),
  backToConversation: "Kembali ke percakapan",
  approveAllProposals: "Setujui semua",
  approveRemainingProposals: "Setujui sisanya",
  rejectAllProposals: "Tolak semua",
  rejectRemainingProposals: "Tolak sisanya",
  alwaysAllowProposal: "Selalu izinkan",
  proposalTally: ({ pending, approved, rejected }) =>
    "{a} disetujui · {j} ditolak · {p} menunggu"
      .replace("{a}", String(approved))
      .replace("{j}", String(rejected))
      .replace("{p}", String(pending)),
  approvalWaitingElsewhere: "Ada perubahan yang menunggu keputusan Anda.",
  pendingProposals: (count) =>
    count === 1
      ? "1 perubahan diusulkan"
      : `${String(count)} perubahan diusulkan`,
  proposalChange: ({ row, column, before, after }) => {
    const field = column ? `${row} · ${column}` : row;
    if (before === undefined && after === undefined) return field;
    return `${field}: ${before ?? "—"} → ${after ?? "—"}`;
  },
  assistantTitle: "Asisten tabel",
  assistantOpen: "Tanyakan pada AI",
  assistantClose: "Tutup",
  assistantSettings: "Pengaturan asisten",
  assistantEmpty: "Apa yang ingin Anda lakukan dengan tabel ini?",
  assistantPlaceholder: "Tanyakan tentang tabel ini…",
  assistantSend: "Kirim",
  assistantStop: "Hentikan",
  assistantVoiceStart: "Dikte",
  assistantVoiceStop: "Hentikan dikte",
  assistantVoiceListening: "Mendengarkan",
  assistantVoiceMessage: "Pesan suara",
  assistantVoiceLanguage: "Bahasa dikte",
  assistantYou: "Anda",
  assistantSpeaker: "Asisten",
  assistantNewMessages: "Pesan baru",
  assistantUnavailable: "Asisten tidak terhubung.",
  assistantDetached: "Koneksi terputus. Pekerjaan mungkin masih berjalan.",
  assistantRejoin: "Lanjutkan",
  assistantProgress: (done, total) =>
    total === undefined
      ? `${String(done)} selesai`
      : `${String(done)} dari ${String(total)}`,
  assistantBackToTable: "Kembali ke tabel",
  assistantDetail: "Detail",
  assistantSaveInTable: "Simpan di tabel agar perubahan ini tetap tersimpan.",
  assistantUndo: "Urungkan",
  assistantUnresolved: (code) =>
    (
      ({
        "continuation-exhausted":
          "Itu membutuhkan lebih banyak langkah daripada yang diizinkan satu giliran. Minta sebagiannya.",
        "continuation-limit":
          "Itu membutuhkan lebih banyak langkah daripada yang diizinkan satu giliran. Minta sebagiannya.",
        "resume-limit":
          "Itu membutuhkan lebih banyak langkah daripada yang diizinkan satu giliran. Minta sebagiannya.",
        "discovery-exhausted": "Asisten tidak tahu cara melakukannya di sini.",
        "repeated-plan": "Asisten meminta hal yang sama dua kali dan berhenti.",
        "question-unanswered": "Itu butuh jawaban Anda untuk diselesaikan.",
        "approval-unavailable":
          "Itu butuh persetujuan dan tidak ada tempat memintanya.",
        "interrupt-unsupported":
          "Asisten meminta sesuatu yang tidak dapat dilakukan tabel ini.",
        "output-denied": "Sebagian dari itu tidak diizinkan dijalankan.",
        "not-run": "Itu tidak dijalankan.",
      }) as Record<string, string>
    )[code],
  assistantUndoBlocked: (code) =>
    (
      ({
        "table-moved": "Tabel telah berubah sejak saat itu.",
        "cannot-restore": "Sebagian dari ini tidak dapat dikembalikan.",
      }) as Record<string, string>
    )[code],
  assistantAnswerLabel: "Jawaban Anda",
  assistantAnswerPlaceholder: "Tulis jawaban",
  assistantAnswerSend: "Balas",
  assistantAlwaysAllowedTitle: "Tidak ditanyakan lagi untuk",
  assistantAlwaysAllowedRevoke: (capability) =>
    `Tanyakan lagi untuk ${CAPABILITY[capability] ?? capability}`,
  assistantCapabilityName: (capability) => CAPABILITY[capability],
  assistantActions: (count) =>
    count === 1 ? "1 tindakan" : `${String(count)} tindakan`,
  assistantActionsTitle: "Yang berubah di giliran ini",
  assistantUndoAll: "Urungkan semua",
  assistantExamples: "Pintasan",
  assistantReceiptChange: ({ before, after }) =>
    `Diubah dari ${before} menjadi ${after}`,
  assistantReceiptProposed: ({ before, after }) =>
    `Diusulkan: dari ${before} menjadi ${after}`,
  assistantReceiptAction: ({ kind, status, cleared }) => {
    if (!kind) return undefined;
    const scope = cleared ? `${kind}-cleared` : kind;
    return (
      {
        "filter/executed": "Filter diterapkan",
        "filter/staged": "Filter disiapkan",
        "sort/executed": "Diurutkan",
        "group/executed": "Dikelompokkan",
        "pin/executed": "Kolom disematkan",
        "edit/executed": "Disimpan",
        "edit/staged": "Edit disiapkan, belum disimpan",
        "edit/awaiting-approval": "Edit menunggu persetujuan",
        "edit/partial": "Sebagian edit tersimpan, sebagian ditolak",
        "edit/rejected": "Edit ditolak",
        "filter-cleared/executed": "Filter dihapus",
        "sort-cleared/executed": "Pengurutan dihapus",
        "search/executed": "Pencarian diterapkan",
        "search-cleared/executed": "Pencarian dihapus",
        "group-cleared/executed": "Pengelompokan dihapus",
        "pin-cleared/executed": "Sematan kolom dilepas",
        "pinRow/executed": "Baris disematkan",
        "pinRow-cleared/executed": "Sematan baris dilepas",
        "page/executed": "Halaman diganti",
        "aggregate/executed": "Total diubah",
        "select/executed": "Pilihan diubah",
        "read/executed": "Tabel diperiksa",
        "operation/executed": "Dijalankan",
        "operation/awaiting-approval": "Menunggu Anda",
        "operation/rejected": "Ditolak",
        "export/executed": "Diekspor",
        "add/executed": "Baris ditambahkan",
        "add/awaiting-approval": "Baris baru menunggu persetujuan",
        "add/rejected": "Baris baru ditolak",
        "delete/executed": "Baris dihapus",
        "delete/awaiting-approval": "Penghapusan menunggu persetujuan",
        "delete/partial": "Sebagian baris dihapus, sebagian dipertahankan",
        "delete/rejected": "Penghapusan ditolak",
        "reorder/executed": "Baris dipindahkan",
      } as Record<string, string>
    )[`${scope}/${status}`];
  },
  assistantReceiptTerms: ({ kind, terms, direction }) => {
    const parts = (terms ?? [])
      .map((term) => {
        if (!term.column) return term.value;
        if (!term.value) return term.column;
        return kind === "edit"
          ? `${term.column} diatur ke ${term.value}`
          : `${term.column}: ${term.value}`;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length === 0) return undefined;
    const joined = parts.join(", ");
    if (!direction) return joined;
    return `${joined}, ${direction === "desc" ? "menurun" : "menaik"}`;
  },
  assistantConnection: (status) =>
    ({
      idle: "Siaga",
      connecting: "Menyambung…",
      ready: "Siap",
      sending: "Memproses…",
      "awaiting-approval": "Menunggu Anda",
      "awaiting-user": "Menunggu Anda",
      error: "Kesalahan",
      disconnected: "Tidak terhubung",
    })[status] ?? "Siap",
  assistantReceipt: ({ capability, status }) => {
    const what = RECEIPT_STATUS[status] ?? status;
    return capability ? `${capability}: ${what}` : what;
  },
  assistantReceiptStatus: (status) => RECEIPT_STATUS[status] ?? status,
  addRow: "Tambah baris",
  duplicateRow: "Duplikat baris",
  deleteRow: "Hapus baris",
  deleteRowConfirm: "Hapus baris ini? Tindakan ini tidak dapat dibatalkan.",
  rowActionsMenu: "Tindakan baris",
  editConflict: "Baris ini berubah saat Anda mengeditnya",
  keepMine: "Pertahankan versi saya",
  takeTheirs: "Gunakan yang baru",
  theirsValue: (value) => `Yang baru: ${value}`,
  reorderRow: "Urutkan ulang baris",
  moveRowUp: "Naikkan baris",
  moveRowDown: "Turunkan baris",
  rowLifted: (position) => `Baris ${String(position)} diangkat`,
  rowMoved: (from, to) =>
    `Baris dipindahkan dari ${String(from)} ke ${String(to)}`,
  rowReorderCancelled: "Pengurutan ulang dibatalkan",
  rowMoveOptions: "Opsi pemindahan baris",
  moveToGroup: "Pindahkan ke grup…",
  moveUnder: "Pindahkan di bawah…",
  moveToTopLevel: "Pindahkan ke tingkat atas",
  confirmRowMoveTitle: "Konfirmasi pemindahan baris",
  confirmRowMoveDescription: (row, from, to) =>
    `Pindahkan ${row} dari ${from} ke ${to}?`,
  confirmRowMove: "Pindahkan",
  rowMovedToGroup: (group) => `Baris dipindahkan ke ${group}`,
  rowMovedUnder: (parent) => `Baris dipindahkan di bawah ${parent}`,
  moveRejectedPolicyNever: "Pemindahan baris lintas batas dinonaktifkan",
  moveRejectedSorted: "Hapus pengurutan sebelum mengubah urutan baris",
  moveRejectedCycle:
    "Baris tidak dapat dipindahkan ke dalam dirinya sendiri atau turunannya",
  moveUnavailable: "Pemindahan baris ini tidak tersedia",
  rootLevel: "Tingkat atas",
  pinToTop: "Sematkan ke atas",
  pinToBottom: "Sematkan ke bawah",
  unpinRow: "Lepaskan sematan baris",
  pinnedSummaryRow: "Baris ringkasan",
  pinnedSummaryTop: "Baris ringkasan disematkan di atas",
  pinnedSummaryBottom: "Baris ringkasan disematkan di bawah",
  rowSeparator: "Pemisah",
  expandColumnGroup: "Bentangkan grup kolom",
  collapseColumnGroup: "Lipatkan grup kolom",
  moreGroups: (remaining) => `Tampilkan ${remaining} grup lainnya`,
  moreRowsInGroup: (remaining) => `Tampilkan ${remaining} lagi di grup ini`,
  groupTotal: (label) => `Total ${label}`,
  expandGroup: "Bentangkan grup",
  collapseGroup: "Lipatkan grup",
  groupCount: (count) => `(${count})`,
  groupingPanel: "Pengelompokan baris",
  groupingDropColumns: "Seret kolom ke sini untuk mengelompokkan",
  addGroupingColumn: "Tambah kolom pengelompokan",
  groupByColumn: (label) => `Kelompokkan berdasarkan ${label}`,
  ungroupColumn: (label) => `Lepaskan pengelompokan ${label}`,
  removeGroupingColumn: (label) => `Hapus ${label} dari pengelompokan`,
  moveGroupingColumn: (label) => `Pindahkan pengelompokan ${label}`,
  groupingDropToRemove: "Letakkan di sini untuk menghapus pengelompokan",
  groupingAggregateColumn: "Kolom agregasi",
  groupingAggregation: "Agregasi grup",
  groupingAggregationDefault: "Bawaan",
  groupingAggregationNone: "Tidak ada",
  groupingAggregations: "Agregasi",
  groupingAddAggregation: "Tambah kolom agregasi",
  groupingRestoreAggregations: "Pulihkan bawaan",
  groupingRemoveAggregation: (column) => `Hapus agregasi ${column}`,
  groupingAggregationFor: (column) => `Agregasi ${column}`,
  groupingAggregationReadOnly: "Ditetapkan oleh aplikasi",
  groupingAggregationCustom: "Kustom",
  groupingAggregateRemoved: (column) => `Agregasi ${column} dihapus`,
  groupingAggregatesRestored: "Agregasi dipulihkan ke bawaan",
  groupingAverage: "Rata-rata",
  groupingAdded: (label) => `${label} ditambahkan ke pengelompokan`,
  groupingRemoved: (label) => `${label} dihapus dari pengelompokan`,
  groupingMoved: (label, position) =>
    `${label} dipindahkan ke posisi pengelompokan ${position}`,
  groupingAggregateChanged: (label, aggregation) =>
    `Agregasi ${label} diubah menjadi ${aggregation}`,
  gridRangeCopied: (cells) => `${cells} sel disalin`,
  gridRangeCopyFailed: "Gagal menyalin",
  gridRangePasted: (cells) => `${cells} sel ditempel`,
  gridRangePasteFailed: "Gagal menempel",
  gridRangeFilled: (cells) => `${cells} sel diisi`,
  gridRangeFillFailed: "Gagal mengisi",
  gridFillHandle: "Isi dari pilihan",
  selectionCount: "Hitung",
  selectionSum: "Jumlah",
  selectionAverage: "Rata-rata",
  selectionMin: "Min",
  selectionMax: "Maks",
  editUndone: (cells) => `${cells} sel dipulihkan`,
  editRedone: (cells) => `${cells} sel diulangi`,
  editNothingToUndo: "Tidak ada yang bisa diurungkan",
  findInTable: "Cari di tabel",
  findPlaceholder: "Cari di tabel",
  findMatchCount: (current, total) =>
    total === 0 ? "Tidak ada hasil" : `${current} dari ${total}`,
  findPrevious: "Hasil sebelumnya",
  findNext: "Hasil berikutnya",
  findClose: "Tutup pencarian",
  sidePanel: "Pengaturan tabel",
  contextMenu: "Tindakan tabel",
  commandPalette: "Palet perintah",
  commandSearch: "Cari perintah",
  commandEmpty: "Tidak ada perintah yang cocok",
  print: "Cetak",
  density: "Kepadatan",
  densityComfortable: "Nyaman",
  densityCompact: "Padat",
  enterFullscreen: "Layar penuh",
  exitFullscreen: "Keluar dari layar penuh",
  copyCells: "Salin",
  cutCells: "Potong",
  closePanel: "Tutup panel",
  pivotRows: "Baris",
  pivotColumns: "Kolom",
  pivotMeasures: "Ukuran",
  pivotAdd: "Tambah bidang",
  pivotRemove: "Hapus bidang",
  pivotMoveUp: "Naik",
  pivotMoveDown: "Turun",
  pivotAggregation: "Agregasi",
  pivotTotal: "Total",
  pivotGrandTotal: "Total keseluruhan",
  gridCellPosition: (row, total) => `baris ${row} dari ${total}`,
  gridRangeSelection: ({ fromRow, toRow, fromColumn, toColumn, cells }) =>
    `Baris ${fromRow} sampai ${toRow}, kolom ${fromColumn} sampai ${toColumn} dipilih, ${cells} sel`,
  noticeVirtualizePaged:
    "Virtualisasi dinonaktifkan: tabel berhalaman ini menampilkan satu halaman setiap saat.",
  noticePinNested:
    "Sematan baris dinonaktifkan saat ada pengelompokan atau pohon.",
  noticeReorderNested:
    "Pengurutan ulang baris dinonaktifkan saat ada pengelompokan atau pohon.",
  noticeGroupingUnavailable:
    "Pengelompokan dinonaktifkan: sumber data ini tidak dapat mengelompokkan.",
  noticeExportAllPage:
    "Ekspor semua dinonaktifkan: sumber ini menyediakan satu halaman setiap saat.",
  noticeEditWithoutWriter: "Editan dinonaktifkan: tidak ada penangan tulis.",
};
