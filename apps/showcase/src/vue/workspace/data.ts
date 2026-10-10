/** Stable, fictional orders keep every showcase interaction repeatable. */
export interface OrderLine {
  id: string;
  product: string;
  quantity: number;
  price: number;
}
export interface Order {
  id: string;
  customer: string;
  region: string;
  owner: string;
  status: "Review" | "Ready" | "Dispatched";
  amount: number;
  cost: number;
  due: string;
  history: readonly number[];
  lines: readonly OrderLine[];
}
const customers = [
  ["Atelier North", "Europe", "Maya Chen", "Review"],
  ["Common Ground", "Americas", "Noah Williams", "Ready"],
  ["Cedar House", "Middle East", "Leila Haddad", "Review"],
  ["Studio Field", "Europe", "Maya Chen", "Dispatched"],
  ["Kindred Goods", "Americas", "Noah Williams", "Ready"],
  ["Palm & Paper", "Middle East", "Leila Haddad", "Ready"],
  ["Westward", "Americas", "Noah Williams", "Dispatched"],
  ["House of Form", "Europe", "Maya Chen", "Review"],
  ["Dune Studio", "Middle East", "Leila Haddad", "Ready"],
  ["New Chapter", "Europe", "Maya Chen", "Ready"],
  ["Open House", "Americas", "Noah Williams", "Review"],
  ["Olive Works", "Middle East", "Leila Haddad", "Dispatched"],
] as const;
export function makeOrders(): readonly Order[] {
  return customers.map(([customer, region, owner, status], index) => {
    const quantity = 12 + (index % 4) * 6;
    const lines = [
      {
        id: `line-${index}-1`,
        product: "Everyday notebook · moss",
        quantity,
        price: 24,
      },
      {
        id: `line-${index}-2`,
        product: "Brass bookmark",
        quantity: 10,
        price: 12,
      },
      {
        id: `line-${index}-3`,
        product: "Studio pencil set",
        quantity: 8,
        price: 18,
      },
    ];
    const amount = lines.reduce(
      (sum, line) => sum + line.quantity * line.price,
      0
    );
    return {
      id: `ORD-${1042 + index}`,
      customer,
      region,
      owner,
      status,
      amount,
      cost: Math.round(amount * (0.54 + (index % 3) * 0.06)),
      due: `2026-10-${String(5 + (index % 5)).padStart(2, "0")}`,
      history: [
        amount * 0.62,
        amount * 0.71,
        amount * 0.67,
        amount * 0.86,
        amount * 0.92,
        amount,
      ],
      lines,
    };
  });
}
export const orderKey = (row: Order): string => row.id;
export const money = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
export const date = (value: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
export const statusLabel = (status: Order["status"], locale: string): string =>
  locale === "ar"
    ? { Review: "للمراجعة", Ready: "جاهز", Dispatched: "تم الشحن" }[status]
    : status;
export interface WorkspaceProps {
  locale: "en" | "ar";
  mobile?: boolean;
}

export function regionLabel(region: string, locale: string): string {
  if (locale !== "ar") return region;
  const names: Readonly<Record<string, string>> = {
    Europe: "أوروبا",
    Americas: "الأمريكتان",
    "Middle East": "الشرق الأوسط",
  };
  return names[region] ?? region;
}
