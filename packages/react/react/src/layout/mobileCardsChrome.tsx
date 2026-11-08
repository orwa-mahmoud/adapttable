/**
 * The one mobile card list every React kit renders.
 *
 * The list, the virtual spacers and the summary card's place live here.
 * A kit fills the card slot with its own card element and the fields inside
 * it. The kit's public card list keeps the same props and forwards them here.
 */
import {
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

/**
 * The list elements a kit draws. Absent, the structure uses the native
 * element of that part.
 *
 * @public
 */
export interface MobileCardsHosts {
  /** The scroll region around the list. */
  readonly Section: ElementType;
  /** The card list. */
  readonly List: ElementType;
  /** One card, spacer or summary. */
  readonly Card: ElementType;
}

/**
 * Class names the structure itself writes.
 *
 * @public
 */
export interface MobileCardsChromeClassNames {
  /** The scroll region. */
  readonly scrollBox?: string;
  /** The card list. */
  readonly cards?: string;
  /** A virtual spacer. */
  readonly virtualSpacer?: string;
  /** One card. */
  readonly card?: string;
  /** The summary card. */
  readonly summaryCard?: string;
  /** One field row inside a card. */
  readonly cardRow?: string;
  /** A field's label. */
  readonly cardLabel?: string;
  /** A field's value. */
  readonly cardValue?: string;
}

/**
 * One card the structure places in the list.
 *
 * @public
 */
export interface MobileCardSlot {
  /** Stable key. */
  readonly key: string;
  /** Part name. Absent, the card has the card part. */
  readonly part?: string;
  /** Extra props for the card element, after the structure's own. */
  readonly props?: Record<string, unknown>;
  /** What the card shows. */
  readonly content: ReactNode;
}

/**
 * What a kit passes to {@link MobileCardsChrome}.
 *
 * @public
 */
export interface MobileCardsChromeProps {
  /** Accessible region props, role and label included. */
  readonly regionProps: Record<string, unknown>;
  /** Reading direction, when the table sets one. */
  readonly dir?: string;
  /** Ref for the scroll region. */
  readonly scrollRef?: Ref<HTMLElement>;
  /** Region style, height included. */
  readonly style?: CSSProperties;
  /** Classes for the parts the structure writes. */
  readonly classNames?: MobileCardsChromeClassNames;
  /** Props for the list element, after the structure's own. */
  readonly listProps?: Record<string, unknown>;
  /** List style. The default clears the list's margin and padding. */
  readonly listStyle?: CSSProperties;
  /** Kit elements. Absent parts use the native element. */
  readonly hosts?: Partial<MobileCardsHosts>;
  /** Pixel height standing in for cards above the window. */
  readonly paddingTop?: number;
  /** Pixel height standing in for cards below the window. */
  readonly paddingBottom?: number;
  /** Cards, extras and group headers, in reading order. */
  readonly cards: readonly MobileCardSlot[];
  /** Summary card contents. Absent, there is no summary card. */
  readonly summary?: ReactNode;
}

/**
 * Mobile card layout shared by every React kit.
 *
 * @public
 */
export function MobileCardsChrome(
  props: Readonly<MobileCardsChromeProps>
): ReactElement {
  const names = props.classNames ?? {};
  const Section = props.hosts?.Section ?? "section";
  const List = props.hosts?.List ?? "ul";
  const Card = props.hosts?.Card ?? "li";
  const top = props.paddingTop ?? 0;
  const bottom = props.paddingBottom ?? 0;
  const spacer = (height: number): ReactElement => (
    <Card
      data-adapttable-part="virtual-spacer"
      className={names.virtualSpacer}
      style={{ display: "block", height }}
    />
  );
  return (
    <Section
      {...props.regionProps}
      dir={props.dir}
      ref={props.scrollRef}
      className={names.scrollBox}
      style={props.style}
    >
      <List
        {...props.listProps}
        data-adapttable-part="cards"
        className={names.cards}
        style={{ margin: 0, padding: 0, ...props.listStyle }}
      >
        {top > 0 && spacer(top)}
        {props.cards.map((card) => (
          <Card
            key={card.key}
            data-adapttable-part={card.part ?? "card"}
            className={names.card}
            {...card.props}
          >
            {card.content}
          </Card>
        ))}
        {bottom > 0 && spacer(bottom)}
        {props.summary}
      </List>
    </Section>
  );
}
