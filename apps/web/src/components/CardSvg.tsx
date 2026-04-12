import { Card, Suit } from "@schafkopf/shared";

const suitColor: Record<Suit, string> = {
  eichel: "#5d3918",
  gras: "#517b34",
  herz: "#b33d2d",
  schelln: "#c38a22"
};

const ornamentColor = "#9a6a2f";

const pipLayouts: Record<string, Array<[number, number]>> = {
  "7": [
    [50, 28],
    [32, 44],
    [68, 44],
    [32, 60],
    [68, 60],
    [32, 76],
    [68, 76]
  ],
  "8": [
    [32, 26],
    [68, 26],
    [32, 42],
    [68, 42],
    [32, 58],
    [68, 58],
    [32, 74],
    [68, 74]
  ],
  "9": [
    [50, 22],
    [32, 36],
    [68, 36],
    [32, 50],
    [68, 50],
    [50, 64],
    [32, 78],
    [68, 78],
    [50, 92]
  ],
  "10": [
    [32, 20],
    [68, 20],
    [32, 34],
    [68, 34],
    [32, 48],
    [68, 48],
    [32, 62],
    [68, 62],
    [32, 76],
    [68, 76]
  ]
};

export function CardSvg({ card, className }: { card: Card; className?: string }) {
  const color = suitColor[card.suit];
  const token = card.id;

  return (
    <svg className={className} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${card.rank} ${card.suit}`}>
      <defs>
        <linearGradient id={`paper-${token}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor="#f0dfba" />
        </linearGradient>
        <linearGradient id={`frame-${token}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d2ad61" />
          <stop offset="100%" stopColor="#8a5d1f" />
        </linearGradient>
      </defs>

      <rect x="1.5" y="1.5" width="97" height="137" rx="14" fill={`url(#paper-${token})`} stroke={`url(#frame-${token})`} strokeWidth="1.5" />
      <rect x="5" y="5" width="90" height="130" rx="11" fill="none" stroke="rgba(120,84,27,0.28)" />
      <rect x="8" y="8" width="84" height="124" rx="9" fill="none" stroke="rgba(154,106,47,0.18)" strokeDasharray="1.8 3.4" />
      <path d="M24 12C36 9 64 9 76 12" stroke="rgba(160,122,52,0.35)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 128C36 131 64 131 76 128" stroke="rgba(160,122,52,0.35)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 18C17 12 24 10 31 10" stroke="rgba(154,106,47,0.24)" strokeWidth="1.2" fill="none" />
      <path d="M87 18C83 12 76 10 69 10" stroke="rgba(154,106,47,0.24)" strokeWidth="1.2" fill="none" />
      <path d="M13 122C17 128 24 130 31 130" stroke="rgba(154,106,47,0.24)" strokeWidth="1.2" fill="none" />
      <path d="M87 122C83 128 76 130 69 130" stroke="rgba(154,106,47,0.24)" strokeWidth="1.2" fill="none" />

      <Corner rank={card.rank} suit={card.suit} color={color} />
      <g transform="translate(100 140) rotate(180)">
        <Corner rank={card.rank} suit={card.suit} color={color} />
      </g>

      <g transform="translate(50 70)">
        <CenterArt card={card} color={color} token={token} />
      </g>
    </svg>
  );
}

function Corner({ rank, suit, color }: { rank: string; suit: Suit; color: string }) {
  return (
    <g transform="translate(10 12)">
      <text x="0" y="0" fill={color} fontSize="13" fontWeight="700" dominantBaseline="hanging">
        {rank}
      </text>
      <g transform="translate(1 17) scale(0.26)">
        <SuitMark suit={suit} color={color} />
      </g>
    </g>
  );
}

function CenterArt({ card, color, token }: { card: Card; color: string; token: string }) {
  if (card.rank === "A") {
    return (
      <g>
        <defs>
          <radialGradient id={`ace-medallion-${token}`} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#fff9eb" />
            <stop offset="100%" stopColor="#f0dfb9" />
          </radialGradient>
        </defs>
        <ellipse rx="25" ry="25" fill={`url(#ace-medallion-${token})`} stroke="rgba(162,122,45,0.46)" strokeWidth="1.8" />
        <ellipse rx="20.5" ry="20.5" fill="none" stroke="rgba(162,122,45,0.22)" strokeWidth="1.4" />
        <path d="M-16 -20C-8 -25 8 -25 16 -20" stroke={`rgba(154,106,47,0.55)`} strokeWidth="1.2" fill="none" />
        <path d="M-16 20C-8 25 8 25 16 20" stroke={`rgba(154,106,47,0.55)`} strokeWidth="1.2" fill="none" />
        <path d="M-23 -2C-27 -10 -26 -16 -20 -20" stroke={`rgba(154,106,47,0.42)`} strokeWidth="1.1" fill="none" />
        <path d="M23 -2C27 -10 26 -16 20 -20" stroke={`rgba(154,106,47,0.42)`} strokeWidth="1.1" fill="none" />
        <path d="M-23 2C-27 10 -26 16 -20 20" stroke={`rgba(154,106,47,0.42)`} strokeWidth="1.1" fill="none" />
        <path d="M23 2C27 10 26 16 20 20" stroke={`rgba(154,106,47,0.42)`} strokeWidth="1.1" fill="none" />
        <g transform="scale(0.68) translate(-32 -32)">
          <SuitMark suit={card.suit} color={color} />
        </g>
      </g>
    );
  }

  if (card.rank === "K" || card.rank === "O" || card.rank === "U") {
    return <FigureCard rank={card.rank} suit={card.suit} color={color} token={token} />;
  }

  const layout = pipLayouts[card.rank];
  return (
    <g>
      {layout.map(([x, y], index) => (
        <g key={`${card.id}-pip-${index}`} transform={`translate(${x - 57} ${y - 61}) scale(0.24)`}>
          <SuitMark suit={card.suit} color={color} />
        </g>
      ))}
    </g>
  );
}

function FigureCard({ rank, suit, color, token }: { rank: string; suit: Suit; color: string; token: string }) {
  const robeId = `robe-${rank}-${token}`;
  const accentId = `accent-${rank}-${token}`;
  const theme = getFigureTheme(rank, suit);

  return (
    <g>
      <defs>
        <linearGradient id={robeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.robeStops[0]} />
          <stop offset="100%" stopColor={theme.robeStops[1]} />
        </linearGradient>
        <linearGradient id={accentId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={theme.accentStops[0]} />
          <stop offset="100%" stopColor={theme.accentStops[1]} />
        </linearGradient>
      </defs>
      <FigureHalf rank={rank} suit={suit} color={color} robeId={robeId} accentId={accentId} theme={theme} />
      <g transform="rotate(180)">
        <FigureHalf rank={rank} suit={suit} color={color} robeId={robeId} accentId={accentId} theme={theme} />
      </g>
      <rect x="-4" y="-28" width="8" height="56" rx="3" fill="rgba(154,106,47,0.2)" />
      <g transform="translate(-25 0) scale(0.22)">
        <SuitMark suit={suit} color={color} />
      </g>
      <g transform="translate(11 0) scale(0.22)">
        <SuitMark suit={suit} color={color} />
      </g>
    </g>
  );
}

function FigureHalf({
  rank,
  suit,
  color,
  robeId,
  accentId,
  theme
}: {
  rank: string;
  suit: Suit;
  color: string;
  robeId: string;
  accentId: string;
  theme: FigureTheme;
}) {
  const skin = "#d8a06f";
  const { hair, headpiece, sash, emblemScale } = theme;

  return (
    <g transform="translate(0 -34)">
      <circle cx="0" cy="-5.5" r="7.2" fill={skin} />
      <path d="M-6 -10C-4 -15 4 -15 6 -10V-6H-6Z" fill={hair} />
      <FigureHeadpiece rank={rank} headpiece={headpiece} />
      <path d="M-10 3L-4 -1H4L10 3L13 17L0 25L-13 17Z" fill={`url(#${robeId})`} />
      <path d="M-6 2H6L8 16L0 21L-8 16Z" fill={`url(#${accentId})`} />
      <path d="M-4 4H4V18H-4Z" fill={sash} opacity="0.88" />
      <circle cx="0" cy="10" r="2" fill={ornamentColor} />
      <path d="M-10 3L-18 12L-14 18L-6 13Z" fill={`url(#${accentId})`} />
      <path d="M10 3L18 12L14 18L6 13Z" fill={`url(#${accentId})`} />
      <path d="M-4 26H4L6 34L0 38L-6 34Z" fill="#d8af43" stroke="#8d6421" strokeWidth="0.8" />
      <HeldAccessory rank={rank} suit={suit} color={color} />
      <g transform={`translate(${-4.4 * emblemScale} ${6.5 * emblemScale}) scale(${0.16 * emblemScale})`}>
        <SuitMark suit={suit} color={color} />
      </g>
    </g>
  );
}

type FigureTheme = {
  robeStops: [string, string];
  accentStops: [string, string];
  hair: string;
  headpiece: string;
  sash: string;
  emblemScale: number;
};

function getFigureTheme(rank: string, suit: Suit): FigureTheme {
  const bySuit: Record<Suit, Omit<FigureTheme, "emblemScale">> = {
    eichel: {
      robeStops: rank === "K" ? ["#a43d2a", "#672114"] : rank === "O" ? ["#86622c", "#5d4015"] : ["#4d6b32", "#2d431d"],
      accentStops: ["#d1b267", "#8f6721"],
      hair: "#5f3b1f",
      headpiece: "#d0a33e",
      sash: "#efe0bb"
    },
    gras: {
      robeStops: rank === "K" ? ["#44734b", "#27412d"] : rank === "O" ? ["#9d4631", "#672416"] : ["#3f648e", "#21395a"],
      accentStops: ["#dae7c3", "#8aa06b"],
      hair: "#73451f",
      headpiece: "#6b8d43",
      sash: "#f0e7c8"
    },
    herz: {
      robeStops: rank === "K" ? ["#b84734", "#762418"] : rank === "O" ? ["#c47b2f", "#8a4f18"] : ["#5f4f93", "#39295f"],
      accentStops: ["#f4d6b7", "#b35d3e"],
      hair: "#7b4c2f",
      headpiece: "#c43d30",
      sash: "#f6ead6"
    },
    schelln: {
      robeStops: rank === "K" ? ["#b38a2f", "#7a5818"] : rank === "O" ? ["#2f6894", "#1a3958"] : ["#9c4a30", "#662715"],
      accentStops: ["#f7e7a4", "#bb8d2f"],
      hair: "#624326",
      headpiece: "#d9b04c",
      sash: "#fbefc8"
    }
  };

  return {
    ...bySuit[suit],
    emblemScale: rank === "U" ? 1.06 : rank === "K" ? 0.94 : 1
  };
}

function FigureHeadpiece({ rank, headpiece }: { rank: string; headpiece: string }) {
  if (rank === "K") {
    return <path d="M-7 -16L-3 -22L0 -17L3 -22L7 -16V-12H-7Z" fill={headpiece} stroke="#8d6421" strokeWidth="0.8" />;
  }

  if (rank === "O") {
    return <path d="M-8 -13C-5 -17 5 -17 8 -13" stroke={headpiece} strokeWidth="2" strokeLinecap="round" />;
  }

  return <rect x="-6.5" y="-14" width="13" height="4" rx="2" fill={headpiece} />;
}

function HeldAccessory({ rank, suit, color }: { rank: string; suit: Suit; color: string }) {
  if (rank === "K") {
    if (suit === "eichel") {
      return (
        <>
          <path d="M18 -2L26 7L22 10L14 1Z" fill="#6f4b22" />
          <g transform="translate(12 -3) scale(0.16)">
            <SuitMark suit={suit} color={color} />
          </g>
        </>
      );
    }

    if (suit === "gras") {
      return (
        <>
          <path d="M15 1L24 -7L26 -3L18 5Z" fill="#7c5a2e" />
          <path d="M21 -9C24 -14 28 -15 31 -14C30 -9 27 -5 23 -2Z" fill="#668845" />
        </>
      );
    }

    if (suit === "herz") {
      return (
        <>
          <path d="M15 0L25 -5L26 -1L17 4Z" fill="#8d6421" />
          <g transform="translate(20 -8) scale(0.12)">
            <SuitMark suit={suit} color={color} />
          </g>
        </>
      );
    }

    return (
      <>
        <path d="M18 -2L26 7L22 10L14 1Z" fill="#8d6421" />
        <g transform="translate(18 -3) scale(0.13)">
          <SuitMark suit={suit} color={color} />
        </g>
      </>
    );
  }

  if (rank === "O") {
    if (suit === "eichel") {
      return (
        <>
          <path d="M14 3L24 13" stroke="#6f4b22" strokeWidth="2" strokeLinecap="round" />
          <g transform="translate(20 9) scale(0.12)">
            <SuitMark suit={suit} color={color} />
          </g>
        </>
      );
    }

    if (suit === "gras") {
      return (
        <>
          <path d="M14 3L24 13" stroke="#5d7740" strokeWidth="2" strokeLinecap="round" />
          <path d="M21 11C24 8 28 8 30 10C28 14 25 16 21 16Z" fill="#6b8d43" />
        </>
      );
    }

    if (suit === "herz") {
      return (
        <>
          <path d="M14 3L24 13" stroke="#8d6421" strokeWidth="2" strokeLinecap="round" />
          <g transform="translate(23 12) scale(0.11)">
            <SuitMark suit={suit} color={color} />
          </g>
        </>
      );
    }

    return (
      <>
        <path d="M14 3L24 13" stroke="#8d6421" strokeWidth="2" strokeLinecap="round" />
        <circle cx="25.5" cy="14.5" r="2.2" fill="#d8af43" stroke="#8d6421" strokeWidth="0.8" />
      </>
    );
  }

  if (suit === "eichel") {
    return (
      <>
        <path d="M15 4L25 17" stroke="#6f4b22" strokeWidth="2.2" strokeLinecap="round" />
        <g transform="translate(21 13) scale(0.12)">
          <SuitMark suit={suit} color={color} />
        </g>
      </>
    );
  }

  if (suit === "gras") {
    return (
      <>
        <path d="M15 4L25 17" stroke="#6b8d43" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M20 11C23 8 27 8 29 10C27 15 24 17 20 16Z" fill="#6b8d43" />
      </>
    );
  }

  if (suit === "herz") {
    return (
      <>
        <path d="M15 4L25 17" stroke="#8d6421" strokeWidth="2.2" strokeLinecap="round" />
        <g transform="translate(20 12) scale(0.11)">
          <SuitMark suit={suit} color={color} />
        </g>
      </>
    );
  }

  return (
    <>
      <path d="M15 4L25 17" stroke="#8d6421" strokeWidth="2.2" strokeLinecap="round" />
      <g transform="translate(20 11) scale(0.11)">
        <SuitMark suit={suit} color={color} />
      </g>
    </>
  );
}

function SuitMark({ suit, color }: { suit: Suit; color: string }) {
  switch (suit) {
    case "eichel":
      return (
        <g>
          <path d="M20 38C17 28 23 18 34 18C45 18 51 28 48 38C45 46 39 53 34 58C29 53 23 46 20 38Z" fill={color} />
          <path d="M24 22C27 15 34 12 42 14C47 15 51 18 54 22C49 23 45 24 41 27C37 23 31 21 24 22Z" fill="#6f4b22" />
          <path d="M31 58H37V69C37 73 35 76 34 78C33 76 31 73 31 69V58Z" fill="#7b5327" />
          <path d="M24 34C26 29 30 26 34 26C38 26 42 29 44 34" stroke="#b88d53" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case "gras":
      return (
        <g>
          <path d="M34 69C32 58 28 50 21 42C16 36 12 28 14 21C20 22 25 25 29 31C31 24 36 18 43 16C47 24 46 32 43 39C49 36 55 36 60 39C56 50 46 57 34 69Z" fill={color} />
          <path d="M34 69C36 59 40 50 47 42" stroke="#dbeac2" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 69C31 58 27 50 20 43" stroke="#dbeac2" strokeWidth="2" strokeLinecap="round" />
          <path d="M31 32C33 30 35 28 39 26" stroke="#dbeac2" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    case "herz":
      return (
        <g>
          <path d="M34 68C34 68 8 47 8 28C8 18 16 10 26 10C31 10 33 13 34 16C35 13 37 10 42 10C52 10 60 18 60 28C60 47 34 68 34 68Z" fill={color} />
          <path d="M22 23C24 20 28 18 31 19" stroke="#f4c5bf" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case "schelln":
      return (
        <g>
          <circle cx="34" cy="34" r="16" fill={color} />
          <path d="M24 28C26 22 31 18 34 18C37 18 42 22 44 28V42C44 48 39 52 34 52C29 52 24 48 24 42V28Z" fill="#f1d785" />
          <path d="M28 31H40" stroke="#83561c" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M29 38H39" stroke="#83561c" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="34" cy="45" r="2.8" fill="#83561c" />
        </g>
      );
  }
}
